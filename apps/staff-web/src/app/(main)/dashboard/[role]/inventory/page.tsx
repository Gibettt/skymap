import { requireStaffContext } from "@/lib/staff-access";
import { query } from "@ephemeris/db";
import { InventoryManager } from "./_components/inventory-manager";

export interface InventoryItem {
  id: string;
  resort_id: string;
  resort_name: string | null;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  status: string;
  condition: string;
  location_details: string | null;
  notes: string | null;
  last_inspected_at: string | null;
  updated_by_id: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export default async function InventoryPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const context = await requireStaffContext(role, "staff.bookings");

  let whereClause = "";
  const queryParams: unknown[] = [];

  if (context.user?.resort_id) {
    whereClause = "WHERE i.resort_id = $1";
    queryParams.push(context.user.resort_id);
  }

  const { rows } = await query(
    `SELECT
      i.id, i.resort_id, r.name AS resort_name,
      i.item_name, i.category, i.quantity, i.unit,
      i.status, i.condition, i.location_details, i.notes,
      i.last_inspected_at, i.updated_by_id, u.name AS updated_by_name,
      i.created_at, i.updated_at
    FROM resort_inventory i
    LEFT JOIN resorts r ON r.id = i.resort_id
    LEFT JOIN users u ON u.id = i.updated_by_id
    ${whereClause}
    ORDER BY i.category ASC, i.item_name ASC`,
    queryParams,
  );

  return <InventoryManager role={context.role} user={context.user} initialItems={rows as InventoryItem[]} />;
}
