import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission } from "@ephemeris/auth";
import { transaction } from "@ephemeris/db";
import { uuidSchema } from "@ephemeris/db/validators/common";

export async function GET(request) {
  try {
    const user = await requirePermission("staff.notifications", ["internal", "external"]);
    const searchParams = new URL(request.url).searchParams;
    const requestedLimit = Number(searchParams.get("limit") || 30);
    const requestedPage = Number(searchParams.get("page") || 1);
    const requestedFilter = searchParams.get("filter");
    const filter = requestedFilter === "read" || requestedFilter === "unread" ? requestedFilter : "all";
    const limit = Number.isInteger(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 30;
    const page = Number.isInteger(requestedPage) ? Math.max(1, requestedPage) : 1;
    const offset = (page - 1) * limit;
    let readFilter = "";
    if (filter === "read") readFilter = "AND n.read_at IS NOT NULL";
    if (filter === "unread") readFilter = "AND n.read_at IS NULL";
    const result = await transaction(async (client) => {
      const { rows } = await client.query(
        `SELECT
          n.id,
          n.type,
          n.source_table,
          n.source_id,
          n.title,
          n.message,
          n.meta,
          n.link,
          n.read_at,
          n.created_at
        FROM notifications n
        WHERE n.recipient_user_id = $1
          ${readFilter}
        ORDER BY
          CASE WHEN n.read_at IS NULL THEN 0 ELSE 1 END,
          n.created_at DESC
        LIMIT $2 OFFSET $3`,
        [user.id, limit, offset],
      );
      const counts = await client.query(
        `SELECT
           COALESCE(SUM(CASE
             WHEN $2 = 'all' THEN 1
             WHEN $2 = 'read' AND read_at IS NOT NULL THEN 1
             WHEN $2 = 'unread' AND read_at IS NULL THEN 1
             ELSE 0
           END), 0) AS filtered_total,
           COALESCE(SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END), 0) AS unread_total
         FROM notifications
         WHERE recipient_user_id = $1`,
        [user.id, filter],
      );
      const total = Number(counts.rows[0]?.filtered_total ?? 0);
      return {
        notifications: rows,
        unreadCount: Number(counts.rows[0]?.unread_total ?? 0),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    });

    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("staff.notifications", ["internal", "external"], { write: true });
    const body = await parseJsonBody(request);

    if (body.markAll || body.all) {
      const { rows } = await transaction(async (client) =>
        client.query(
          `UPDATE notifications
         SET read_at = COALESCE(read_at, now())
         WHERE recipient_user_id = $1
           AND read_at IS NULL
         RETURNING id, read_at`,
          [user.id],
        ),
      );
      return Response.json({ notifications: rows, markedAll: true });
    }

    const ids = Array.isArray(body.ids) ? body.ids : [body.id];
    const cleanIds = ids
      .map((id) => String(id || "").trim())
      .filter(Boolean)
      .slice(0, 50);

    if (!cleanIds.length) {
      throw new ApiError(400, "Notification id is required");
    }
    if (cleanIds.some((id) => !uuidSchema.safeParse(id).success)) {
      throw new ApiError(400, "ID notifikasi tidak valid");
    }

    const { rows } = await transaction(async (client) =>
      client.query(
        `UPDATE notifications
       SET read_at = COALESCE(read_at, now())
       WHERE recipient_user_id = $1
         AND id = ANY($2::uuid[])
       RETURNING id, read_at`,
        [user.id, cleanIds],
      ),
    );

    return Response.json({ notifications: rows });
  } catch (error) {
    return jsonError(error);
  }
}
