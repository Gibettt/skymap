import { redirect } from "next/navigation";

export default function LegacyCalendarPage() {
  redirect("/dashboard/admin/calendar");
}
