"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { PackageRow, PackageTypeOption } from "../../../admin/_lib/admin-data";
import { Packages } from "../../../admin/packages/_components/packages";
import type { PackageResortOption } from "../../../admin/packages/_components/packages-columns";
import { titleCase, type StaffRole } from "../../_lib/staff-api";

interface StaffPackagesProps {
  role: StaffRole;
  user?: { resort_name?: string | null };
  packages: PackageRow[];
  resorts: PackageResortOption[];
  packageTypes?: PackageTypeOption[];
}

export function StaffPackages({
  role,
  user,
  packages,
  resorts,
  packageTypes,
}: StaffPackagesProps) {
  const activeCount = packages.filter((pkg) => pkg.is_active).length;
  const privateCount = packages.filter((pkg) => pkg.experience_type === "private").length;
  const complimentaryCount = packages.filter((pkg) => !pkg.is_chargeable).length;

  return (
    <div data-staff-feature-page="packages" className="flex min-w-0 flex-col gap-4 sm:gap-6">
      {/* Top Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-semibold text-xl tracking-tight sm:text-2xl">Packages</h1>
          <Badge variant="outline" className="border-violet-300/20 bg-violet-400/10 text-violet-200">
            {titleCase(role)} staff
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Active experiences and current prices for {user?.resort_name ?? "your assigned resort"}.
        </p>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card size="sm" className="min-w-0 border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="gap-1 px-2.5 sm:px-3">
            <CardDescription className="text-[11px] leading-tight sm:text-sm">
              <span className="sm:hidden">Active</span>
              <span className="hidden sm:inline">Active packages</span>
            </CardDescription>
            <CardTitle className="text-xl tabular-nums sm:text-2xl">{activeCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm" className="min-w-0 border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="gap-1 px-2.5 sm:px-3">
            <CardDescription className="text-[11px] leading-tight sm:text-sm">
              <span className="sm:hidden">Private</span>
              <span className="hidden sm:inline">Private experiences</span>
            </CardDescription>
            <CardTitle className="text-xl tabular-nums sm:text-2xl">{privateCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm" className="min-w-0 border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="gap-1 px-2.5 sm:px-3">
            <CardDescription className="text-[11px] leading-tight sm:text-sm">
              <span className="sm:hidden">Free</span>
              <span className="hidden sm:inline">Complimentary</span>
            </CardDescription>
            <CardTitle className="text-xl tabular-nums sm:text-2xl">{complimentaryCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Full Experience Catalogue Management (Same as Admin, styled with cosmic theme) */}
      <Packages
        packages={packages}
        resorts={resorts}
        initialPackageTypes={packageTypes}
        cardTitle="Experience catalogue"
        cardDescription="Manage experience packages, pricing, availability, and resort assignments."
        addButtonClassName="bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-[0_10px_30px_rgba(168,85,247,0.24)] hover:from-fuchsia-400 hover:to-violet-500 border-0"
      />
    </div>
  );
}
