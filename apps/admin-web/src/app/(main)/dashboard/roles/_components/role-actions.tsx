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
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
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
  readOnly,
}: {
  role: Role;
  permissions: PermissionDefinition[];
  members: RoleMember[];
  readOnly: boolean;
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
    () =>
      permissions.filter((permission) => permission.application === (role.baseRole === "admin" ? "admin" : "staff")),
    [permissions, role.baseRole],
  );
  const eligibleMembers = useMemo(
    () => members.filter((member) => member.baseRole === role.baseRole),
    [members, role.baseRole],
  );
  const permissionsChanged =
    selectedPermissions.length !== role.permissionKeys.length ||
    selectedPermissions.some((permission) => !role.permissionKeys.includes(permission));
  const initialMemberIds = members.filter((member) => member.accessRoleId === role.id).map((member) => member.id);
  const membersChanged =
    selectedMembers.length !== initialMemberIds.length ||
    selectedMembers.some((memberId) => !initialMemberIds.includes(memberId));

  function openDialog(kind: DialogKind) {
    if (kind === "edit") setAccessLevel(accessLevelValue(role.accessLevel));
    if (kind === "permissions") setSelectedPermissions(role.permissionKeys);
    if (kind === "members") {
      setSelectedMembers(members.filter((member) => member.accessRoleId === role.id).map((member) => member.id));
    }
    setDialog(kind);
  }

  async function patchRole(body: Record<string, unknown>, successMessage: string) {
    if (readOnly) return;
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
    if (readOnly) return;
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
    if (readOnly) return;
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
              <DropdownMenuItem
                disabled={readOnly}
                onSelect={() => void patchRole({ action: "review" }, `${role.role} access was reviewed.`)}
              >
                <ShieldCheck />
                Review changes
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => openDialog("view")}>
              <Eye />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem disabled={readOnly} onSelect={() => openDialog("edit")}>
              <Pencil />
              Edit role
            </DropdownMenuItem>
            <DropdownMenuItem disabled={readOnly || role.isSystem} onSelect={() => void duplicateRole()}>
              Duplicate role
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={readOnly} onSelect={() => openDialog("permissions")}>
              <ShieldCheck />
              Review permissions
            </DropdownMenuItem>
            <DropdownMenuItem disabled={readOnly} onSelect={() => openDialog("members")}>
              <UserRoundCog />
              Manage members
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={readOnly || role.isSystem}
              variant="destructive"
              onSelect={() => openDialog("archive")}
            >
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
              <FieldLabel htmlFor={`view-role-base-${role.id}`}>Base portal role</FieldLabel>
              <Input id={`view-role-base-${role.id}`} readOnly value={displayBaseRole(role.baseRole)} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`view-role-access-${role.id}`}>Access level</FieldLabel>
              <Input id={`view-role-access-${role.id}`} readOnly value={role.accessLevel} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`view-role-members-${role.id}`}>Members</FieldLabel>
              <Input id={`view-role-members-${role.id}`} readOnly value={`${role.users}`} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`view-role-owner-${role.id}`}>Owner</FieldLabel>
              <Input id={`view-role-owner-${role.id}`} readOnly value={role.owner} />
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
                <FieldLabel htmlFor={`role-access-${role.id}`}>Access level</FieldLabel>
                <Select value={accessLevel} onValueChange={(value) => value && setAccessLevel(value)}>
                  <SelectTrigger id={`role-access-${role.id}`} className="w-full">
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
          <FieldSet>
            <FieldLegend variant="label">Permissions</FieldLegend>
            <FieldGroup className="gap-2">
              {availablePermissions.map((permission) => {
                const checkboxId = `permission-${role.id}-${permission.key}`;
                return (
                  <Field
                    key={permission.key}
                    orientation="horizontal"
                    data-disabled={pending}
                    className="flex items-start gap-3 rounded-md border p-3 text-left"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={selectedPermissions.includes(permission.key)}
                      disabled={pending}
                      onCheckedChange={(checked) => togglePermission(permission.key, checked === true)}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor={checkboxId}>{permission.name}</FieldLabel>
                      <FieldDescription>{permission.description}</FieldDescription>
                    </FieldContent>
                  </Field>
                );
              })}
            </FieldGroup>
          </FieldSet>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={pending || !permissionsChanged}
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
          <FieldSet>
            <FieldLegend variant="label">Members</FieldLegend>
            <FieldGroup className="gap-2">
              {eligibleMembers.length ? (
                eligibleMembers.map((member) => {
                  const checkboxId = `member-${role.id}-${member.id}`;
                  const memberLocked = pending || (role.isSystem && member.accessRoleId === role.id);
                  return (
                    <Field
                      key={member.id}
                      orientation="horizontal"
                      data-disabled={memberLocked}
                      className="flex items-center gap-3 rounded-md border p-3 text-left"
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={selectedMembers.includes(member.id)}
                        disabled={memberLocked}
                        onCheckedChange={(checked) => toggleMember(member.id, checked === true)}
                      />
                      <FieldContent className="min-w-0">
                        <FieldLabel className="truncate" htmlFor={checkboxId}>
                          {member.name}
                        </FieldLabel>
                        <FieldDescription className="truncate">{member.email}</FieldDescription>
                      </FieldContent>
                      <Badge variant="outline" className="rounded-sm">
                        {member.status}
                      </Badge>
                    </Field>
                  );
                })
              ) : (
                <Empty className="min-h-32">
                  <EmptyHeader>
                    <EmptyTitle>No eligible users</EmptyTitle>
                    <EmptyDescription>No users use this base portal role.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </FieldGroup>
          </FieldSet>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={pending || !membersChanged}
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
