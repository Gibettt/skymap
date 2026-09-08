"use client";

import { type FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

import type { UserRow } from "../../_lib/admin-data";
import { titleCase } from "../../_lib/format";

export interface UserResortOption {
  id: string;
  name: string;
}

interface UserActionsProps {
  user: UserRow;
  resorts: UserResortOption[];
}

function formatUserDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function UserActions({ user, resorts }: UserActionsProps) {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [resortId, setResortId] = useState(user.resort_id ?? "");

  function openEditDialog() {
    setRole(user.role);
    setStatus(user.status);
    setResortId(user.resort_id ?? "");
    setEditOpen(true);
  }

  async function updateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setEditPending(true);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: String(form.get("phone") ?? "").trim() || null,
          role,
          status,
          resortId: role === "admin" ? null : resortId,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "User could not be updated.");

      toast.success(`${user.name} was updated.`);
      setEditOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "User could not be updated.");
    } finally {
      setEditPending(false);
    }
  }

  async function deleteUser() {
    setDeletePending(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "User could not be deleted.");

      toast.success(`${user.name} was deleted.`);
      setDeleteOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "User could not be deleted.");
    } finally {
      setDeletePending(false);
    }
  }

  const fieldId = (name: string) => `${name}-${user.id}`;
  const lastActivity = user.last_active_at ?? user.last_seen_at;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="size-8 rounded-md text-muted-foreground hover:bg-muted/50"
            size="icon-sm"
            variant="ghost"
            disabled={editPending || deletePending}
            aria-label={`Actions for ${user.name}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuLabel>User actions</DropdownMenuLabel>
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
            <DialogTitle>{user.name}</DialogTitle>
            <DialogDescription>User details from the active PostgreSQL database.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input readOnly value={user.email} />
            </Field>
            <Field>
              <FieldLabel>Phone</FieldLabel>
              <Input readOnly value={user.phone ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Input readOnly value={titleCase(user.role)} />
            </Field>
            <Field>
              <FieldLabel>Resort</FieldLabel>
              <Input readOnly value={user.resort_name ?? "Unassigned"} />
            </Field>
            <Field>
              <FieldLabel>Account status</FieldLabel>
              <div>
                <Badge variant={user.status === "active" ? "default" : "secondary"}>
                  {titleCase(user.status)}
                </Badge>
              </div>
            </Field>
            <Field>
              <FieldLabel>Presence</FieldLabel>
              <Input readOnly value={user.presence ? titleCase(user.presence) : "Not tracked"} />
            </Field>
            <Field>
              <FieldLabel>Assigned bookings</FieldLabel>
              <Input readOnly value={`${user.total_booking}`} />
            </Field>
            <Field>
              <FieldLabel>Last activity</FieldLabel>
              <Input readOnly value={formatUserDateTime(lastActivity)} />
            </Field>
            <Field>
              <FieldLabel>Joined</FieldLabel>
              <Input readOnly value={formatUserDateTime(user.created_at)} />
            </Field>
            <Field>
              <FieldLabel>Last updated</FieldLabel>
              <Input readOnly value={formatUserDateTime(user.updated_at)} />
            </Field>
          </FieldGroup>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={updateUser} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Edit user</DialogTitle>
              <DialogDescription>Update the account profile, access, status, and resort assignment.</DialogDescription>
            </DialogHeader>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={fieldId("edit-user-name")}>Name</FieldLabel>
                <Input id={fieldId("edit-user-name")} name="name" defaultValue={user.name} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("edit-user-email")}>Email</FieldLabel>
                <Input
                  id={fieldId("edit-user-email")}
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("edit-user-phone")}>Phone</FieldLabel>
                <Input id={fieldId("edit-user-phone")} name="phone" defaultValue={user.phone ?? ""} />
              </Field>
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Select value={role} onValueChange={(value) => value && setRole(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="admin">Admin</SelectItem>
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
              <Field>
                <FieldLabel>Resort</FieldLabel>
                <Select
                  value={resortId || "unassigned"}
                  onValueChange={(value) => value && value !== "unassigned" && setResortId(value)}
                  disabled={role === "admin"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select resort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="unassigned" disabled>
                        {role === "admin" ? "Not required for admins" : "Select resort"}
                      </SelectItem>
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
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={editPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={editPending || (role !== "admin" && !resortId)}>
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
            <AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the account. Users linked to bookings or operational history cannot be deleted;
              set them to inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={(event) => {
                event.preventDefault();
                void deleteUser();
              }}
            >
              {deletePending && <Spinner data-icon="inline-start" />}
              {deletePending ? "Deleting..." : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
