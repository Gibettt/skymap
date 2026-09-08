export interface InvoiceLineItem {
  id: string;
  description: string;
  detail: string | null;
  quantity: number;
  unit_price_usd: number;
  amount_usd: number;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  invoice_type: "customer";
  status: "issued" | "paid";
  booking_id: string | null;
  payout_request_id: null;
  recipient_name: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_detail: string | null;
  payment_method: string | null;
  currency: "USD";
  issued_at: string;
  due_date: string | null;
  subtotal_usd: number;
  service_charge_usd: number;
  tax_usd: number;
  total_usd: number;
  line_items: InvoiceLineItem[];
  source_snapshot: Record<string, unknown>;
  notes: string | null;
  issued_by: string;
  issuer_name: string | null;
  source_reference: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentWorkflowRow {
  id: string;
  type: "customer";
  reference: string;
  recipient_name: string;
  recipient_email: string | null;
  source_date: string | null;
  amount_usd: number;
  source_status: string;
  workflow_status: "pending" | "paid";
  payment_method: string | null;
  confirmed_at: string | null;
  payment_reference: string | null;
  payment_notes: string | null;
  context_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_status: "issued" | "paid" | null;
  base_total_usd?: number;
  service_charge_usd?: number;
  tax_usd?: number;
}
