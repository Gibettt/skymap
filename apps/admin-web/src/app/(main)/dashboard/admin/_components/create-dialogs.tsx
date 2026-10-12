"use client";

import { type FormEvent, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Coins, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { PackageImageField, type PackageImageValue } from "./package-image-field";

interface ResortOption {
  id: string;
  name: string;
  status?: string;
}
export interface PackageTypeOption {
  id: string;
  name: string;
  slug: string;
}


async function postJson(url: string, body: object, fallbackMessage = "Data gagal disimpan.") {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? fallbackMessage);
}

async function postForm(url: string, body: FormData, fallbackMessage = "Data gagal disimpan.") {
  const response = await fetch(url, { method: "POST", body });
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? fallbackMessage);
}

export function CreateResortDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await postJson(
        "/api/resorts",
        {
          name: form.get("name"),
          code: form.get("code"),
          location: form.get("location"),
          timezone: form.get("timezone"),
          contactName: form.get("contactName"),
          contactPhone: form.get("contactPhone"),
          contactEmail: form.get("contactEmail"),
          whatsappNumber: form.get("whatsappNumber"),
          observationSpots: form.get("observationSpots"),
          latitude: form.get("latitude"),
          longitude: form.get("longitude"),
          status: "inactive",
        },
        "Resort data could not be saved.",
      );
      toast.success("Partner resort added as inactive.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The resort could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus data-icon="inline-start" />
          Add resort
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add partner resort</DialogTitle>
            <DialogDescription>New resorts remain inactive until their staff coverage is complete.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="resort-name">Name</FieldLabel>
              <Input id="resort-name" name="name" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="resort-code">Code</FieldLabel>
              <Input id="resort-code" name="code" placeholder="MLE-01" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="resort-location">Location</FieldLabel>
              <Input id="resort-location" name="location" defaultValue="Maldives" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="resort-timezone">Timezone IANA</FieldLabel>
              <Input id="resort-timezone" name="timezone" defaultValue="Indian/Maldives" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="resort-contact">Contact name</FieldLabel>
              <Input id="resort-contact" name="contactName" />
            </Field>
            <Field>
              <FieldLabel htmlFor="resort-phone">Phone</FieldLabel>
              <Input id="resort-phone" name="contactPhone" />
            </Field>
            <Field>
              <FieldLabel htmlFor="resort-email">Email</FieldLabel>
              <Input id="resort-email" name="contactEmail" type="email" />
            </Field>
            <Field>
              <FieldLabel htmlFor="resort-whatsapp">WhatsApp</FieldLabel>
              <Input id="resort-whatsapp" name="whatsappNumber" />
            </Field>
            <Field>
              <FieldLabel htmlFor="resort-latitude">Latitude</FieldLabel>
              <Input id="resort-latitude" name="latitude" type="number" step="0.0001" defaultValue="5.2893" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="resort-longitude">Longitude</FieldLabel>
              <Input
                id="resort-longitude"
                name="longitude"
                type="number"
                step="0.0001"
                defaultValue="73.5358"
                required
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="resort-spots">Observation spots</FieldLabel>
              <Textarea id="resort-spots" name="observationSpots" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Saving..." : "Save resort"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateUserDialog({ resorts }: { resorts: ResortOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [role, setRole] = useState("internal");
  const [status, setStatus] = useState("active");
  const [resortId, setResortId] = useState(resorts[0]?.id ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await postJson("/api/users", {
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        password: form.get("password"),
        role,
        status,
        resortId,
      });
      toast.success("Staff account added.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The user could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!resorts.length}>
          <Plus data-icon="inline-start" />
          Add user
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add staff account</DialogTitle>
            <DialogDescription>Create an internal or external staff account and assign it to a resort.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="user-name">Name</FieldLabel>
              <Input id="user-name" name="name" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-email">Email</FieldLabel>
              <Input id="user-email" name="email" type="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-phone">Phone</FieldLabel>
              <Input id="user-phone" name="phone" />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-password">Password</FieldLabel>
              <Input id="user-password" name="password" type="password" minLength={8} required />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select value={role} onValueChange={(value) => value && setRole(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
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
            <Field className="md:col-span-2">
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
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending || !resortId}>
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Saving..." : "Save user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreatePackageDialog({
  resorts,
  initialPackageTypes,
  triggerClassName,
}: {
  resorts: ResortOption[];
  initialPackageTypes?: PackageTypeOption[];
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [packageTypes, setPackageTypes] = useState<PackageTypeOption[]>(
    initialPackageTypes ?? [
      { id: "regular", name: "Regular", slug: "regular" },
      { id: "private", name: "Private", slug: "private" },
      { id: "kids", name: "Kids", slug: "kids" },
    ]
  );
  const [packageType, setPackageType] = useState("regular");
  const [experienceType, setExperienceType] = useState("communal");
  const [resortId, setResortId] = useState(resorts[0]?.id ?? "");
  const [image, setImage] = useState<PackageImageValue>(undefined);
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [addingTypePending, setAddingTypePending] = useState(false);
  const [billing, setBilling] = useState<"chargeable" | "foc">("chargeable");
  const [isAddon, setIsAddon] = useState(false);
  const [adultPrice, setAdultPrice] = useState("");
  const [couplePrice, setCouplePrice] = useState("");
  const [childPrice, setChildPrice] = useState("");
  const [groupPrice, setGroupPrice] = useState("");
  const [mealPrice, setMealPrice] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/package-types")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.packageTypes) && data.packageTypes.length > 0) {
            setPackageTypes(data.packageTypes);
          }
        })
        .catch(() => {
          // ignore fetch error on mount
        });
    }
  }, [open]);

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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const inclusions = String(form.get("inclusions") ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    let finalAdultPrice = adultPrice;
    let finalChildPrice = childPrice || null;
    if (billing === "foc") {
      finalAdultPrice = "0";
      finalChildPrice = "0";
    } else {
      if (form.get("adultPriceUsd")) finalAdultPrice = String(form.get("adultPriceUsd"));
      if (form.get("childPriceUsd")) finalChildPrice = String(form.get("childPriceUsd"));
    }
    const payload = new FormData(event.currentTarget);
    const finalPackageType = isAddon ? "addon" : packageType;
    payload.set("packageType", finalPackageType);
    payload.set("experienceType", experienceType);
    payload.set("resortId", resortId);
    payload.set("adultPriceUsd", finalAdultPrice || "0");
    if (finalChildPrice) payload.set("childPriceUsd", finalChildPrice);
    else payload.delete("childPriceUsd");
    if (couplePrice) payload.set("couplePriceUsd", couplePrice);
    else payload.delete("couplePriceUsd");
    if (groupPrice) payload.set("groupPriceUsd", groupPrice);
    else payload.delete("groupPriceUsd");
    payload.set("mealPriceUsd", mealPrice || "0");
    payload.set("isChargeable", billing === "foc" ? "false" : "true");
    payload.set("isActive", "true");
    payload.set("inclusions", JSON.stringify(inclusions));
    if (image instanceof File) payload.set("image", image);
    setPending(true);
    try {
      await postForm("/api/packages", payload, "Package data could not be saved.");
      toast.success("Package added.");
      setImage(undefined);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The package could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setImage(undefined);
          setIsAddon(false);
          setAdultPrice("");
          setCouplePrice("");
          setChildPrice("");
          setGroupPrice("");
          setMealPrice("");
        }
      }}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!resorts.length} className={triggerClassName}>
          <Plus data-icon="inline-start" />
          Add package
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add package</DialogTitle>
            <DialogDescription>Create a new observation experience for a partner resort.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="package-name">Name</FieldLabel>
              <Input id="package-name" name="name" required />
            </Field>
            <Field>
              <FieldLabel>Resort</FieldLabel>
              <Select value={resortId} onValueChange={(value) => value && setResortId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
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
              <FieldLabel htmlFor="package-location">Location</FieldLabel>
              <Input id="package-location" name="location" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="package-schedule">Schedule</FieldLabel>
              <Input id="package-schedule" name="schedule" defaultValue="Upon request" required />
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
                  {!isAddon && billing === "foc" ? (
                    <Badge variant="outline" className="border-emerald-500/50 bg-emerald-950/30 text-emerald-300 text-[11px]">
                      FOC
                    </Badge>
                  ) : null}
                  {!isAddon && billing !== "foc" ? (
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
                    variant={billing === "foc" ? "default" : "outline"}
                    className={`h-6 text-xs ${
                      billing === "foc"
                        ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    }`}
                    onClick={() => {
                      setBilling("foc");
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
                      if (!isAddon && billing === "foc") {
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

              {billing === "foc" ? (
                <div className="flex h-9 items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 font-medium text-emerald-600 text-sm dark:text-emerald-400">
                  <span>✓ FOC (Free of Charge)</span>
                  <span className="text-muted-foreground text-xs">$0.00 — Complimentary experience</span>
                </div>
              ) : null}

              {billing === "chargeable" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* 1. Adult Price */}
                  <Field>
                    <FieldLabel htmlFor="package-adult-price">
                      {isAddon ? "Add-on / Adult price (USD) *" : "Adult price (USD) *"}
                    </FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                        $
                      </span>
                      <Input
                        id="package-adult-price"
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

                  {/* 2. Couple Price */}
                  <Field>
                    <FieldLabel htmlFor="package-couple-price">
                      Couple price (USD)
                    </FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                        $
                      </span>
                      <Input
                        id="package-couple-price"
                        name="couplePriceUsd"
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-7 font-medium"
                        placeholder={adultPrice ? (Number(adultPrice) * 2).toFixed(2) : "For 2 adults"}
                        value={couplePrice}
                        onChange={(e) => setCouplePrice(e.target.value)}
                      />
                    </div>
                  </Field>

                  {/* 3. Child Price */}
                  <Field>
                    <FieldLabel htmlFor="package-child-price">
                      Child price (USD)
                    </FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                        $
                      </span>
                      <Input
                        id="package-child-price"
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

                  {/* 4. Group Price */}
                  <Field>
                    <FieldLabel htmlFor="package-group-price">
                      Group price (USD)
                    </FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                        $
                      </span>
                      <Input
                        id="package-group-price"
                        name="groupPriceUsd"
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-7 font-medium"
                        placeholder="Private group rate"
                        value={groupPrice}
                        onChange={(e) => setGroupPrice(e.target.value)}
                      />
                    </div>
                  </Field>

                  {/* 5. Inclusion / Meal Price (F&B) */}
                  <Field className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 sm:col-span-1">
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="package-meal-price" className="text-amber-700 dark:text-amber-400 font-semibold text-xs flex items-center gap-1">
                        🍽️ Meal / F&B Inclusion (USD)
                      </FieldLabel>
                      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 text-[10px]">
                        F&B Portion
                      </Badge>
                    </div>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                        $
                      </span>
                      <Input
                        id="package-meal-price"
                        name="mealPriceUsd"
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-7 font-medium border-amber-500/30 focus-visible:ring-amber-500"
                        placeholder="0.00 (food component)"
                        value={mealPrice}
                        onChange={(e) => setMealPrice(e.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Separated on resort invoices for F&B allocation.
                    </p>
                  </Field>

                  {/* 6. Add-on Toggle Card */}
                  <div className="flex flex-col justify-between rounded-lg border border-border/60 bg-background/50 p-3 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        Add-on Feature
                      </span>
                      <Switch
                        id="package-addon-toggle"
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

                  {/* 7. Child Age Range */}
                  <Field className="sm:col-span-2 lg:col-span-3">
                    <FieldLabel htmlFor="package-age">Child age range (optional)</FieldLabel>
                    <Input id="package-age" name="childAgeRange" placeholder="e.g. 4–11 years (under 12y)" />
                  </Field>
                </div>
              ) : (
                <Field>
                  <FieldLabel htmlFor="package-age">Child age range (optional)</FieldLabel>
                  <Input id="package-age" name="childAgeRange" placeholder="e.g. 4–11 years" />
                </Field>
              )}
            </div>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="package-description">Description</FieldLabel>
              <Textarea id="package-description" name="description" />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="package-inclusions">Inclusions (one per line)</FieldLabel>
              <Textarea id="package-inclusions" name="inclusions" />
            </Field>
            <div className="md:col-span-2">
              <PackageImageField onChange={setImage} />
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending || !resortId}>
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Saving..." : "Save package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
