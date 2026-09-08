"use client";

import { type FormEvent, useState } from "react";

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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

interface ResortOption {
  id: string;
  name: string;
  status?: string;
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

export function CreatePackageDialog({ resorts }: { resorts: ResortOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [packageType, setPackageType] = useState("regular");
  const [experienceType, setExperienceType] = useState("communal");
  const [resortId, setResortId] = useState(resorts[0]?.id ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const inclusions = String(form.get("inclusions") ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const childPriceUsd = form.get("childPriceUsd");
    setPending(true);
    try {
      await postJson(
        "/api/packages",
        {
          name: form.get("name"),
          packageType,
          experienceType,
          location: form.get("location"),
          description: form.get("description"),
          schedule: form.get("schedule"),
          resortId,
          adultPriceUsd: form.get("adultPriceUsd"),
          childPriceUsd: childPriceUsd === "" ? null : childPriceUsd,
          childAgeRange: form.get("childAgeRange"),
          inclusions,
          isChargeable: true,
          isActive: true,
        },
        "Package data could not be saved.",
      );
      toast.success("Package added.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The package could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!resorts.length}>
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
              <FieldLabel>Package type</FieldLabel>
              <Select value={packageType} onValueChange={(value) => value && setPackageType(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="kids">Kids</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
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
            <Field>
              <FieldLabel htmlFor="package-adult-price">Adult price (USD)</FieldLabel>
              <Input id="package-adult-price" name="adultPriceUsd" type="number" min="0" step="0.01" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="package-child-price">Child price (USD)</FieldLabel>
              <Input id="package-child-price" name="childPriceUsd" type="number" min="0" step="0.01" />
            </Field>
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
