"use client";

import { useCallback, useEffect, useState } from "react";

import { Building2, KeyRound, MapPin, Save, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Account = {
  name: string;
  email: string;
  role: "internal" | "external";
  resortName: string | null;
  resortCode: string | null;
  resortLocation: string | null;
  accessRoleName: string | null;
  accessRoleLevel: string | null;
};

type Location = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  observationSpots: string;
};

function titleCase(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function SettingsPanel({
  account,
  readOnly,
  canManageSkySettings,
}: {
  account: Account;
  readOnly: boolean;
  canManageSkySettings: boolean;
}) {
  const [location, setLocation] = useState<Location | null>(null);
  const [spots, setSpots] = useState("");
  const [loading, setLoading] = useState(canManageSkySettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLocation = useCallback(async () => {
    if (!canManageSkySettings) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sky-settings", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load resort settings");
      setLocation(payload.location);
      setSpots(payload.location?.observationSpots ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load resort settings");
    } finally {
      setLoading(false);
    }
  }, [canManageSkySettings]);

  useEffect(() => {
    void loadLocation();
  }, [loadLocation]);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/sky-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ observationSpots: spots }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save resort settings");
      setLocation(payload.location);
      setSpots(payload.location?.observationSpots ?? "");
      toast.success("Observation spots saved");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to save resort settings");
    } finally {
      setSaving(false);
    }
  };

  let observationContent: React.ReactNode;
  if (loading) {
    observationContent = (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  } else if (error) {
    observationContent = (
      <Alert variant="destructive">
        <AlertTitle>Settings could not be loaded</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  } else {
    observationContent = (
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel>Timezone</FieldLabel>
            <Input value={location?.timezone ?? "—"} disabled />
          </Field>
          <Field>
            <FieldLabel>Latitude</FieldLabel>
            <Input value={location?.latitude ?? "—"} disabled />
          </Field>
          <Field>
            <FieldLabel>Longitude</FieldLabel>
            <Input value={location?.longitude ?? "—"} disabled />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="observation-spots">Observation spots</FieldLabel>
          <Textarea
            id="observation-spots"
            rows={4}
            value={spots}
            disabled={readOnly}
            onChange={(event) => setSpots(event.target.value)}
            placeholder="Beach deck, north jetty, rooftop"
          />
          <FieldDescription>Separate multiple spots with commas. Maximum 1,000 characters.</FieldDescription>
        </Field>
        {!readOnly ? (
          <div>
            <Button disabled={saving || spots === (location?.observationSpots ?? "")} onClick={() => void save()}>
              <Save /> {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        ) : null}
      </FieldGroup>
    );
  }

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Review your account access and assigned resort configuration.</p>
      </div>

      {readOnly ? (
        <Alert>
          <KeyRound />
          <AlertTitle>Read-only access</AlertTitle>
          <AlertDescription>
            Your access role allows you to view data, but changes must be made by an administrator.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4" /> Account
            </CardTitle>
            <CardDescription>Your identity is managed by the Ephemeris administrator.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="settings-name">Name</FieldLabel>
                <Input id="settings-name" value={account.name} disabled />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-email">Email</FieldLabel>
                <Input id="settings-email" type="email" value={account.email} disabled />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Staff type</FieldLabel>
                  <div>
                    <Badge variant="outline">{titleCase(account.role)}</Badge>
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Access role</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{account.accessRoleName ?? "System default"}</Badge>
                    {account.accessRoleLevel ? (
                      <Badge variant="outline">{titleCase(account.accessRoleLevel)}</Badge>
                    ) : null}
                  </div>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4" /> Assigned resort
            </CardTitle>
            <CardDescription>The property that scopes bookings, packages, and finance data.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="settings-resort">Resort</FieldLabel>
                <Input id="settings-resort" value={account.resortName ?? "Not assigned"} disabled />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-resort-code">Code</FieldLabel>
                <Input id="settings-resort-code" value={account.resortCode ?? "—"} disabled />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-resort-location">Location</FieldLabel>
                <Input id="settings-resort-location" value={account.resortLocation ?? "—"} disabled />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      {canManageSkySettings ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4" /> Observation settings
            </CardTitle>
            <CardDescription>
              These database-backed locations are offered when internal staff manage sky events.
            </CardDescription>
          </CardHeader>
          <CardContent>{observationContent}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
