import Link from "next/link";
import { redirect } from "next/navigation";

import { currentUser } from "@ephemeris/auth";
import { Globe } from "lucide-react";

import { ExternalRegisterForm } from "./_components/external-register-form";

export const metadata = {
  title: "External Staff Registration | Ephemeris",
};

export default async function ExternalRegisterPage() {
  const user = await currentUser();
  if (user && (user.role === "internal" || user.role === "external")) {
    redirect(`/dashboard/${user.role}`);
  }

  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-start gap-8 px-4 pt-20 pb-24 sm:w-[452px] sm:px-4 lg:justify-center">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-medium text-3xl">Request a staff account</h1>
          <p className="text-muted-foreground text-sm">
            Registration is available to external partner-resort staff. An administrator will review your request.
          </p>
        </div>
        <ExternalRegisterForm />
      </div>

      <div className="absolute top-5 flex w-full justify-end px-6 sm:px-10">
        <p className="text-muted-foreground text-sm">
          Already have an account?{" "}
          <Link prefetch={false} href="/login" className="text-foreground underline-offset-4 hover:underline">
            Login
          </Link>
        </p>
      </div>

      <div className="pointer-events-none absolute bottom-5 flex w-full justify-between px-6 sm:px-10">
        <p className="text-sm">&copy; {new Date().getFullYear()}, Ephemeris.</p>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ENG
        </div>
      </div>
    </>
  );
}
