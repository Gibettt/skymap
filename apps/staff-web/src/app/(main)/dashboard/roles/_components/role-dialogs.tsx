"use client";

import { type ChangeEvent, type FormEvent, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { FileUp } from "lucide-react";
import { toast } from "sonner";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

import type { PermissionDefinition } from "./roles-table/data";

export function CreateRoleDialog({ permissions }: { permissions: PermissionDefinition[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [baseRole, setBaseRole] = useState("admin");
  const [accessLevel, setAccessLevel] = useState("scoped");
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const application = baseRole === "admin" ? "admin" : "staff";

  function changeBaseRole(value: string) {
    setBaseRole(value);
    setPermissionKeys([]);
  }

  function togglePermission(key: string, checked: boolean) {
    setPermissionKeys((current) =>
      checked ? [...new Set([...current, key])] : current.filter((permission) => permission !== key),
    );
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
          baseRole,
          accessLevel,
          permissionKeys,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Role could not be created.");
      toast.success("Role was created.");
      setOpen(false);
      setBaseRole("admin");
      setAccessLevel("scoped");
      setPermissionKeys([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Role could not be created.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Create role</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form className="flex flex-col gap-4" onSubmit={createRole}>
          <DialogHeader>
            <DialogTitle>Create role</DialogTitle>
            <DialogDescription>Create a permission profile while preserving the existing portal role model.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="create-role-name">Role name</FieldLabel>
              <Input id="create-role-name" name="name" required />
            </Field>
            <Field>
              <FieldLabel>Base portal role</FieldLabel>
              <Select value={baseRole} onValueChange={(value) => value && changeBaseRole(value)}>
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
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="create-role-description">Description</FieldLabel>
              <Input id="create-role-description" name="description" />
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
          <div className="grid gap-2">
            <span className="font-medium text-sm">Permissions</span>
            {permissions
              .filter((permission) => permission.application === application)
              .map((permission) => (
                <label
                  key={permission.key}
                  htmlFor={`permission-${permission.key}`}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <Checkbox
                    id={`permission-${permission.key}`}
                    checked={permissionKeys.includes(permission.key)}
                    onCheckedChange={(checked) => togglePermission(permission.key, checked === true)}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{permission.name}</span>
                    <span className="text-muted-foreground text-xs">{permission.description}</span>
                  </span>
                </label>
              ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Creating..." : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ImportRolesButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  async function importRoles(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPending(true);
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const body = Array.isArray(parsed) ? { roles: parsed } : parsed;
      const response = await fetch("/api/roles/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; roles?: unknown[] };
      if (!response.ok) throw new Error(result.error ?? "Roles could not be imported.");
      toast.success(`${result.roles?.length ?? 0} role(s) imported.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The selected file is not valid JSON.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <input ref={inputRef} className="hidden" type="file" accept="application/json,.json" onChange={importRoles} />
      <Button size="sm" variant="outline" disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? <Spinner data-icon="inline-start" /> : <FileUp data-icon="inline-start" />}
        {pending ? "Importing..." : "Import JSON"}
      </Button>
    </>
  );
}
