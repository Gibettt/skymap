import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requireUser } from "@ephemeris/auth";
import { query } from "@ephemeris/db";

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(["admin", "internal"]);
    const { id } = await params;
    const body = await parseJsonBody(request);

    // Verify existing item
    const existing = await query(`SELECT id, resort_id FROM resort_inventory WHERE id = $1`, [id]);
    if (!existing.rows.length) {
      throw new ApiError(404, "Item inventory tidak ditemukan");
    }

    if (user.role === "internal" && existing.rows[0].resort_id !== user.resort_id) {
      throw new ApiError(403, "Anda hanya dapat mengubah inventory resort Anda sendiri");
    }

    const itemName = body.itemName !== undefined ? String(body.itemName).trim() : null;
    const category = body.category !== undefined ? String(body.category).trim() : null;
    const quantity = body.quantity !== undefined ? Math.max(0, parseInt(body.quantity, 10) || 0) : null;
    const unit = body.unit !== undefined ? String(body.unit).trim() : null;
    const status = body.status !== undefined ? String(body.status).trim() : null;
    const condition = body.condition !== undefined ? String(body.condition).trim() : null;
    const locationDetails = body.locationDetails !== undefined ? (String(body.locationDetails).trim() || null) : undefined;
    const notes = body.notes !== undefined ? (String(body.notes).trim() || null) : undefined;

    const { rows } = await query(
      `UPDATE resort_inventory SET
        item_name = COALESCE($2, item_name),
        category = COALESCE($3, category),
        quantity = COALESCE($4, quantity),
        unit = COALESCE($5, unit),
        status = COALESCE($6, status),
        \`condition\` = COALESCE($7, \`condition\`),
        location_details = CASE WHEN $8 IS NULL AND $9 = true THEN NULL WHEN $8 IS NOT NULL THEN $8 ELSE location_details END,
        notes = CASE WHEN $10 IS NULL AND $11 = true THEN NULL WHEN $10 IS NOT NULL THEN $10 ELSE notes END,
        updated_by_id = $12,
        updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = $1
       RETURNING id, resort_id, item_name, category, quantity, unit, status, \`condition\`, location_details, notes, updated_at`,
      [
        id,
        itemName,
        category,
        quantity,
        unit,
        status,
        condition,
        locationDetails === null ? null : locationDetails,
        locationDetails === null,
        notes === null ? null : notes,
        notes === null,
        user.id,
      ],
    );

    return Response.json({ item: rows[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(["admin", "internal"]);
    const { id } = await params;

    const existing = await query(`SELECT id, resort_id FROM resort_inventory WHERE id = $1`, [id]);
    if (!existing.rows.length) {
      throw new ApiError(404, "Item inventory tidak ditemukan");
    }

    if (user.role === "internal" && existing.rows[0].resort_id !== user.resort_id) {
      throw new ApiError(403, "Anda hanya dapat menghapus inventory resort Anda sendiri");
    }

    await query(`DELETE FROM resort_inventory WHERE id = $1`, [id]);

    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
