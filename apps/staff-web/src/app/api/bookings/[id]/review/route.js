import { randomUUID } from "node:crypto";

import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { ensureStaffReviewSchema, transaction } from "@ephemeris/db";
import { staffReviewError } from "@ephemeris/db/bookings";
import { uuidSchema } from "@ephemeris/db/validators/common";
import { staffReviewSchema } from "@ephemeris/db/validators/feedback";

/** External staff rate a completed booking they created; saving again updates their rating. */
export async function POST(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("staff.bookings", ["external"], { write: true });
    const { id: rawId } = await params;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, "Invalid booking id");
    const parsed = staffReviewSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid rating");
    const { rating, comment } = parsed.data;

    await ensureStaffReviewSchema();
    const review = await transaction(async (client) => {
      const { rows } = await client.query("SELECT id, staff_id, status FROM bookings WHERE id = $1 FOR UPDATE", [
        parsedId.data,
      ]);
      const booking = rows[0];
      if (!booking) throw new ApiError(404, "Booking not found");
      const reviewError = staffReviewError(user, booking);
      if (reviewError) throw new ApiError(reviewError.status, reviewError.error);

      const existing = await client.query("SELECT id, rating, comment FROM booking_staff_reviews WHERE booking_id = $1", [
        booking.id,
      ]);
      if (existing.rows[0]) {
        await client.query("UPDATE booking_staff_reviews SET rating = $2, comment = $3, updated_at = now() WHERE id = $1", [
          existing.rows[0].id,
          rating,
          comment,
        ]);
      } else {
        await client.query(
          "INSERT INTO booking_staff_reviews (id, booking_id, reviewer_id, rating, comment) VALUES ($1, $2, $3, $4, $5)",
          [randomUUID(), booking.id, user.id, rating, comment],
        );
      }
      await writeAudit(client, {
        actorId: user.id,
        action: existing.rows[0] ? "booking.staff_review.update" : "booking.staff_review.create",
        entityType: "booking",
        entityId: booking.id,
        beforeData: existing.rows[0] ?? null,
        afterData: { rating, comment },
        request,
      });
      return { rating, comment, reviewerName: user.name, updatedAt: new Date().toISOString() };
    });

    return Response.json({ review });
  } catch (error) {
    return jsonError(error);
  }
}
