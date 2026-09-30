ALTER TABLE notifications MODIFY COLUMN type ENUM('booking', 'payout', 'invoice') NOT NULL;
ALTER TABLE notifications MODIFY COLUMN source_table ENUM('bookings', 'payout_requests', 'monthly_invoice_submissions', 'invoices') NOT NULL;
