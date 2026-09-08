"use client";

import { type FormEvent, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Eye, MoreVertical, Pencil, ShieldCheck, Trash2, UserRoundCog } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

import type { PermissionDefinition, Role, RoleMember } from "./roles-table/data";

type DialogKind = "view" | "edit" | "permissions" | "members" | "archive" | null;

function accessLevelValue(value: string) {
  if (value === "Full") return "full";
  if (value === "Read only") return "read_only";
  return "scoped";
}

function displayBaseRole(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function RoleActions({
  role,
  permissions,
  members,
}: {
  role: Role;
  permissions: PermissionDefinition[];
  members: RoleMember[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [pending, setPending] = useState(false);
  const [accessLevel, setAccessLevel] = useState(accessLevelValue(role.accessLevel));
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role.permissionKeys);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.filter((member) => member.accessRoleId === role.id).map((member) => member.id),
  );

  const availablePermissions = useMemo(
    () => permissions.filter((permission) => permission.application === (role.baseRole === "admin" ? "admin" : "staff")),
    [permissions, role.baseRole],
  );
  const eligibleMembers = useMemo(
    () => members.filter((member) => member.baseRole === role.baseRole),
    [members, role.baseRole],
  );

  function openDialog(kind: DialogKind) {
    if (kind === "edit") setAccessLevel(accessLevelValue(role.accessLevel));
    if (kind === "permissions") setSelectedPermissions(role.permissionKeys);
    if (kind === "members") {
      setSelectedMembers(members.filter((member) => member.accessRoleId === role.id).map((member) => member.id));
    }
    setDialog(kind);
  }

  async function patchRole(body: Record<string, unknown>, successMessage: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Role could not be updated.");
      toast.success(successMessage);
      setDialog(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Role could not be updated.");
    } finally {
      setPending(false);
    }
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await patchRole(
      {
        action: "details",
        name: form.get("name"),
        description: form.get("description"),
        accessLevel,
      },
      `${role.role} was updated.`,
    );
  }

  async function duplicateRole() {
    setPending(true);
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${role.role} Copy`,
          description: role.description,
          baseRole: role.baseRole,
          accessLevel: accessLevelValue(role.accessLevel),
          permissionKeys: role.permissionKeys,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Role could not be duplicated.");
      toast.success(`${role.role} was duplicated.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Role could not be duplicated.");
    } finally {
      setPending(false);
    }
  }

  async function archiveRole() {
    setPending(true);
    try {
      const response = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Role could not be archived.");
      toast.success(`${role.role} was archived.`);
      setDialog(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Role could not be archived.");
    } finally {
      setPending(false);
    }
  }

  function togglePermission(key: string, checked: boolean) {
    setSelectedPermissions((current) =>
      checked ? [...new Set([...current, key])] : current.filter((permission) => permission !== key),
    );
  }

  function toggleMember(id: string, checked: boolean) {
    setSelectedMembers((current) => (checked ? [...new Set([...current, id])] : current.filter((item) => item !== id)));
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={`Actions for ${role.role}`}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end">
          <DropdownMenuGroup>
            {role.status === "Needs review" ? (
              <DropdownMenuItem onSelect={() => void patchRole({ action: "review" }, `${role.role} access was reviewed.`)}>
                <ShieldCheck />
                Review changes
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => openDialog("view")}>
              <Eye />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem disabled={role.isSystem} onSelect={() => openDialog("edit")}>
              <Pencil />
              Edit role
            </DropdownMenuItem>
            <DropdownMenuItem disabled={role.isSystem} onSelect={() => void duplicateRole()}>
              Duplicate role
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => openDialog("permissions")}>
              <ShieldCheck />
              Review permissions
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDialog("members")}>
              <UserRoundCog />
              Manage members
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={role.isSystem} variant="destructive" onSelect={() => openDialog("archive")}>
              <Trash2 />
              Archive role
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "view"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{role.role}</DialogTitle>
            <DialogDescription>{role.description || "No role description."}</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Base portal role</FieldLabel>
              <Input readOnly value={displayBaseRole(role.baseRole)} />
            </Field>
            <Field>
              <FieldLabel>Access level</FieldLabel>
              <Input readOnly value={role.accessLevel} />
            </Field>
            <Field>
              <FieldLabel>Members</FieldLabel>
              <Input readOnly value={`${role.users}`} />
            </Field>
            <Field>
              <FieldLabel>Owner</FieldLabel>
              <Input readOnly value={role.owner} />
            </Field>
          </FieldGroup>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-sm">Permission sets</span>
            <div className="flex flex-wrap gap-2">
              {role.permissionSets.length ? (
                role.permissionSets.map((permission) => (
                  <Badge key={permission} variant="outline" className="rounded-sm">
                    {permission}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">No permissions assigned.</span>
              )}
            </div>
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "edit"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-2xl">
          <form className="flex flex-col gap-4" onSubmit={saveDetails}>
            <DialogHeader>
              <DialogTitle>Edit role</DialogTitle>
              <DialogDescription>Update role details without changing its base portal assignment.</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`role-name-${role.id}`}>Role name</FieldLabel>
                <Input id={`role-name-${role.id}`} name="name" defaultValue={role.role} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`role-description-${role.id}`}>Description</FieldLabel>
                <Input id={`role-description-${role.id}`} name="description" defaultValue={role.description} />
              </Field>
              <Field>
                <FieldLabel>Access level</FieldLabel>
                <Select value={accessLevel} onValueChange={(value) => value && setAccessLevel(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="full">Full</SelectItem>
                      <SelectItem value="scoped">Scoped</SelectItem>
                      <SelectItem value="read_only">Read only</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner data-icon="inline-start" />}
                {pending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "permissions"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review permissions</DialogTitle>
            <DialogDescription>
              Select the backend modules available to {role.role}. Saving changes starts a new access review.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {availablePermissions.map((permission) => {
              const checkboxId = `permission-${role.id}-${permission.key}`;
              const required = role.isSystem && role.baseRole === "admin" && permission.key === "admin.roles";
              return (
                <label
                  key={permission.key}
                  htmlFor={checkboxId}
                  className="flex items-start gap-3 rounded-md border p-3 text-left"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={selectedPermissions.includes(permission.key)}
                    disabled={required || pending}
                    onCheckedChange={(checked) => togglePermission(permission.key, checked === true)}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium text-sm">{permission.name}</span>
                    <span className="text-muted-foreground text-xs">{permission.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                void patchRole(
                  { action: "permissions", permissionKeys: selectedPermissions },
                  `${role.role} permissions were updated.`,
                )
              }
            >
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Saving..." : "Save permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "members"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage members</DialogTitle>
            <DialogDescription>
              Assign {displayBaseRole(role.baseRole)} users to {role.role}. Base portal roles remain managed from Users.
              {role.isSystem
                ? " Members already assigned to a system role must be moved to a custom role instead of removed here."
                : " Removing a member returns them to the matching system role."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {eligibleMembers.length ? (
              eligibleMembers.map((member) => {
                const checkboxId = `member-${role.id}-${member.id}`;
                return (
                  <label
                    key={member.id}
                    htmlFor={checkboxId}
                    className="flex items-center gap-3 rounded-md border p-3 text-left"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={selectedMembers.includes(member.id)}
                      disabled={pending || (role.isSystem && member.accessRoleId === role.id)}
                      onCheckedChange={(checked) => toggleMember(member.id, checked === true)}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium text-sm">{member.name}</span>
                      <span className="truncate text-muted-foreground text-xs">{member.email}</span>
                    </span>
                    <Badge variant="outline" className="rounded-sm">
                      {member.status}
                    </Badge>
                  </label>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
                No users use this base portal role.
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                void patchRole({ action: "members", memberIds: selectedMembers }, `${role.role} members were updated.`)
              }
            >
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Saving..." : "Save members"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dialog === "archive"} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {role.role}?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived roles cannot be assigned. Move all members to another role before archiving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                void archiveRole();
              }}
            >
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Archiving..." : "Archive role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
