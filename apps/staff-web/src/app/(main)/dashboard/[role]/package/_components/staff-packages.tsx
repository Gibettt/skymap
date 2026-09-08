"use client";

import * as React from "react";

import Link from "next/link";

import { Grid2X2, List, PackageOpen, Plus, RefreshCw, Search, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInitials } from "@/lib/utils";

import {
  formatDate,
  formatUsd,
  packageInclusions,
  type StaffPackage,
  type StaffRole,
  type StaffUser,
  staffApi,
  titleCase,
} from "../../_lib/staff-api";

interface PackagesResponse {
  packages: StaffPackage[];
}

interface MeResponse {
  user: StaffUser;
}

type PackageView = "list" | "grid";

const PACKAGE_METRIC_SKELETONS = ["active", "private", "complimentary"];
const PACKAGE_CARD_SKELETONS = ["one", "two", "three", "four", "five", "six"];

function normalizePackage(item: StaffPackage): StaffPackage {
  return {
    ...item,
    adult_price_usd: Number(item.adult_price_usd),
    child_price_usd: item.child_price_usd == null ? null : Number(item.child_price_usd),
    is_chargeable: Boolean(item.is_chargeable),
    is_active: Boolean(item.is_active),
    has_image: Boolean(item.has_image),
  };
}

function PackagesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {PACKAGE_METRIC_SKELETONS.map((item) => (
          <Card key={item} size="sm">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-14" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PACKAGE_CARD_SKELETONS.map((item) => (
            <Skeleton key={item} className="h-64 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PackageGrid({ packages }: { packages: StaffPackage[] }) {
  return (
    <div className="grid gap-4 px-4 sm:grid-cols-2 xl:grid-cols-3">
      {packages.map((item) => {
        const inclusions = packageInclusions(item.inclusions);

        return (
          <Card key={item.id} size="sm" className="h-full">
            <CardHeader>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar size="lg" className="font-medium">
                  {item.image_url ? <AvatarImage src={item.image_url} alt="" /> : null}
                  <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="truncate">{item.name}</CardTitle>
                  <CardDescription className="truncate">{item.location}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{titleCase(item.package_type)}</Badge>
                <Badge variant="outline">{titleCase(item.experience_type)}</Badge>
                <Badge variant="default">Active</Badge>
              </div>
              {item.description ? (
                <p className="line-clamp-2 text-muted-foreground text-sm">{item.description}</p>
              ) : null}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Schedule</dt>
                  <dd className="truncate font-medium">{item.schedule || "Upon request"}</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Billing</dt>
                  <dd className="truncate font-medium">{item.is_chargeable ? "Chargeable" : "Complimentary"}</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Adult price</dt>
                  <dd className="truncate font-medium tabular-nums">{formatUsd(item.adult_price_usd)}</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Child price</dt>
                  <dd className="truncate font-medium tabular-nums">
                    {item.child_price_usd == null ? "Not set" : formatUsd(item.child_price_usd)}
                  </dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Inclusions</dt>
                  <dd className="truncate font-medium tabular-nums">{inclusions.length} included</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Child ages</dt>
                  <dd className="truncate font-medium">{item.child_age_range || "All ages"}</dd>
                </div>
              </dl>
              {inclusions.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {inclusions.slice(0, 3).map((inclusion) => (
                    <Badge key={inclusion} variant="secondary" className="max-w-full truncate">
                      {inclusion}
                    </Badge>
                  ))}
                  {inclusions.length > 3 ? <Badge variant="secondary">+{inclusions.length - 3}</Badge> : null}
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="justify-end">
              <span className="text-muted-foreground text-xs">Updated {formatDate(item.updated_at)}</span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

function PackageTable({ packages }: { packages: StaffPackage[] }) {
  return (
    <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4">
      <TableHeader className="[&_tr]:border-t">
        <TableRow>
          <TableHead className="py-4 font-normal">Package</TableHead>
          <TableHead className="py-4 font-normal">Type</TableHead>
          <TableHead className="py-4 font-normal">Schedule</TableHead>
          <TableHead className="py-4 text-right font-normal">Adult price</TableHead>
          <TableHead className="py-4 text-right font-normal">Child price</TableHead>
          <TableHead className="py-4 text-right font-normal">Inclusions</TableHead>
          <TableHead className="py-4 font-normal">Billing</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {packages.map((item) => (
          <TableRow key={item.id} className="border-border/60 hover:bg-muted/20">
            <TableCell className="py-4 align-middle">
              <div className="flex min-w-52 items-center gap-3">
                <Avatar>
                  {item.image_url ? <AvatarImage src={item.image_url} alt="" /> : null}
                  <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="truncate text-muted-foreground text-xs">{item.location}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex min-w-28 flex-col gap-1">
                <span>{titleCase(item.package_type)}</span>
                <span className="text-muted-foreground text-xs">{titleCase(item.experience_type)}</span>
              </div>
            </TableCell>
            <TableCell>{item.schedule || "Upon request"}</TableCell>
            <TableCell className="text-right tabular-nums">{formatUsd(item.adult_price_usd)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {item.child_price_usd == null ? "Not set" : formatUsd(item.child_price_usd)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{packageInclusions(item.inclusions).length}</TableCell>
            <TableCell>
              <Badge variant={item.is_chargeable ? "outline" : "secondary"}>
                {item.is_chargeable ? "Chargeable" : "Complimentary"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function StaffPackages({ role }: { role: StaffRole }) {
  const [user, setUser] = React.useState<StaffUser | null>(null);
  const [packages, setPackages] = React.useState<StaffPackage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [view, setView] = React.useState<PackageView>("list");
  const [page, setPage] = React.useState(1);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [me, packageData] = await Promise.all([
        staffApi<MeResponse>("/api/me", { cache: "no-store" }),
        staffApi<PackagesResponse>("/api/packages", { cache: "no-store" }),
      ]);
      setUser(me.user);
      setPackages(packageData.packages.map(normalizePackage));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load packages.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredPackages = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return packages.filter((item) => {
      if (typeFilter !== "all" && item.package_type !== typeFilter) return false;
      if (!query) return true;
      return [item.name, item.location, item.description, item.schedule].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [packages, search, typeFilter]);

  const pageSize = view === "grid" ? 9 : 10;
  const pageCount = Math.max(1, Math.ceil(filteredPackages.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visiblePackages = filteredPackages.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const privateCount = packages.filter((item) => item.experience_type === "private").length;
  const complimentaryCount = packages.filter((item) => !item.is_chargeable).length;
  const readOnly = user?.access_role_level === "read_only";

  let packageContent: React.ReactNode = (
    <Empty className="mx-4 min-h-64 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PackageOpen />
        </EmptyMedia>
        <EmptyTitle>No packages found</EmptyTitle>
        <EmptyDescription>Try changing the package type or search query.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
  if (visiblePackages.length) {
    packageContent =
      view === "list" ? <PackageTable packages={visiblePackages} /> : <PackageGrid packages={visiblePackages} />;
  }

  if (loading) return <PackagesLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">Packages</h1>
            <Badge variant="outline">{titleCase(role)} staff</Badge>
            <Badge variant="secondary">Read-only catalogue</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Active experiences and current prices for {user?.resort_name || "your assigned resort"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadData()}>
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
          {!readOnly ? (
            <Button asChild>
              <Link href={`/dashboard/${role}/bookings?new=1`}>
                <Plus data-icon="inline-start" />
                New booking
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>Packages could not be loaded</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Active packages</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{packages.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Private experiences</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{privateCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Complimentary</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{complimentaryCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle>Experience catalogue</CardTitle>
          <CardDescription>
            Browse active packages. Package setup and pricing are managed by administrators.
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto w-full md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto">
            <InputGroup className="w-full md:w-72">
              <InputGroupAddon align="inline-start">
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Search packages"
                placeholder="Search packages..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </InputGroup>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                if (!value) return;
                setTypeFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Type:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="kids">Kids</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Tabs
              value={view}
              onValueChange={(value) => {
                if (value === "list" || value === "grid") {
                  setView(value);
                  setPage(1);
                }
              }}
            >
              <TabsList aria-label="Package view">
                <TabsTrigger value="list" aria-label="List view" title="List view">
                  <List />
                </TabsTrigger>
                <TabsTrigger value="grid" aria-label="Card view" title="Card view">
                  <Grid2X2 />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <p className="px-4 text-muted-foreground text-sm tabular-nums">
            {filteredPackages.length} {filteredPackages.length === 1 ? "package" : "packages"}
          </p>

          {packageContent}
        </CardContent>
        {filteredPackages.length ? (
          <CardFooter className="flex-col justify-between gap-3 sm:flex-row">
            <p className="text-muted-foreground text-sm">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredPackages.length)} of{" "}
              {filteredPackages.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </Button>
              <Badge variant="outline">
                Page {currentPage} of {pageCount}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
