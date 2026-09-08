import { redirect } from "next/navigation";

export default function LegacyAlertsPage() {
  redirect("/dashboard/admin/notifications");
}
