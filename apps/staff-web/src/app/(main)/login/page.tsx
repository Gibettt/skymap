import { redirect } from "next/navigation";

import Image from "next/image";

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
    <div className="flex min-h-dvh w-full min-w-0 flex-col px-4 py-4 sm:px-8 sm:py-5 xl:min-h-[calc(100dvh-1rem)] xl:px-10">
      <header className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 xl:invisible" aria-hidden="true">
          <Image
            src="/spacecat-astrotourism-logo.jpg"
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-lg object-cover"
          />
          <span className="truncate font-medium text-sm sm:text-base">SpaceCat ASTROTOURISM</span>
        </div>
        <p className="shrink-0 text-muted-foreground text-xs sm:text-sm">Authorized staff access</p>
      </header>

      <div className="flex flex-1 items-center justify-center py-8 sm:py-10">
        <div className="flex w-full max-w-[420px] flex-col gap-6 sm:gap-8">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="font-medium text-2xl tracking-tight sm:text-3xl">Login to your account</h1>
            <p className="text-pretty text-muted-foreground text-sm sm:text-base">
              Choose your staff portal and enter your credentials.
            </p>
          </div>
          <StaffLoginForm />
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center sm:justify-between sm:text-left">
        <p className="text-xs sm:text-sm">&copy; {new Date().getFullYear()}, SpaceCat ASTROTOURISM.</p>
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ENG
        </div>
      </footer>
    </div>
  );
}
