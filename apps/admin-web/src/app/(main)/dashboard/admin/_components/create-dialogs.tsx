"use client";

import { type FormEvent, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus } from "lucide-react";
import { toast } from "sonner";

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
  const [adultPrice, setAdultPrice] = useState("");
  const [childPrice, setChildPrice] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/package-types")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.packageTypes) && data.packageTypes.length > 0) {
            setPackageTypes(data.packageTypes);
          }
        })
        .catch(() => {});
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
    const finalAdultPrice = billing === "foc" ? "0" : (form.get("adultPriceUsd") ? String(form.get("adultPriceUsd")) : adultPrice);
    const finalChildPrice = billing === "foc" ? "0" : (form.get("childPriceUsd") ? String(form.get("childPriceUsd")) : (childPrice || null));
    const payload = new FormData(event.currentTarget);
    payload.set("packageType", packageType);
    payload.set("experienceType", experienceType);
    payload.set("resortId", resortId);
    payload.set("adultPriceUsd", finalAdultPrice || "0");
    if (finalChildPrice) payload.set("childPriceUsd", finalChildPrice);
    else payload.delete("childPriceUsd");
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
        if (next) setImage(undefined);
      }}
    >
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
                        handleAddNewType();
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
                    onClick={handleAddNewType}
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
            <Field className="md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <FieldLabel>Pricing / Rate</FieldLabel>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="xs"
                    variant={billing === "chargeable" ? "default" : "outline"}
                    className="h-6 text-xs"
                    onClick={() => {
                      setBilling("chargeable");
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
                    }}
                  >
                    FOC (Free of Charge)
                  </Button>
                </div>
              </div>
              {billing === "foc" ? (
                <div className="flex h-9 items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 font-medium text-emerald-600 text-sm dark:text-emerald-400">
                  <span>✓ FOC (Free of Charge)</span>
                  <span className="text-muted-foreground text-xs">$0.00 — Complimentary experience</span>
                </div>
              ) : null}
            </Field>
            {billing === "chargeable" ? (
              <>
                <Field>
                  <FieldLabel htmlFor="package-adult-price">Adult price (USD)</FieldLabel>
                  <Input
                    id="package-adult-price"
                    name="adultPriceUsd"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={adultPrice}
                    onChange={(e) => setAdultPrice(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="package-child-price">Child price (USD)</FieldLabel>
                  <Input
                    id="package-child-price"
                    name="childPriceUsd"
                    type="number"
                    min="0"
                    step="0.01"
                    value={childPrice}
                    onChange={(e) => setChildPrice(e.target.value)}
                  />
                </Field>
              </>
            ) : null}
            <Field>
              <FieldLabel htmlFor="package-age">Child age range</FieldLabel>
              <Input id="package-age" name="childAgeRange" />
            </Field>
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
