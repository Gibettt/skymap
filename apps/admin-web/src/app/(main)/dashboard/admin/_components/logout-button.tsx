"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" onClick={logout} disabled={pending}>
      {pending ? <Spinner data-icon="inline-start" /> : <LogOut data-icon="inline-start" />}
      Keluar
    </Button>
  );
}
