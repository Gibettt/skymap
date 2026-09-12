import { redirect } from "next/navigation";

import { currentUser } from "@ephemeris/auth";
import { Globe } from "lucide-react";

import { StaffLoginForm } from "./_components/staff-login-form";

export const metadata = {
  title: "Staff Login | SpaceCat ASTROTOURISM",
};

export default async function StaffLoginPage() {
  const user = await currentUser();
  if (user && (user.role === "internal" || user.role === "external")) {
    redirect(`/dashboard/${user.role}`);
  }

  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center gap-8 px-4 py-20 sm:w-[382px] sm:px-4">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-medium text-3xl">Login to your account</h1>
          <p className="text-muted-foreground text-sm">Choose your staff portal and enter your credentials.</p>
        </div>
        <StaffLoginForm />
      </div>

      <div className="pointer-events-none absolute top-5 flex w-full justify-end px-6 sm:px-10">
        <p className="text-muted-foreground text-sm">Authorized staff access</p>
      </div>

      <div className="pointer-events-none absolute bottom-5 flex w-full justify-between px-6 sm:px-10">
        <p className="text-sm">&copy; {new Date().getFullYear()}, SpaceCat ASTROTOURISM.</p>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ENG
        </div>
      </div>
    </>
  );
}
