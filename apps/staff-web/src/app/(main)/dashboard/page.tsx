import { redirect } from "next/navigation";

import { currentUser } from "@ephemeris/auth";

export default async function Page() {
  const user = await currentUser();
  if (!user || !["internal", "external"].includes(user.role)) {
    redirect("/login");
  }
  redirect(`/dashboard/${user.role}`);
}
