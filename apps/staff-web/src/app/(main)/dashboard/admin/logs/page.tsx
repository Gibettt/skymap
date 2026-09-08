import { getAuditLogs } from "../_lib/admin-data";
import { Logs } from "./_components/logs";

export default async function LogsPage() {
  const rows = await getAuditLogs();
  const logs = rows.map((log) => ({
    id: String(log.id),
    created_at: new Date(log.created_at).toISOString(),
    actor_id: log.actor_id ? String(log.actor_id) : null,
    actor_name: log.actor_name ? String(log.actor_name) : null,
    actor_email: log.actor_email ? String(log.actor_email) : null,
    action: String(log.action),
    entity_type: String(log.entity_type),
    entity_id: log.entity_id ? String(log.entity_id) : null,
    before_data: log.before_data ?? null,
    after_data: log.after_data ?? null,
    ip_address: log.ip_address ? String(log.ip_address) : null,
    user_agent: log.user_agent ? String(log.user_agent) : null,
  }));

  return <Logs logs={logs} />;
}
