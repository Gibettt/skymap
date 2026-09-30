ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('booking', 'payout', 'invoice'));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_source_table_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_source_table_check CHECK (source_table IN ('bookings', 'payout_requests', 'monthly_invoice_submissions', 'invoices'));
