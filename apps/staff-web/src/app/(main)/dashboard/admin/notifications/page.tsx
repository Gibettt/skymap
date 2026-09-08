import { redirect } from "next/navigation";

import { currentUser } from "@ephemeris/auth";

import { PageHeader } from "../_components/page-header";
import { getNotifications } from "../_lib/admin-data";
import { Notifications } from "./_components/notifications";

export default async function NotificationsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const notifications = await getNotifications(user.id);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Notifications"
        description="Review booking activity and payout requests that need administrator attention."
      />
      <Notifications initialNotifications={notifications} />
    </div>
  );
}
