import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET() {
  try {
    await requireUser(['admin', 'internal', 'external']);
    const { rows } = await query(
      `SELECT id, name, slug, is_active FROM package_types WHERE is_active = true ORDER BY name ASC`
    );
    return Response.json({
      packageTypes: rows.length > 0 ? rows : [
        { id: 'regular', name: 'Regular', slug: 'regular', is_active: true },
        { id: 'private', name: 'Private', slug: 'private', is_active: true },
        { id: 'kids', name: 'Kids', slug: 'kids', is_active: true },
      ],
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin', 'internal']);
    if (user.access_role_level === 'read_only') {
      return Response.json({ error: 'This role has read-only access' }, { status: 403 });
    }
    const body = await parseJsonBody(request);
    const name = String(body.name || '').trim();

    if (!name || name.length > 80) {
      return Response.json(
        { error: 'Nama package type wajib diisi (maksimal 80 karakter).' },
        { status: 400 }
      );
    }

    const slug = body.slug ? slugify(body.slug) : slugify(name);
    if (!slug) {
      return Response.json(
        { error: 'Slug package type tidak valid.' },
        { status: 400 }
      );
    }

    const existing = await query(
      `SELECT id, name, slug, is_active FROM package_types WHERE slug = $1 OR LOWER(name) = LOWER($2) LIMIT 1`,
      [slug, name]
    );

    if (existing.rows.length > 0) {
      return Response.json(
        { packageType: existing.rows[0], message: 'Package type sudah ada.' },
        { status: 200 }
      );
    }

    const newType = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO package_types (name, slug, is_active) VALUES ($1, $2, true) RETURNING id, name, slug, is_active`,
        [name, slug]
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'package_type.create',
        entityType: 'package_type',
        entityId: rows[0].id,
        afterData: rows[0],
        request,
      });
      return rows[0];
    });

    return Response.json({ packageType: newType }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
