import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction, refreshAfterBookingChange } from '@ephemeris/db';
import { updateRewardSettingsSchema } from '@ephemeris/db/validators/reward-settings';

const selectSettings = `SELECT star_adult_unit, star_child_unit, star_threshold, star_bonus_usd,
                               updated_by, updated_at
                        FROM sky_settings WHERE id = true`;

export async function GET() {
  try {
    await requireUser(['admin']);
    const { rows } = await query(selectSettings);
    return Response.json({ settings: rows[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const parsed = updateRewardSettingsSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Invalid reward settings', details: parsed.error.flatten() }, { status: 400 });
    }

    const settings = await transaction(async (client) => {
      const beforeResult = await client.query(`${selectSettings} FOR UPDATE`);
      const before = beforeResult.rows[0] || null;
      const { rows } = await client.query(
        `INSERT INTO sky_settings (
           id, star_adult_unit, star_child_unit, star_threshold, star_bonus_usd, updated_by
         ) VALUES (true, $1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           star_adult_unit = EXCLUDED.star_adult_unit,
           star_child_unit = EXCLUDED.star_child_unit,
           star_threshold = EXCLUDED.star_threshold,
           star_bonus_usd = EXCLUDED.star_bonus_usd,
           updated_by = EXCLUDED.updated_by
         RETURNING *`,
        [
          parsed.data.starAdultUnit,
          parsed.data.starChildUnit,
          parsed.data.starThreshold,
          parsed.data.starBonusUsd,
          user.id,
        ]
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky_settings.update',
        entityType: 'sky_settings',
        entityId: rows[0].id,
        beforeData: before,
        afterData: rows[0],
        request,
      });
      await refreshAfterBookingChange(client);
      return rows[0];
    });

    return Response.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
