import { query, transaction } from '@ephemeris/db';

async function run() {
  try {
    const { rows } = await query("SELECT * FROM bookings WHERE status = 'active' LIMIT 1");
    if (!rows.length) return console.log('No active bookings');
    const before = rows[0];

    await transaction(async (client) => {
      console.log('Testing notification insert...');
      await client.query(
        `INSERT INTO notifications (
          recipient_user_id, type, source_table, source_id, title, message, meta, link, created_at
        )
        VALUES ($1, 'booking', 'bookings', $2, $3, $4, $5, '/dashboard/external/bookings', now())
        ON CONFLICT (recipient_user_id, type, source_id) DO UPDATE SET
          title = EXCLUDED.title,
          message = EXCLUDED.message,
          meta = EXCLUDED.meta,
          read_at = NULL,
          updated_at = now()`,
        [
          before.staff_id,
          before.id,
          'Booking Disetujui',
          'Test',
          'Staff Internal - 19 Aug'
        ]
      );
      console.log('Notification success');
      throw new Error('ROLLBACK_TEST');
    });
  } catch (err) {
    console.error(err);
  }
}
run();
