import { Globe } from "lucide-react";

import { AdminLoginForm } from "./_components/admin-login-form";

export const metadata = {
  title: "Login Admin | SpaceCat ASTROTOURISM",
};

export default function AdminLoginPage() {
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center gap-8 sm:w-[350px]">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-medium text-3xl">Login to your account</h1>
          <p className="text-muted-foreground text-sm">Enter your administrator credentials to continue.</p>
        </div>
        <AdminLoginForm />
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <p className="text-muted-foreground text-sm">Administrator access only</p>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <p className="text-sm">&copy; {new Date().getFullYear()}, SpaceCat ASTROTOURISM.</p>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ENG
        </div>
      </div>
    </>
  );
}
