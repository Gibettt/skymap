"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, Building2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { StaffRole } from "@/navigation/sidebar/sidebar-items";

const formSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type FormValues = z.infer<typeof formSchema>;

interface LoginResponse {
  error?: string;
  user?: {
    role?: string;
  };
}

function isStaffRole(role: string | undefined): role is StaffRole {
  return role === "internal" || role === "external";
}

export function StaffLoginForm() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = React.useState<StaffRole>("internal");
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await response.json().catch(() => ({}))) as LoginResponse;

      if (!response.ok) {
        toast.error(result.error ?? "Login failed. Check your email and password.");
        return;
      }

      const authenticatedRole = result.user?.role;
      if (!isStaffRole(authenticatedRole)) {
        await fetch("/api/auth/logout", { method: "POST" });
        toast.error("This account cannot access the staff portal.");
        return;
      }

      if (authenticatedRole !== selectedRole) {
        await fetch("/api/auth/logout", { method: "POST" });
        toast.error(
          `This is an ${authenticatedRole} staff account. Select the ${authenticatedRole} portal and try again.`,
        );
        return;
      }

      toast.success("Login successful.");
      router.replace(`/dashboard/${authenticatedRole}`);
      router.refresh();
    } catch {
      toast.error("The staff portal could not be reached. Please try again.");
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldSet>
        <FieldLegend variant="label">Staff portal</FieldLegend>
        <ToggleGroup
          type="single"
          variant="outline"
          value={selectedRole}
          onValueChange={(value) => {
            if (isStaffRole(value)) setSelectedRole(value);
          }}
          className="grid w-full grid-cols-2 gap-2"
          aria-label="Choose staff portal"
        >
          <ToggleGroupItem value="internal" className="h-11 min-w-0 w-full px-2 sm:px-3" aria-label="Internal staff portal">
            <BriefcaseBusiness />
            Internal
          </ToggleGroupItem>
          <ToggleGroupItem value="external" className="h-11 min-w-0 w-full px-2 sm:px-3" aria-label="External staff portal">
            <Building2 />
            External
          </ToggleGroupItem>
        </ToggleGroup>
        <FieldDescription>
          {selectedRole === "internal"
            ? "For resort operations staff who manage schedules and guest experiences."
            : "For partner resort staff who create bookings and track their payouts."}
        </FieldDescription>
      </FieldSet>

      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="staff-email">Email Address</FieldLabel>
              <Input
                {...field}
                id="staff-email"
                type="email"
                placeholder={selectedRole === "internal" ? "internal@ephemeris.id" : "external@ephemeris.id"}
                autoComplete="email"
                aria-invalid={fieldState.invalid}
                className="h-11 text-base sm:text-sm"
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="staff-password">Password</FieldLabel>
              <Input
                {...field}
                id="staff-password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
                className="h-11 text-base sm:text-sm"
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      </FieldGroup>

      <Button className="h-11 w-full text-sm" type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Spinner data-icon="inline-start" /> : null}
        {form.formState.isSubmitting ? "Signing in..." : `Login as ${selectedRole} staff`}
      </Button>

      {selectedRole === "external" ? (
        <p className="text-center text-muted-foreground text-sm">
          New partner staff?{" "}
          <Link
            prefetch={false}
            href="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Request an account
          </Link>
        </p>
      ) : null}
    </form>
  );
}
