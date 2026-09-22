"use client";

import { useCallback, useEffect, useState } from "react";

import { Building2, Globe2, KeyRound, MapPin, Save, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import {
  ResortProfileImageField,
  type ResortProfileImageValue,
} from "./resort-profile-image-field";

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

type PublicProfile = {
  id: string;
  name: string;
  code: string;
  slug: string | null;
  location: string;
  publicDescription: string;
  contactEmail: string;
  whatsappNumber: string;
  hasImage: boolean;
  imageFileName: string | null;
  imageUrl: string | null;
};

type PublicProfileForm = Pick<
  PublicProfile,
  "location" | "publicDescription" | "contactEmail" | "whatsappNumber"
>;

const emptyPublicProfileForm: PublicProfileForm = {
  location: "",
  publicDescription: "",
  contactEmail: "",
  whatsappNumber: "",
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
  canManagePublicProfile,
}: {
  account: Account;
  readOnly: boolean;
  canManageSkySettings: boolean;
  canManagePublicProfile: boolean;
}) {
  const [location, setLocation] = useState<Location | null>(null);
  const [spots, setSpots] = useState("");
  const [loading, setLoading] = useState(canManageSkySettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [publicProfileForm, setPublicProfileForm] = useState<PublicProfileForm>(emptyPublicProfileForm);
  const [publicProfileImage, setPublicProfileImage] = useState<ResortProfileImageValue>(undefined);
  const [publicProfileLoading, setPublicProfileLoading] = useState(canManagePublicProfile);
  const [publicProfileSaving, setPublicProfileSaving] = useState(false);
  const [publicProfileError, setPublicProfileError] = useState<string | null>(null);

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

  const loadPublicProfile = useCallback(async () => {
    if (!canManagePublicProfile) return;
    setPublicProfileLoading(true);
    setPublicProfileError(null);
    try {
      const response = await fetch("/api/public-resort-profile", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load public resort profile");
      const nextProfile = payload.profile as PublicProfile;
      setPublicProfile(nextProfile);
      setPublicProfileForm({
        location: nextProfile.location,
        publicDescription: nextProfile.publicDescription,
        contactEmail: nextProfile.contactEmail,
        whatsappNumber: nextProfile.whatsappNumber,
      });
      setPublicProfileImage(undefined);
    } catch (loadError) {
      setPublicProfileError(loadError instanceof Error ? loadError.message : "Unable to load public resort profile");
    } finally {
      setPublicProfileLoading(false);
    }
  }, [canManagePublicProfile]);

  useEffect(() => {
    void loadLocation();
    void loadPublicProfile();
  }, [loadLocation, loadPublicProfile]);

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

  const updatePublicProfileField = (field: keyof PublicProfileForm, value: string) => {
    setPublicProfileForm((current) => ({ ...current, [field]: value }));
  };

  const savePublicProfile = async () => {
    setPublicProfileSaving(true);
    try {
      const response = await fetch("/api/public-resort-profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(publicProfileForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save public resort profile");

      let nextProfile = payload.profile as PublicProfile;
      if (publicProfileImage instanceof File) {
        const formData = new FormData();
        formData.set("image", publicProfileImage);
        const imageResponse = await fetch("/api/public-resort-profile/image", { method: "PUT", body: formData });
        const imagePayload = await imageResponse.json();
        if (!imageResponse.ok) throw new Error(imagePayload.error ?? "Unable to upload the resort image");
        nextProfile = {
          ...nextProfile,
          hasImage: true,
          imageFileName: imagePayload.imageFileName,
          imageUrl: imagePayload.imageUrl,
        };
      } else if (publicProfileImage === null && publicProfile?.hasImage) {
        const imageResponse = await fetch("/api/public-resort-profile/image", { method: "DELETE" });
        const imagePayload = await imageResponse.json();
        if (!imageResponse.ok) throw new Error(imagePayload.error ?? "Unable to remove the resort image");
        nextProfile = { ...nextProfile, hasImage: false, imageFileName: null, imageUrl: null };
      }

      setPublicProfile(nextProfile);
      setPublicProfileForm({
        location: nextProfile.location,
        publicDescription: nextProfile.publicDescription,
        contactEmail: nextProfile.contactEmail,
        whatsappNumber: nextProfile.whatsappNumber,
      });
      setPublicProfileImage(undefined);
      toast.success("Public resort profile saved");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to save public resort profile");
    } finally {
      setPublicProfileSaving(false);
    }
  };

  const publicProfileChanged = Boolean(
    publicProfile &&
      (publicProfileForm.location !== publicProfile.location ||
        publicProfileForm.publicDescription !== publicProfile.publicDescription ||
        publicProfileForm.contactEmail !== publicProfile.contactEmail ||
        publicProfileForm.whatsappNumber !== publicProfile.whatsappNumber ||
        publicProfileImage !== undefined),
  );

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

  let publicProfileContent: React.ReactNode;
  if (publicProfileLoading) {
    publicProfileContent = (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  } else if (publicProfileError) {
    publicProfileContent = (
      <Alert variant="destructive">
        <AlertTitle>Public profile could not be loaded</AlertTitle>
        <AlertDescription>{publicProfileError}</AlertDescription>
      </Alert>
    );
  } else if (publicProfile) {
    publicProfileContent = (
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="public-resort-name">Resort</FieldLabel>
            <Input id="public-resort-name" value={publicProfile.name} disabled />
          </Field>
          <Field>
            <FieldLabel htmlFor="public-resort-slug">Public URL</FieldLabel>
            <Input
              id="public-resort-slug"
              value={publicProfile.slug ? `/resorts/${publicProfile.slug}` : "Not published"}
              disabled
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="public-resort-location">Public location</FieldLabel>
          <Input
            id="public-resort-location"
            value={publicProfileForm.location}
            disabled={readOnly}
            maxLength={200}
            onChange={(event) => updatePublicProfileField("location", event.target.value)}
            placeholder="Thilamaafushi, Maldives"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="public-resort-description">Public description</FieldLabel>
          <Textarea
            id="public-resort-description"
            rows={4}
            value={publicProfileForm.publicDescription}
            disabled={readOnly}
            maxLength={600}
            onChange={(event) => updatePublicProfileField("publicDescription", event.target.value)}
            placeholder="Describe the island observatory and guest experience."
          />
          <FieldDescription>{publicProfileForm.publicDescription.length}/600 characters. Shown on the landing resort card and resort page.</FieldDescription>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="public-resort-email">Contact email</FieldLabel>
            <Input
              id="public-resort-email"
              type="email"
              value={publicProfileForm.contactEmail}
              disabled={readOnly}
              maxLength={254}
              onChange={(event) => updatePublicProfileField("contactEmail", event.target.value)}
              placeholder="concierge@example.com"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="public-resort-whatsapp">WhatsApp number</FieldLabel>
            <Input
              id="public-resort-whatsapp"
              value={publicProfileForm.whatsappNumber}
              disabled={readOnly}
              maxLength={40}
              onChange={(event) => updatePublicProfileField("whatsappNumber", event.target.value)}
              placeholder="9600000100"
            />
            <FieldDescription>Use the international number without a leading plus sign.</FieldDescription>
          </Field>
        </div>
        <ResortProfileImageField
          currentImageUrl={publicProfile.imageUrl}
          currentFileName={publicProfile.imageFileName}
          value={publicProfileImage}
          disabled={readOnly}
          onChange={setPublicProfileImage}
        />
        {!readOnly ? (
          <div>
            <Button disabled={publicProfileSaving || !publicProfileChanged} onClick={() => void savePublicProfile()}>
              <Save /> {publicProfileSaving ? "Saving…" : "Save public profile"}
            </Button>
          </div>
        ) : null}
      </FieldGroup>
    );
  } else {
    publicProfileContent = null;
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
            <CardDescription>Your identity is managed by the SpaceCat ASTROTOURISM administrator.</CardDescription>
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

      {canManagePublicProfile ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="size-4" /> Public resort profile
            </CardTitle>
            <CardDescription>
              Control the location, introduction, contact details, and cover image shown to guests on the public website.
            </CardDescription>
          </CardHeader>
          <CardContent>{publicProfileContent}</CardContent>
        </Card>
      ) : null}

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
