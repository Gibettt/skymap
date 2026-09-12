import type { ReactNode } from "react";

import Image from "next/image";

import { Separator } from "@/components/ui/separator";

export default function StaffLoginLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid min-h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="relative order-2 hidden rounded-3xl bg-primary lg:sticky lg:top-2 lg:flex lg:h-[calc(100dvh-1rem)]">
          <div className="absolute top-10 flex flex-col gap-1 px-10 text-primary-foreground">
            <Image
              src="/spacecat-astrotourism-logo.jpg"
              alt="SpaceCat ASTROTOURISM"
              width={48}
              height={48}
              className="size-12 rounded-lg object-cover"
            />
            <h1 className="font-medium text-2xl">SpaceCat ASTROTOURISM Staff</h1>
            <p className="text-sm">Coordinate. Observe. Deliver.</p>
          </div>

          <div className="absolute bottom-10 flex w-full justify-between px-10">
            <div className="flex flex-1 flex-col gap-1 text-primary-foreground">
              <h2 className="font-medium">Resort operations</h2>
              <p className="text-sm">
                Keep bookings, schedules, guest experiences, and payouts organized in one place.
              </p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto!" />
            <div className="flex flex-1 flex-col gap-1 text-primary-foreground">
              <h2 className="font-medium">Role-aware access</h2>
              <p className="text-sm">Internal and external staff see only the tools assigned to their role.</p>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex min-h-[calc(100dvh-1rem)] overflow-y-auto">{children}</div>
      </div>
    </main>
  );
}
