"use client";

import { type FormEvent, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Coins, Eye, MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { PackageImageField, type PackageImageValue } from "../../_components/package-image-field";
import type { PackageRow } from "../../_lib/admin-data";
import { formatUsd, titleCase } from "../../_lib/format";

interface ResortOption {
  id: string;
  name: string;
}

interface PackageActionsProps {
  packageData: PackageRow;
  resorts: ResortOption[];
}

export function PackageActions({ packageData, resorts }: PackageActionsProps) {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [packageType, setPackageType] = useState(packageData.package_type);
  const [experienceType, setExperienceType] = useState(packageData.experience_type);
  const [resortId, setResortId] = useState(packageData.resort_id ?? resorts[0]?.id ?? "");
  const [status, setStatus] = useState(packageData.is_active ? "active" : "inactive");
  const [billing, setBilling] = useState(packageData.is_chargeable ? "chargeable" : "complimentary");
  const [image, setImage] = useState<PackageImageValue>(undefined);
  const [packageTypes, setPackageTypes] = useState<Array<{ id: string; name: string; slug: string }>>([
    { id: "regular", name: "Regular", slug: "regular" },
    { id: "private", name: "Private", slug: "private" },
    { id: "kids", name: "Kids", slug: "kids" },
  ]);
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [addingTypePending, setAddingTypePending] = useState(false);
  const [isAddon, setIsAddon] = useState(false);
  const [adultPrice, setAdultPrice] = useState("");
  const [childPrice, setChildPrice] = useState("");
  useEffect(() => {
    if (editOpen) {
      fetch("/api/package-types")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.packageTypes) && data.packageTypes.length > 0) {
            setPackageTypes(() => {
              const combined = [...data.packageTypes];
              if (!combined.some((item) => item.slug === packageData.package_type)) {
                combined.push({
                  id: packageData.package_type,
                  name: titleCase(packageData.package_type),
                  slug: packageData.package_type,
                });
              }
              return combined;
            });
          }
        })
        .catch(() => {
          // ignore package types fetch error
        });
    }
  }, [editOpen, packageData.package_type]);

  async function handleAddNewType() {
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    setAddingTypePending(true);
    try {
      const res = await fetch("/api/package-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambahkan package type");
      const created = data.packageType;
      if (created) {
        setPackageTypes((prev) => {
          if (prev.some((item) => item.slug === created.slug)) return prev;
          return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
        });
        setPackageType(created.slug);
        toast.success(`Package type "${created.name}" berhasil ditambahkan.`);
      }
      setIsAddingType(false);
      setNewTypeName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan package type");
    } finally {
      setAddingTypePending(false);
    }
  }

  function openEditDialog() {
    setPackageType(packageData.package_type);
    setExperienceType(packageData.experience_type);
    setResortId(packageData.resort_id ?? resorts[0]?.id ?? "");
    setStatus(packageData.is_active ? "active" : "inactive");
    setBilling(packageData.is_chargeable ? "chargeable" : "complimentary");
    const isAddonPkg =
      (packageData.package_type || "").toLowerCase().includes("addon") ||
      (packageData.package_type || "").toLowerCase().includes("add-on") ||
      (packageData.name || "").toLowerCase().includes("add-on") ||
      (packageData.name || "").toLowerCase().includes("addon");
    setIsAddon(Boolean(isAddonPkg));
    setAdultPrice(String(numberValue(packageData.adult_price_usd) ?? ""));
    setChildPrice(packageData.child_price_usd == null ? "" : String(numberValue(packageData.child_price_usd)));
    setImage(undefined);
    setEditOpen(true);
  }

  async function updatePackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const inclusions = String(form.get("inclusions") ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = new FormData(event.currentTarget);
    const finalPackageType = isAddon ? "addon" : packageType;
    payload.set("packageType", finalPackageType);
    payload.set("experienceType", experienceType);
    payload.set("resortId", resortId);
    let finalAdultPrice = adultPrice;
    let finalChildPrice = childPrice || null;
    if (billing === "complimentary") {
      finalAdultPrice = "0";
      finalChildPrice = "0";
    } else {
      if (form.get("adultPriceUsd")) finalAdultPrice = String(form.get("adultPriceUsd"));
      if (form.get("childPriceUsd")) finalChildPrice = String(form.get("childPriceUsd"));
    }
    payload.set("adultPriceUsd", finalAdultPrice || "0");
    if (finalChildPrice) payload.set("childPriceUsd", finalChildPrice);
    else payload.delete("childPriceUsd");
    payload.set("isChargeable", String(billing === "chargeable"));
    payload.set("inclusions", JSON.stringify(inclusions));
    if (image === null) payload.set("image", "");
    else if (image instanceof File) payload.set("image", image);

    setEditPending(true);
    try {
      const response = await fetch(`/api/packages/${packageData.id}`, {
        method: "PATCH",
        body: payload,
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Package could not be updated.");

      toast.success(`${packageData.name} was updated.`);
      setEditOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Package could not be updated.");
    } finally {
      setEditPending(false);
    }
  }

  async function deletePackage() {
    setDeletePending(true);
    try {
      const response = await fetch(`/api/packages/${packageData.id}`, { method: "DELETE" });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Package could not be deleted.");

      toast.success(`${packageData.name} was deleted.`);
      setDeleteOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Package could not be deleted.");
    } finally {
      setDeletePending(false);
    }
  }

  const inclusions = Array.isArray(packageData.inclusions) ? packageData.inclusions : [];
  const fieldId = (name: string) => `${name}-${packageData.id}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="size-8 rounded-md text-muted-foreground hover:bg-muted/50"
            size="icon-sm"
            variant="ghost"
            disabled={editPending || deletePending}
            aria-label={`Actions for ${packageData.name}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuLabel>Package actions</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setViewOpen(true)}>
              <Eye />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={openEditDialog}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{packageData.name}</DialogTitle>
            <DialogDescription>Package details from the active database.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Package type</FieldLabel>
              <Input readOnly value={titleCase(packageData.package_type)} />
            </Field>
            <Field>
              <FieldLabel>Experience type</FieldLabel>
              <Input readOnly value={titleCase(packageData.experience_type)} />
            </Field>
            <Field>
              <FieldLabel>Resort</FieldLabel>
              <Input readOnly value={packageData.resort_name ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>Location</FieldLabel>
              <Input readOnly value={packageData.location} />
            </Field>
            <Field>
              <FieldLabel>Schedule</FieldLabel>
              <Input readOnly value={packageData.schedule} />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <div>
                <Badge variant={packageData.is_active ? "default" : "secondary"}>
                  {packageData.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </Field>
            <Field>
              <FieldLabel>Adult price</FieldLabel>
              <Input readOnly value={formatUsd(packageData.adult_price_usd)} />
            </Field>
            <Field>
              <FieldLabel>Child price</FieldLabel>
              <Input
                readOnly
                value={packageData.child_price_usd == null ? "-" : formatUsd(packageData.child_price_usd)}
              />
            </Field>
            <Field>
              <FieldLabel>Child age range</FieldLabel>
              <Input readOnly value={packageData.child_age_range ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>Billing</FieldLabel>
              <Input readOnly value={packageData.is_chargeable ? "Chargeable" : "Complimentary"} />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <Textarea readOnly value={packageData.description ?? "-"} />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel>Inclusions</FieldLabel>
              <Textarea readOnly value={inclusions.length ? inclusions.join("\n") : "No inclusions"} />
            </Field>
          </FieldGroup>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={updatePackage} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Edit package</DialogTitle>
              <DialogDescription>Update package information, pricing, availability, and inclusions.</DialogDescription>
            </DialogHeader>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={fieldId("edit-package-name")}>Name</FieldLabel>
                <Input
                  id={fieldId("edit-package-name")}
                  name="name"
                  defaultValue={packageData.name}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Resort</FieldLabel>
                <Select value={resortId} onValueChange={(value) => value && setResortId(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select resort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {resorts.map((resort) => (
                        <SelectItem key={resort.id} value={resort.id}>
                          {resort.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel>Package type</FieldLabel>
                  {!isAddingType && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="h-6 text-xs text-primary hover:text-primary/80"
                      onClick={() => setIsAddingType(true)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add type
                    </Button>
                  )}
                </div>
                {isAddingType ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      autoFocus
                      placeholder="New type (e.g. VIP, Luxury)"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddNewType();
                        } else if (e.key === "Escape") {
                          setIsAddingType(false);
                          setNewTypeName("");
                        }
                      }}
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      size="xs"
                      className="h-8 px-2.5"
                      disabled={!newTypeName.trim() || addingTypePending}
                      onClick={() => void handleAddNewType()}
                    >
                      {addingTypePending ? "..." : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="h-8 px-2"
                      onClick={() => {
                        setIsAddingType(false);
                        setNewTypeName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={packageType}
                    onValueChange={(value) => {
                      if (value === "__add_new__") {
                        setIsAddingType(true);
                      } else if (value) {
                        setPackageType(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {packageTypes.map((t) => (
                          <SelectItem key={t.slug} value={t.slug}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectItem value="__add_new__" className="text-primary font-medium">
                        + Add new package type...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field>
                <FieldLabel>Experience type</FieldLabel>
                <Select value={experienceType} onValueChange={(value) => value && setExperienceType(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="communal">Communal</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="kids">Kids</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("edit-package-location")}>Location</FieldLabel>
                <Input
                  id={fieldId("edit-package-location")}
                  name="location"
                  defaultValue={packageData.location}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("edit-package-schedule")}>Schedule</FieldLabel>
                <Input
                  id={fieldId("edit-package-schedule")}
                  name="schedule"
                  defaultValue={packageData.schedule}
                  required
                />
              </Field>
            <div className="md:col-span-2 rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-emerald-400" />
                  <span className="font-semibold text-sm text-foreground">Group Pricing & Rates</span>
                  {isAddon ? (
                    <Badge variant="outline" className="border-cyan-500/50 bg-cyan-950/30 text-cyan-300 text-[11px]">
                      ✦ Add-on
                    </Badge>
                  ) : null}
                  {!isAddon && billing === "complimentary" ? (
                    <Badge variant="outline" className="border-emerald-500/50 bg-emerald-950/30 text-emerald-300 text-[11px]">
                      FOC
                    </Badge>
                  ) : null}
                  {!isAddon && billing !== "complimentary" ? (
                    <Badge variant="outline" className="border-slate-600 text-slate-300 text-[11px]">
                      Chargeable
                    </Badge>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="xs"
                    variant={billing === "chargeable" && !isAddon ? "default" : "outline"}
                    className="h-6 text-xs"
                    onClick={() => {
                      setBilling("chargeable");
                      setIsAddon(false);
                      if (adultPrice === "0") setAdultPrice("");
                      if (childPrice === "0") setChildPrice("");
                    }}
                  >
                    Chargeable
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant={billing === "complimentary" ? "default" : "outline"}
                    className={`h-6 text-xs ${
                      billing === "complimentary"
                        ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    }`}
                    onClick={() => {
                      setBilling("complimentary");
                      setAdultPrice("0");
                      setChildPrice("0");
                      setIsAddon(false);
                    }}
                  >
                    FOC (Free of Charge)
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant={isAddon ? "default" : "outline"}
                    className={`h-6 text-xs ${
                      isAddon
                        ? "border-cyan-500 bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs"
                        : "border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/30"
                    }`}
                    onClick={() => {
                      setIsAddon((prev) => !prev);
                      if (!isAddon && billing === "complimentary") {
                        setBilling("chargeable");
                        if (adultPrice === "0") setAdultPrice("");
                      }
                    }}
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    Add-on
                  </Button>
                </div>
              </div>

              {isAddon && (
                <div className="flex items-center justify-between rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-950/20 dark:text-cyan-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    Add-on Active: This package will be displayed exclusively in the booking Add-on dropdown column.
                  </span>
                  <Badge variant="outline" className="border-cyan-400/40 text-cyan-800 dark:text-cyan-300 shrink-0">
                    Add-on
                  </Badge>
                </div>
              )}

              {billing === "complimentary" ? (
                <div className="flex h-9 items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 font-medium text-emerald-600 text-sm dark:text-emerald-400">
                  <span>✓ FOC (Free of Charge)</span>
                  <span className="text-muted-foreground text-xs">$0.00 — Complimentary experience</span>
                </div>
              ) : null}

              {billing === "chargeable" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor={fieldId("edit-package-adult-price")}>
                      {isAddon ? "Add-on / Adult price (USD) *" : "Adult price (USD) *"}
                    </FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                        $
                      </span>
                      <Input
                        id={fieldId("edit-package-adult-price")}
                        name="adultPriceUsd"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        className="pl-7 font-medium"
                        placeholder="0.00"
                        value={adultPrice}
                        onChange={(e) => setAdultPrice(e.target.value)}
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor={fieldId("edit-package-child-price")}>
                      Child price (USD)
                    </FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                        $
                      </span>
                      <Input
                        id={fieldId("edit-package-child-price")}
                        name="childPriceUsd"
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-7 font-medium"
                        placeholder={adultPrice ? (Number(adultPrice) * 0.5).toFixed(2) : "50% of adult rate"}
                        value={childPrice}
                        onChange={(e) => setChildPrice(e.target.value)}
                      />
                    </div>
                  </Field>

                  <div className="sm:col-span-2 lg:col-span-1 flex flex-col justify-between rounded-lg border border-border/60 bg-background/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        Add-on Feature
                      </span>
                      <Switch
                        id={fieldId("edit-package-addon-toggle")}
                        checked={isAddon}
                        onCheckedChange={setIsAddon}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {isAddon
                        ? "Marked as Add-on item for bookings."
                        : "Enable to make this an optional Add-on."}
                    </p>
                  </div>

                  <Field className="sm:col-span-2 lg:col-span-3">
                    <FieldLabel htmlFor={fieldId("edit-package-age-range")}>Child age range (optional)</FieldLabel>
                    <Input
                      id={fieldId("edit-package-age-range")}
                      name="childAgeRange"
                      defaultValue={packageData.child_age_range ?? ""}
                      placeholder="e.g. 4–11 years (under 12y)"
                    />
                  </Field>
                </div>
              ) : (
                <Field>
                  <FieldLabel htmlFor={fieldId("edit-package-age-range")}>Child age range (optional)</FieldLabel>
                  <Input
                    id={fieldId("edit-package-age-range")}
                    name="childAgeRange"
                    defaultValue={packageData.child_age_range ?? ""}
                    placeholder="e.g. 4–11 years"
                  />
                </Field>
              )}
            </div>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select value={status} onValueChange={(value) => value && setStatus(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Billing / Pricing</FieldLabel>
                <Select value={billing} onValueChange={(value) => value && setBilling(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="chargeable">Chargeable</SelectItem>
                      <SelectItem value="complimentary">FOC (Free of Charge)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor={fieldId("edit-package-description")}>Description</FieldLabel>
                <Textarea
                  id={fieldId("edit-package-description")}
                  name="description"
                  defaultValue={packageData.description ?? ""}
                />
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor={fieldId("edit-package-inclusions")}>Inclusions (one per line)</FieldLabel>
                <Textarea
                  id={fieldId("edit-package-inclusions")}
                  name="inclusions"
                  defaultValue={inclusions.join("\n")}
                />
              </Field>
              <div className="md:col-span-2">
                <PackageImageField currentImageUrl={packageData.image_url} onChange={setImage} />
              </div>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={editPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={editPending || !resortId}>
                {editPending && <Spinner data-icon="inline-start" />}
                {editPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {packageData.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the package. Packages already used by bookings cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={(event) => {
                event.preventDefault();
                void deletePackage();
              }}
            >
              {deletePending && <Spinner data-icon="inline-start" />}
              {deletePending ? "Deleting..." : "Delete package"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const numberValue = (value: string | number) => Number(value);
