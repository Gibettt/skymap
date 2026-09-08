import { getUsers } from "../_lib/admin-data";
import { AdminUsers } from "./_components/users";

export default async function UsersPage() {
  const data = await getUsers();
  const users = data.users.map((user) => ({
    ...user,
    id: String(user.id),
    name: String(user.name),
    email: String(user.email),
    phone: user.phone ? String(user.phone) : null,
    role: String(user.role),
    resort_id: user.resort_id ? String(user.resort_id) : null,
    resort_name: user.resort_name ? String(user.resort_name) : null,
    status: String(user.status),
    presence: user.presence ? String(user.presence) : null,
    total_booking: Number(user.total_booking),
    created_at: new Date(user.created_at).toISOString(),
    updated_at: new Date(user.updated_at).toISOString(),
    last_seen_at: user.last_seen_at ? new Date(user.last_seen_at).toISOString() : null,
    last_active_at: user.last_active_at ? new Date(user.last_active_at).toISOString() : null,
  }));
  const resorts = data.resorts.map((resort) => ({ id: String(resort.id), name: String(resort.name) }));

  return <AdminUsers users={users} resorts={resorts} />;
}
