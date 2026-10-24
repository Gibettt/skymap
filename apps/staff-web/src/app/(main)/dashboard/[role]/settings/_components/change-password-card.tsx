"use client";

import { type FormEvent, useState } from "react";

import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function ChangePasswordCard() {
  const [pending, setPending] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword !== String(form.get("confirmPassword") ?? "")) {
      toast.error("The two new passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: String(form.get("currentPassword") ?? ""), newPassword }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your password could not be changed.");

      formElement.reset();
      toast.success("Your password was changed. Use the new password next time you sign in.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your password could not be changed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" /> Change password
        </CardTitle>
        <CardDescription>Choose a password you do not use anywhere else.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={changePassword}>
          <FieldGroup className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="settings-current-password">Current password</FieldLabel>
              <Input
                id="settings-current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                maxLength={128}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-new-password">New password</FieldLabel>
              <Input
                id="settings-new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-confirm-password">Confirm new password</FieldLabel>
              <Input
                id="settings-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
            </Field>
            <div className="md:col-span-3">
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : <KeyRound data-icon="inline-start" />}
                {pending ? "Saving..." : "Change password"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
