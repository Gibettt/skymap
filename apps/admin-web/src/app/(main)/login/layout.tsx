import type { ReactNode } from "react";

import Image from "next/image";

import { Separator } from "@/components/ui/separator";

export default function AdminLoginLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="grid min-h-dvh min-w-0 xl:grid-cols-2 xl:p-2">
        <div className="relative order-2 hidden overflow-hidden rounded-3xl xl:sticky xl:top-2 xl:flex xl:h-[calc(100dvh-1rem)]">
          {/* Background image */}
          <Image
            src="/login-bg.png"
            alt="Space background"
            fill
            className="object-cover"
            priority
          />
          {/* Dark overlay so text stays readable */}
          <div className="absolute inset-0 bg-black/50" />

          <div className="absolute top-8 flex flex-col gap-1 px-8 text-white 2xl:top-10 2xl:px-10">
            <Image
              src="/spacecat-astrotourism-logo.jpg"
              alt="SpaceCat ASTROTOURISM"
              width={48}
              height={48}
              className="size-12 rounded-lg object-cover"
            />
            <h1 className="font-medium text-2xl">SpaceCat ASTROTOURISM Admin</h1>
            <p className="text-sm">Observe. Operate. Deliver.</p>
          </div>

          <div className="absolute bottom-8 flex w-full justify-between px-8 2xl:bottom-10 2xl:px-10">
            <div className="flex flex-1 flex-col gap-1 text-white">
              <h2 className="font-medium">Operational control</h2>
              <p className="text-sm">
                Manage bookings, resorts, packages, finances, and daily operations in one place.
              </p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto! bg-white/30" />
            <div className="flex flex-1 flex-col gap-1 text-white">
              <h2 className="font-medium">Secure access</h2>
              <p className="text-sm">This portal is restricted to authorized SpaceCat ASTROTOURISM administrators.</p>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex min-h-dvh min-w-0 xl:min-h-[calc(100dvh-1rem)]">{children}</div>
      </div>
    </main>
  );
}
