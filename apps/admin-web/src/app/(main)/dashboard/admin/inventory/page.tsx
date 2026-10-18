import { getInventoryData } from "../_lib/admin-data";
import { AdminInventoryManager } from "./_components/admin-inventory-manager";

export interface AdminInventoryItem {
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

export interface ResortOption {
  id: string;
  name: string;
  code: string;
}

export default async function AdminInventoryPage() {
  const { items, resorts } = await getInventoryData();

  return <AdminInventoryManager initialItems={items as AdminInventoryItem[]} resorts={resorts as ResortOption[]} />;
}
