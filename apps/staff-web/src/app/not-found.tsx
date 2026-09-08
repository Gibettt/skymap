"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">Page not found.</h1>
      <p className="text-muted-foreground">The page you are looking for could not be found.</p>
      <Button variant="outline" asChild>
        <Link prefetch={false} replace href="/dashboard">
          Go back home
        </Link>
      </Button>
    </div>
  );
}
