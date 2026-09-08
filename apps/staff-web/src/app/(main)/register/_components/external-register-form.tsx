"use client";

import * as React from "react";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { Clock3 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

const formSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(200, "Name is too long."),
    email: z.email("Please enter a valid email address."),
    phone: z.string().trim().max(40, "Phone number is too long."),
    resortId: z.string().uuid("Choose your partner resort."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

interface ResortOption {
  id: string;
  name: string;
  code: string;
  location: string | null;
}

interface RegisterResponse {
  error?: string;
  registrationStatus?: string;
  user?: {
    email?: string;
  };
}

export function ExternalRegisterForm() {
  const [resorts, setResorts] = React.useState<ResortOption[]>([]);
  const [loadingResorts, setLoadingResorts] = React.useState(true);
  const [optionsError, setOptionsError] = React.useState<string | null>(null);
  const [optionsVersion, setOptionsVersion] = React.useState(0);
  const [registeredEmail, setRegisteredEmail] = React.useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      resortId: "",
      password: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadResorts() {
      setLoadingResorts(true);
      setOptionsError(null);
      try {
        const endpoint = optionsVersion ? `/api/auth/register?retry=${optionsVersion}` : "/api/auth/register";
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json().catch(() => ({}))) as { error?: string; resorts?: ResortOption[] };
        if (!response.ok) throw new Error(result.error ?? "Unable to load partner resorts.");
        setResorts(Array.isArray(result.resorts) ? result.resorts : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setOptionsError(error instanceof Error ? error.message : "Unable to load partner resorts.");
      } finally {
        if (!controller.signal.aborted) setLoadingResorts(false);
      }
    }

    void loadResorts();
    return () => controller.abort();
  }, [optionsVersion]);

  async function onSubmit(values: FormValues) {
    try {
      const phone = values.phone.trim();
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          ...(phone ? { phone } : {}),
          resortId: values.resortId,
          password: values.password,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as RegisterResponse;

      if (!response.ok) {
        if (response.status === 409) {
          form.setError("email", { message: result.error ?? "An account already uses this email address." });
          return;
        }
        toast.error(result.error ?? "Registration could not be submitted.");
        return;
      }

      setRegisteredEmail(result.user?.email ?? values.email.trim().toLowerCase());
      toast.success("Registration submitted for approval.");
    } catch {
      toast.error("The registration service could not be reached. Please try again.");
    }
  }

  if (registeredEmail) {
    return (
      <Empty className="rounded-xl border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Clock3 />
          </EmptyMedia>
          <EmptyTitle>Registration pending approval</EmptyTitle>
          <EmptyDescription>
            We received the request for {registeredEmail}. An administrator must activate the external staff account
            before it can sign in.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" asChild>
          <Link href="/login">Return to login</Link>
        </Button>
      </Empty>
    );
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="external-name">Full name</FieldLabel>
              <Input
                {...field}
                id="external-name"
                placeholder="Your full name"
                autoComplete="name"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="external-email">Work email</FieldLabel>
              <Input
                {...field}
                id="external-email"
                type="email"
                placeholder="you@partner-resort.com"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="external-phone">Phone number (optional)</FieldLabel>
              <Input
                {...field}
                id="external-phone"
                type="tel"
                placeholder="+960 700 0000"
                autoComplete="tel"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="resortId"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid || Boolean(optionsError)}>
              <FieldLabel htmlFor="external-resort">Partner resort</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={loadingResorts || !resorts.length}>
                <SelectTrigger id="external-resort" className="w-full" aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder={loadingResorts ? "Loading resorts..." : "Choose your resort"} />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    <SelectLabel>Active partner resorts</SelectLabel>
                    {resorts.map((resort) => (
                      <SelectItem key={resort.id} value={resort.id}>
                        {resort.name} · {resort.code}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              {optionsError ? (
                <div className="flex items-center justify-between gap-3">
                  <FieldError>{optionsError}</FieldError>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setOptionsVersion((value) => value + 1)}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <FieldDescription>Your account will be scoped to this resort after approval.</FieldDescription>
              )}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="external-password">Password</FieldLabel>
              <Input
                {...field}
                id="external-password"
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="external-confirm-password">Confirm password</FieldLabel>
              <Input
                {...field}
                id="external-confirm-password"
                type="password"
                placeholder="Repeat your password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      </FieldGroup>

      <Button
        className="w-full"
        type="submit"
        disabled={form.formState.isSubmitting || loadingResorts || !resorts.length}
      >
        {form.formState.isSubmitting ? <Spinner data-icon="inline-start" /> : null}
        {form.formState.isSubmitting ? "Submitting request..." : "Request external staff account"}
      </Button>
    </form>
  );
}
