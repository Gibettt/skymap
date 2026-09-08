import { randomUUID } from 'node:crypto';

const UUID_TABLES = new Set([
  'access_roles',
  'bookings',
  'feedback_submissions',
  'feedback_tokens',
  'invoices',
  'notifications',
  'package_inclusions',
  'packages',
  'payout_requests',
  'resorts',
  'sky_events',
  'users',
]);

function findMatchingParenthesis(text, openingIndex) {
  let depth = 0;
  let quote = null;

  for (let index = openingIndex; index < text.length; index += 1) {
    const character = text[index];
    const previous = text[index - 1];

    if (quote) {
      if (character === quote && previous !== '\\') quote = null;
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }

    if (character === '(') depth += 1;
    if (character === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function splitSqlList(value) {
  const parts = [];
  let start = 0;
  let depth = 0;
  let quote = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const previous = value[index - 1];

    if (quote) {
      if (character === quote && previous !== '\\') quote = null;
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }

    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(value.slice(start).trim());
  return parts;
}

function readInsertShape(sql) {
  const tableMatch = sql.match(/^\s*INSERT\s+INTO\s+`?([a-z_][a-z0-9_]*)`?/i);
  if (!tableMatch) return null;

  const table = tableMatch[1].toLowerCase();
  const columnsOpening = sql.indexOf('(', tableMatch.index + tableMatch[0].length);
  if (columnsOpening < 0) return { table, columns: [], values: [], columnsOpening: -1, columnsClosing: -1, valuesOpening: -1, valuesClosing: -1 };
  const columnsClosing = findMatchingParenthesis(sql, columnsOpening);
  if (columnsClosing < 0) return null;

  const valuesMatch = /\bVALUES\s*\(/ig;
  valuesMatch.lastIndex = columnsClosing;
  const match = valuesMatch.exec(sql);
  const valuesOpening = match ? sql.indexOf('(', match.index) : -1;
  const valuesClosing = valuesOpening >= 0 ? findMatchingParenthesis(sql, valuesOpening) : -1;

  return {
    table,
    columns: splitSqlList(sql.slice(columnsOpening + 1, columnsClosing)).map((column) => column.replace(/[`"\s]/g, '')),
    values: valuesOpening >= 0 && valuesClosing >= 0
      ? splitSqlList(sql.slice(valuesOpening + 1, valuesClosing))
      : [],
    columnsOpening,
    columnsClosing,
    valuesOpening,
    valuesClosing,
  };
}

function valueFromToken(token, params) {
  const placeholder = token?.match(/^\$(\d+)(?:::[a-z_]+(?:\[\])?)?$/i);
  if (placeholder) return params[Number(placeholder[1]) - 1];
  if (/^true$/i.test(token || '')) return true;
  if (/^false$/i.test(token || '')) return false;
  if (/^null$/i.test(token || '')) return null;
  const stringLiteral = token?.match(/^'(.*)'$/s);
  return stringLiteral ? stringLiteral[1].replace(/''/g, "'") : undefined;
}

function addUuidToInsert(sql, params, shape) {
  if (!shape || !UUID_TABLES.has(shape.table) || shape.columns.includes('id') || shape.valuesClosing < 0) {
    return { sql, params, insertedId: null, shape };
  }

  const insertedId = randomUUID();
  const placeholder = `$${params.length + 1}`;
  let nextSql = `${sql.slice(0, shape.columnsClosing)}, id${sql.slice(shape.columnsClosing)}`;
  const valuesClosing = shape.valuesClosing + ', id'.length;
  nextSql = `${nextSql.slice(0, valuesClosing)}, ${placeholder}${nextSql.slice(valuesClosing)}`;

  return {
    sql: nextSql,
    params: [...params, insertedId],
    insertedId,
    shape: readInsertShape(nextSql),
  };
}

function rewriteOnConflict(sql) {
  return sql.replace(
    /\bON\s+CONFLICT\s*\([^)]+\)\s*DO\s+UPDATE\s+SET\s+([\s\S]+)$/i,
    (_match, assignments) => {
      const withoutCondition = assignments.replace(/\s+WHERE\s+[\s\S]*$/i, '').trim();
      return `ON DUPLICATE KEY UPDATE ${withoutCondition.replace(/\bEXCLUDED\.([a-z_][a-z0-9_]*)/gi, 'VALUES($1)')}`;
    },
  );
}

function rewriteAggregateFilters(sql) {
  const aggregatePattern = /\b(COUNT|SUM|AVG|JSON_AGG)\s*\(/ig;
  const replacements = [];
  for (let match = aggregatePattern.exec(sql); match; match = aggregatePattern.exec(sql)) {
    const aggregate = match[1].toUpperCase();
    const aggregateOpening = sql.indexOf('(', match.index);
    const aggregateClosing = findMatchingParenthesis(sql, aggregateOpening);
    if (aggregateClosing < 0) continue;

    const suffix = sql.slice(aggregateClosing + 1);
    const filterMatch = suffix.match(/^\s*FILTER\s*\(/i);
    if (!filterMatch) continue;
    const filterOpening = aggregateClosing + 1 + filterMatch[0].lastIndexOf('(');
    const filterClosing = findMatchingParenthesis(sql, filterOpening);
    if (filterClosing < 0) continue;

    const expression = sql.slice(aggregateOpening + 1, aggregateClosing).trim();
    const condition = sql.slice(filterOpening + 1, filterClosing).replace(/^\s*WHERE\s+/i, '').trim();
    let replacement;

    if (aggregate === 'COUNT' && /^DISTINCT\s+/i.test(expression)) {
      replacement = `COUNT(DISTINCT CASE WHEN ${condition} THEN ${expression.replace(/^DISTINCT\s+/i, '')} END)`;
    } else if (aggregate === 'COUNT') {
      const notNull = expression === '*' ? '' : ` AND ${expression} IS NOT NULL`;
      replacement = `COALESCE(SUM(CASE WHEN ${condition}${notNull} THEN 1 ELSE 0 END), 0)`;
    } else if (aggregate === 'SUM') {
      replacement = `SUM(CASE WHEN ${condition} THEN ${expression} ELSE 0 END)`;
    } else if (aggregate === 'AVG') {
      replacement = `AVG(CASE WHEN ${condition} THEN ${expression} END)`;
    } else {
      replacement = `JSON_ARRAYAGG(CASE WHEN ${condition} THEN ${expression} END)`;
    }

    replacements.push({ start: match.index, end: filterClosing + 1, replacement });
    aggregatePattern.lastIndex = filterClosing + 1;
  }

  for (const item of replacements.reverse()) {
    sql = `${sql.slice(0, item.start)}${item.replacement}${sql.slice(item.end)}`;
  }
  return sql;
}

function rewriteSql(sql, params) {
  let rewritten = sql.trim().replace(/;\s*$/, '');

  rewritten = rewritten.replace(
    /WITH\s+days\s+AS\s*\(\s*SELECT\s+generate_series\(\s*current_date\s*-\s*interval\s+'(\d+)\s+days?',\s*current_date,\s*interval\s+'1\s+day'\s*\)::date\s+AS\s+([a-z_][a-z0-9_]*)\s*\)/gi,
    (_match, numberOfDays, column) => `WITH RECURSIVE days AS (
      SELECT CURRENT_DATE - INTERVAL ${numberOfDays} DAY AS ${column}
      UNION ALL SELECT ${column} + INTERVAL 1 DAY FROM days WHERE ${column} < CURRENT_DATE
    )`,
  );
  rewritten = rewriteAggregateFilters(rewritten);

  rewritten = rewritten
    .replace(/\(([a-z_][a-z0-9_.]*)\s+AT\s+TIME\s+ZONE\s+(\$\d+)\)::date/gi, "DATE(CONVERT_TZ($1, '+00:00', $2))")
    .replace(/\((\$\d+)::timestamptz\s+AT\s+TIME\s+ZONE\s+(COALESCE\([^)]+\))\)::date/gi, "DATE(CONVERT_TZ($1, '+00:00', $2))")
    .replace(/\bILIKE\b/gi, 'LIKE')
    .replace(/\bNOT\s*\(\s*([a-z_][a-z0-9_.]*)\s*=\s*ANY\s*\((\$\d+)(?:::[a-z_]+(?:\[\])?)?\)\s*\)/gi, '$1 NOT IN ($2)')
    .replace(/([a-z_][a-z0-9_.]*)\s*=\s*ANY\s*\((\$\d+)(?:::[a-z_]+(?:\[\])?)?\)/gi, '$1 IN ($2)')
    .replace(/\bnow\(\)\s*-\s*interval\s+'(\d+)\s+(minute|hour|day|month|year)s?'/gi, 'NOW() - INTERVAL $1 $2')
    .replace(/\bcurrent_date\s*-\s*interval\s+'(\d+)\s+(day|month|year)s?'/gi, 'CURRENT_DATE - INTERVAL $1 $2')
    .replace(/\bcurrent_date\s*\+\s*interval\s+'(\d+)\s+(day|month|year)s?'/gi, 'CURRENT_DATE + INTERVAL $1 $2')
    .replace(/\+\s*INTERVAL\s+'(\d+)\s+(minute|hour|day|month|year)s?'/gi, '+ INTERVAL $1 $2')
    .replace(/-\s*INTERVAL\s+'(\d+)\s+(minute|hour|day|month|year)s?'/gi, '- INTERVAL $1 $2')
    .replace(/date_trunc\(\s*'month'\s*,\s*current_date\s*\)/gi, "CAST(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AS DATE)")
    .replace(/to_char\(([^,()]+),\s*'YYYY-MM-DD'\)/gi, "DATE_FORMAT($1, '%Y-%m-%d')")
    .replace(/to_char\(([^,()]+),\s*'DD Mon YYYY'\)/gi, "DATE_FORMAT($1, '%d %b %Y')")
    .replace(/to_char\(([^,()]+),\s*'DD Mon'\)/gi, "DATE_FORMAT($1, '%d %b')")
    .replace(/to_char\(([^,()]+),\s*'FM999999990\.00'\)/gi, 'FORMAT($1, 2)')
    .replace(/json_agg\(([^()]+?)\s+ORDER\s+BY\s+[^)]+\)/gi, 'JSON_ARRAYAGG($1)')
    .replace(/\bjson_agg\s*\(/gi, 'JSON_ARRAYAGG(')
    .replace(/\bTIME\s+'([^']+)'/gi, "CAST('$1' AS TIME)")
    .replace(/'-infinity'/gi, "'1000-01-01 00:00:00'")
    .replace(/(\$\d+)::date\b/gi, 'DATE($1)')
    .replace(/\b([a-z_][a-z0-9_.]*)::date\b/gi, 'DATE($1)')
    .replace(/\b([a-z_][a-z0-9_.]*)::text\b/gi, 'CAST($1 AS CHAR)')
    .replace(/::(?:uuid|jsonb?|inet|boolean|timestamptz|timestamp|numeric|int|integer|user_role|user_status|booking_status|payout_status|package_type|experience_type|feedback_status)(?:\[\])?/gi, '')
    .replace(/\s+NULLS\s+(?:FIRST|LAST)\b/gi, '');

  rewritten = rewriteOnConflict(rewritten);

  const orderedParams = [];
  rewritten = rewritten.replace(/\$(\d+)/g, (_match, index) => {
    orderedParams.push(params[Number(index) - 1]);
    return '?';
  });

  return { sql: rewritten, params: orderedParams };
}

function normalizeError(error) {
  if (error?.code === 'ER_DUP_ENTRY') error.code = '23505';
  if (error?.code === 'ER_NO_REFERENCED_ROW_2' || error?.code === 'ER_ROW_IS_REFERENCED_2') error.code = '23503';
  if (error?.code === 'ER_CHECK_CONSTRAINT_VIOLATED') error.code = '23514';
  return error;
}

async function executeRaw(executor, sql, params) {
  const rewritten = rewriteSql(sql, params);
  try {
    const [result, fields] = await executor.query(rewritten.sql, rewritten.params);
    if (Array.isArray(result)) return { rows: result, rowCount: result.length, fields };
    return { rows: [], rowCount: result.affectedRows || 0, fields, insertId: result.insertId || null };
  } catch (error) {
    throw normalizeError(error);
  }
}

function returningClause(sql) {
  const match = sql.match(/\s+RETURNING\s+([\s\S]+?)\s*;?\s*$/i);
  if (!match) return null;
  return {
    fields: match[1].trim(),
    sql: sql.slice(0, match.index).trim(),
  };
}

function conflictColumns(sql) {
  const match = sql.match(/\bON\s+CONFLICT\s*\(([^)]+)\)/i);
  return match ? splitSqlList(match[1]).map((column) => column.replace(/[`"\s]/g, '')) : [];
}

function insertLookup(shape, params, insertedId, conflictKeys) {
  const values = new Map();
  shape?.columns.forEach((column, index) => {
    values.set(column, valueFromToken(shape.values[index], params));
  });

  if (conflictKeys.length && conflictKeys.every((column) => values.has(column))) {
    return conflictKeys.map((column) => [column, values.get(column)]);
  }
  if (insertedId) return [['id', insertedId]];
  if (values.has('id')) return [['id', values.get('id')]];
  return [];
}

async function selectReturnedRows(executor, table, fields, lookup) {
  if (!table || !lookup.length) return [];
  const conditions = lookup.map(([column], index) => `\`${column}\` = $${index + 1}`).join(' AND ');
  const values = lookup.map(([, value]) => value);
  const result = await executeRaw(executor, `SELECT ${fields} FROM \`${table}\` WHERE ${conditions}`, values);
  return result.rows;
}

function findTopLevelKeyword(sql, keyword) {
  const normalizedKeyword = keyword.toUpperCase();
  let depth = 0;
  let quote = null;

  for (let index = 0; index <= sql.length - keyword.length; index += 1) {
    const character = sql[index];
    const previous = sql[index - 1];

    if (quote) {
      if (character === quote && previous !== '\\') quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') {
      depth += 1;
      continue;
    }
    if (character === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 0 || sql.slice(index, index + keyword.length).toUpperCase() !== normalizedKeyword) continue;

    const before = sql[index - 1];
    const after = sql[index + keyword.length];
    if ((!before || /\s/.test(before)) && (!after || /\s/.test(after))) return index;
  }

  return -1;
}

function mutationTargetSelect(sql, table, fields) {
  const whereIndex = findTopLevelKeyword(sql, 'WHERE');
  const predicate = whereIndex < 0 ? '' : ` ${sql.slice(whereIndex).trim()}`;
  return `SELECT ${fields} FROM \`${table}\`${predicate} FOR UPDATE`;
}

async function selectReturnedRowsByIds(executor, table, fields, ids) {
  if (!table || !ids.length) return [];
  const placeholders = ids.map((_id, index) => `$${index + 1}`).join(', ');
  const result = await executeRaw(executor, `SELECT ${fields} FROM \`${table}\` WHERE id IN (${placeholders})`, ids);
  return result.rows;
}

export async function mysqlQuery(executor, text, params = []) {
  const returning = returningClause(text);
  if (!returning) return executeRaw(executor, text, params);

  const statement = returning.sql.match(/^\s*(INSERT|UPDATE|DELETE)\b/i)?.[1]?.toUpperCase();
  const table = returning.sql.match(/^\s*(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+`?([a-z_][a-z0-9_]*)`?/i)?.[1]?.toLowerCase();

  if (statement === 'INSERT') {
    const originalConflictKeys = conflictColumns(returning.sql);
    const augmented = addUuidToInsert(returning.sql, params, readInsertShape(returning.sql));
    const mutation = await executeRaw(executor, augmented.sql, augmented.params);
    const lookup = insertLookup(augmented.shape, augmented.params, augmented.insertedId || mutation.insertId, originalConflictKeys);
    const rows = await selectReturnedRows(executor, table, returning.fields, lookup);
    return { rows, rowCount: mutation.rowCount };
  }

  if (statement === 'DELETE') {
    const targets = await executeRaw(executor, mutationTargetSelect(returning.sql, table, returning.fields), params);
    const mutation = await executeRaw(executor, returning.sql, params);
    const rows = mutation.rowCount > 0 ? targets.rows.slice(0, mutation.rowCount) : [];
    return { rows, rowCount: mutation.rowCount };
  }

  const targets = await executeRaw(executor, mutationTargetSelect(returning.sql, table, 'id'), params);
  const mutation = await executeRaw(executor, returning.sql, params);
  const rows = await selectReturnedRowsByIds(executor, table, returning.fields, targets.rows.map((row) => row.id));
  return { rows, rowCount: mutation.rowCount };
}
