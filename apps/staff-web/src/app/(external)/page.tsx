import { redirect } from "next/navigation";

import { currentUser } from "@ephemeris/auth";

export default async function Home() {
  const user = await currentUser();
  if (user && ["internal", "external"].includes(user.role)) {
    redirect(`/dashboard/${user.role}`);
  }
  redirect("/login");
}
