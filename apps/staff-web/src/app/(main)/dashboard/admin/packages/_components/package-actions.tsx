"use client";

import { type FormEvent, useState } from "react";

import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

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

  function openEditDialog() {
    setPackageType(packageData.package_type);
    setExperienceType(packageData.experience_type);
    setResortId(packageData.resort_id ?? resorts[0]?.id ?? "");
    setStatus(packageData.is_active ? "active" : "inactive");
    setBilling(packageData.is_chargeable ? "chargeable" : "complimentary");
    setEditOpen(true);
  }

  async function updatePackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const childPriceUsd = form.get("childPriceUsd");
    const inclusions = String(form.get("inclusions") ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    setEditPending(true);
    try {
      const response = await fetch(`/api/packages/${packageData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          isChargeable: billing === "chargeable",
          isActive: status === "active",
        }),
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
              <Field>
                <FieldLabel htmlFor={fieldId("edit-package-adult-price")}>Adult price (USD)</FieldLabel>
                <Input
                  id={fieldId("edit-package-adult-price")}
                  name="adultPriceUsd"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={numberValue(packageData.adult_price_usd)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("edit-package-child-price")}>Child price (USD)</FieldLabel>
                <Input
                  id={fieldId("edit-package-child-price")}
                  name="childPriceUsd"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={packageData.child_price_usd == null ? "" : numberValue(packageData.child_price_usd)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("edit-package-age-range")}>Child age range</FieldLabel>
                <Input
                  id={fieldId("edit-package-age-range")}
                  name="childAgeRange"
                  defaultValue={packageData.child_age_range ?? ""}
                />
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
              <Field>
                <FieldLabel>Billing</FieldLabel>
                <Select value={billing} onValueChange={(value) => value && setBilling(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="chargeable">Chargeable</SelectItem>
                      <SelectItem value="complimentary">Complimentary</SelectItem>
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
