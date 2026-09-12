"use client";

import * as React from "react";

import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Check,
  Dot,
  Info,
  Package,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  formatUsd,
  packageInclusions,
  type StaffBooking,
  type StaffPackage,
  type StaffRole,
  type StaffUser,
  staffApi,
} from "../../_lib/staff-api";

interface PackagesResponse {
  packages: StaffPackage[];
}

interface MeResponse {
  user: StaffUser;
}

const BOOKING_FIELD_SKELETONS = [
  "guest-name",
  "guest-phone",
  "guest-email",
  "room",
  "nationality",
  "language",
  "package",
  "date",
  "start-time",
  "end-time",
];

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function normalizePackage(item: StaffPackage): StaffPackage {
  return {
    ...item,
    adult_price_usd: Number(item.adult_price_usd),
    child_price_usd: item.child_price_usd == null ? null : Number(item.child_price_usd),
    is_chargeable: Boolean(item.is_chargeable),
    is_active: Boolean(item.is_active),
    has_image: Boolean(item.has_image),
  };
}

function BookingFormLoading() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          {BOOKING_FIELD_SKELETONS.map((item) => (
            <Skeleton key={item} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

interface NewBookingFormProps {
  role: StaffRole;
  onCreated: (booking: StaffBooking) => void | Promise<void>;
  onCancel: () => void;
}

interface BookingParticipantDraft {
  clientId: string;
  fullName: string;
  type: "adult" | "child";
  age: string;
  nationality: string;
  notes: string;
}

interface BookingExperienceDraft {
  clientId: string;
  packageId: string;
  eventDate: string;
  timeStart: string;
  timeEnd: string;
  observationSpot: string;
}

type BookingStep = 1 | 2 | 3;

const BOOKING_STEPS: Array<{ value: BookingStep; label: string }> = [
  { value: 1, label: "Contact" },
  { value: 2, label: "Participants & experiences" },
  { value: 3, label: "Preferences" },
];

function createParticipant(index: number): BookingParticipantDraft {
  return {
    clientId: `participant-${index}`,
    fullName: "",
    type: "adult",
    age: "",
    nationality: "",
    notes: "",
  };
}

function createExperience(index: number, packageId = ""): BookingExperienceDraft {
  return {
    clientId: `experience-${index}`,
    packageId,
    eventDate: tomorrowDate(),
    timeStart: "21:00",
    timeEnd: "22:00",
    observationSpot: "",
  };
}

export function NewBookingForm({ role, onCreated, onCancel }: NewBookingFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [user, setUser] = React.useState<StaffUser | null>(null);
  const [packages, setPackages] = React.useState<StaffPackage[]>([]);
  const [preferredLanguage, setPreferredLanguage] = React.useState("English");
  const [bookingSource, setBookingSource] = React.useState("WhatsApp");
  const [paymentMethod, setPaymentMethod] = React.useState("Bank transfer");
  const participantSequence = React.useRef(1);
  const [participants, setParticipants] = React.useState<BookingParticipantDraft[]>(() => [createParticipant(0)]);
  const experienceSequence = React.useRef(1);
  const [experiences, setExperiences] = React.useState<BookingExperienceDraft[]>(() => [createExperience(0)]);
  const [currentStep, setCurrentStep] = React.useState<BookingStep>(1);
  const [highestStep, setHighestStep] = React.useState<BookingStep>(1);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;

    async function loadForm() {
      try {
        const [me, packageData] = await Promise.all([
          staffApi<MeResponse>("/api/me", { cache: "no-store" }),
          staffApi<PackagesResponse>("/api/packages", { cache: "no-store" }),
        ]);
        if (!active) return;
        const normalized = packageData.packages.map(normalizePackage);
        setUser(me.user);
        setPackages(normalized);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to prepare the booking form.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadForm();
    return () => {
      active = false;
    };
  }, []);

  const scheduledPackages = experiences.map(
    (experience) => packages.find((item) => item.id === experience.packageId) || null,
  );
  const selectedPackage = scheduledPackages[0] || null;
  const adultCount = participants.filter((participant) => participant.type === "adult").length;
  const childCount = participants.filter((participant) => participant.type === "child").length;
  const estimatedBase = scheduledPackages.reduce((total, scheduledPackage) => {
    if (!scheduledPackage?.is_chargeable) return total;
    const adultPrice = Number(scheduledPackage.adult_price_usd ?? 0);
    const childPrice = Number(
      scheduledPackage.child_price_usd ?? (scheduledPackage.package_type === "kids" ? adultPrice : adultPrice * 0.5),
    );
    return total + adultCount * adultPrice + childCount * childPrice;
  }, 0);
  const summaryInclusions = Array.from(
    new Set(scheduledPackages.flatMap((scheduledPackage) => packageInclusions(scheduledPackage?.inclusions ?? null))),
  );
  const hasIncompleteExperience = experiences.some(
    (experience, index) =>
      !scheduledPackages[index] ||
      !experience.eventDate ||
      !experience.timeStart ||
      !experience.timeEnd ||
      experience.timeEnd <= experience.timeStart,
  );
  const readOnly = user?.access_role_level === "read_only";

  function addParticipant() {
    if (participants.length >= 20) return;
    const nextId = participantSequence.current;
    participantSequence.current += 1;
    setParticipants((current) => [...current, createParticipant(nextId)]);
  }

  function updateParticipant(clientId: string, changes: Partial<BookingParticipantDraft>) {
    setParticipants((current) =>
      current.map((participant) => (participant.clientId === clientId ? { ...participant, ...changes } : participant)),
    );
  }

  function removeParticipant(clientId: string) {
    setParticipants((current) => (current.length > 1 ? current.filter((item) => item.clientId !== clientId) : current));
  }

  function addExperience() {
    if (experiences.length >= 10) return;
    const nextId = experienceSequence.current;
    experienceSequence.current += 1;
    setExperiences((current) => [...current, createExperience(nextId)]);
  }

  function updateExperience(clientId: string, changes: Partial<BookingExperienceDraft>) {
    setExperiences((current) =>
      current.map((experience) => (experience.clientId === clientId ? { ...experience, ...changes } : experience)),
    );
  }

  function removeExperience(clientId: string) {
    setExperiences((current) => (current.length > 1 ? current.filter((item) => item.clientId !== clientId) : current));
  }

  function validationErrorForStep(step: BookingStep) {
    if (step === 1) {
      const form = formRef.current;
      const formData = new FormData(form ?? undefined);
      const guestPhone = String(formData.get("guestPhone") || "").trim();
      const guestEmail = String(formData.get("guestEmail") || "").trim();
      const roomNumber = String(formData.get("roomNumber") || "").trim();
      const emailInput = form?.elements.namedItem("guestEmail");

      if (!guestPhone || !roomNumber) return "Complete the phone or WhatsApp and room or villa number.";
      if (guestEmail && emailInput instanceof HTMLInputElement && !emailInput.checkValidity()) {
        return "Enter a valid guest email address.";
      }
      return "";
    }

    if (step === 2) {
      if (adultCount + childCount <= 0) return "At least one adult or child is required.";
      if (
        participants.some(
          (participant) =>
            !participant.fullName.trim() ||
            !participant.nationality.trim() ||
            (participant.type === "child" && participant.age === ""),
        )
      ) {
        return "Complete the name, nationality, and required child age for every participant.";
      }
      if (hasIncompleteExperience) {
        return "Complete every experience schedule and ensure each end time is after its start time.";
      }
    }

    return "";
  }

  function goToStep(step: BookingStep) {
    if (step > highestStep) return;
    setError("");
    setCurrentStep(step);
  }

  function goToNextStep() {
    const validationError = validationErrorForStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }

    const nextStep = Math.min(3, currentStep + 1) as BookingStep;
    setError("");
    setCurrentStep(nextStep);
    setHighestStep((previous) => Math.max(previous, nextStep) as BookingStep);
  }

  function goToPreviousStep() {
    setError("");
    setCurrentStep((previous) => Math.max(1, previous - 1) as BookingStep);
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    for (const step of [1, 2] as const) {
      const validationError = validationErrorForStep(step);
      if (validationError) {
        setCurrentStep(step);
        setError(validationError);
        return;
      }
    }
    if (!selectedPackage) {
      setCurrentStep(2);
      setError("Select a package for the primary experience schedule.");
      return;
    }

    setSubmitting(true);
    setError("");

    const normalizedParticipants = participants.map((participant) => ({
      fullName: participant.fullName.trim(),
      type: participant.type,
      age: participant.age === "" ? null : Number(participant.age),
      nationality: participant.nationality.trim(),
      notes: participant.notes.trim() || null,
    }));
    const primaryParticipant = normalizedParticipants[0];
    const normalizedExperiences = experiences.map((experience) => ({
      packageId: experience.packageId,
      eventDate: experience.eventDate,
      timeStart: experience.timeStart,
      timeEnd: experience.timeEnd,
      observationSpot: experience.observationSpot.trim() || null,
    }));
    const primaryExperience = normalizedExperiences[0];
    const payload = {
      packageId: primaryExperience.packageId,
      eventDate: primaryExperience.eventDate,
      timeStart: primaryExperience.timeStart,
      timeEnd: primaryExperience.timeEnd,
      guestName: primaryParticipant.fullName,
      guestPhone: String(formData.get("guestPhone") || ""),
      guestEmail: String(formData.get("guestEmail") || "") || null,
      roomNumber: String(formData.get("roomNumber") || ""),
      nationality: primaryParticipant.nationality,
      adultCount,
      childCount,
      childAges: normalizedParticipants
        .filter((participant) => participant.type === "child" && participant.age != null)
        .map((participant) => participant.age)
        .join(", "),
      participants: normalizedParticipants,
      experiences: normalizedExperiences,
      preferredLanguage,
      observationSpot: primaryExperience.observationSpot,
      specialOccasion: String(formData.get("specialOccasion") || ""),
      dietaryRestrictions: String(formData.get("dietaryRestrictions") || ""),
      privacyPreference: "Standard",
      rescheduleConsent: "Yes",
      slotStatus: "available",
      bookingSource,
      paymentMethod,
      notes: String(formData.get("notes") || ""),
      packageNotes: String(formData.get("packageNotes") || ""),
      addOns: [],
      fieldTipIncentiveUsd: 0,
      setupStatus: "not_started",
    };

    try {
      const response = await staffApi<{ booking: StaffBooking }>("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const channel = new BroadcastChannel("ephemeris_sync_channel");
          channel.postMessage({ type: "BOOKING_CREATED", bookingId: response.booking.id });
          channel.close();
        }
      } catch {
        // ignore
      }
      window.dispatchEvent(new Event("ephemeris:notifications-changed"));
      toast.success(`${response.booking.booking_code} was created successfully.`);
      await onCreated(response.booking);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to create booking.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {loading ? <BookingFormLoading /> : null}

      {!loading && error ? (
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>Check the booking details</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && readOnly ? (
        <Alert>
          <Info />
          <AlertTitle>This access role is read only</AlertTitle>
          <AlertDescription>Ask an administrator for write access before submitting a new booking.</AlertDescription>
        </Alert>
      ) : null}

      {!loading && !packages.length ? (
        <Alert>
          <Package />
          <AlertTitle>No active package is available</AlertTitle>
          <AlertDescription>
            An active package for your assigned resort is required before a booking can be created.
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && packages.length ? (
        <form ref={formRef} noValidate onSubmit={submitBooking}>
          <Tabs
            value={`step-${currentStep}`}
            onValueChange={(value) => goToStep(Number(value.replace("step-", "")) as BookingStep)}
            className="gap-5"
          >
            <nav aria-label="Booking progress">
              <ol className="grid grid-cols-3">
                {BOOKING_STEPS.map((step, index) => {
                  const completed = step.value < currentStep;
                  const active = step.value === currentStep;

                  return (
                    <li key={step.value} className="relative flex min-w-0 flex-col items-center gap-1.5">
                      {index > 0 ? (
                        <Separator
                          className={cn("absolute top-3.5 right-1/2 w-full", step.value <= currentStep && "bg-primary")}
                        />
                      ) : null}
                      <Button
                        type="button"
                        size="icon-sm"
                        variant={completed ? "default" : "outline"}
                        className="relative rounded-full"
                        disabled={step.value > highestStep}
                        aria-label={`Go to ${step.label}`}
                        aria-current={active ? "step" : undefined}
                        onClick={() => goToStep(step.value)}
                      >
                        {completed ? <Check /> : null}
                        {active ? <Dot /> : null}
                      </Button>
                      <span
                        className={cn(
                          "max-w-full text-center text-xs",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <fieldset disabled={submitting || readOnly} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <TabsContent value="step-1" forceMount className="data-[state=inactive]:hidden">
                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle>Contact and stay</CardTitle>
                      <CardDescription>Booking contact and resort stay information.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FieldSet>
                        <FieldLegend className="sr-only">Contact and stay information</FieldLegend>
                        <FieldGroup className="grid gap-5 md:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor="booking-guest-phone">Phone or WhatsApp</FieldLabel>
                            <Input
                              id="booking-guest-phone"
                              name="guestPhone"
                              maxLength={30}
                              autoComplete="tel"
                              required
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="booking-guest-email">Email</FieldLabel>
                            <Input
                              id="booking-guest-email"
                              name="guestEmail"
                              type="email"
                              maxLength={254}
                              autoComplete="email"
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="booking-room">Room or villa number</FieldLabel>
                            <Input id="booking-room" name="roomNumber" maxLength={20} required />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="booking-language">Preferred language</FieldLabel>
                            <Select
                              value={preferredLanguage}
                              onValueChange={(value) => value && setPreferredLanguage(value)}
                            >
                              <SelectTrigger id="booking-language" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectItem value="English">English</SelectItem>
                                  <SelectItem value="Bahasa Indonesia">Bahasa Indonesia</SelectItem>
                                  <SelectItem value="Arabic">Arabic</SelectItem>
                                  <SelectItem value="Mandarin">Mandarin</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </Field>
                        </FieldGroup>
                      </FieldSet>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="step-2" forceMount className="flex flex-col gap-6 data-[state=inactive]:hidden">
                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle>Participants</CardTitle>
                      <CardDescription>
                        Add every guest to this booking. All participants are submitted as one booking.
                      </CardDescription>
                      <CardAction>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={participants.length >= 20}
                          onClick={addParticipant}
                        >
                          <UserPlus data-icon="inline-start" />
                          Add participant
                        </Button>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      {participants.map((participant, index) => (
                        <FieldSet key={participant.clientId} className="rounded-lg border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <FieldLegend variant="label">Participant {index + 1}</FieldLegend>
                              {index === 0 ? <Badge variant="secondary">Primary guest</Badge> : null}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={participants.length === 1}
                              aria-label={`Remove participant ${index + 1}`}
                              onClick={() => removeParticipant(participant.clientId)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                          <FieldGroup className="grid gap-4 md:grid-cols-2">
                            <Field>
                              <FieldLabel htmlFor={`${participant.clientId}-name`}>Full name</FieldLabel>
                              <Input
                                id={`${participant.clientId}-name`}
                                value={participant.fullName}
                                maxLength={200}
                                autoComplete={index === 0 ? "name" : "off"}
                                onChange={(event) =>
                                  updateParticipant(participant.clientId, { fullName: event.target.value })
                                }
                                required
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`${participant.clientId}-type`}>Participant type</FieldLabel>
                              <Select
                                value={participant.type}
                                onValueChange={(value) => {
                                  if (value === "adult" || value === "child") {
                                    updateParticipant(participant.clientId, {
                                      type: value,
                                      age: value === "adult" ? "" : participant.age,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger id={`${participant.clientId}-type`} className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectItem value="adult">Adult</SelectItem>
                                    <SelectItem value="child">Child</SelectItem>
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`${participant.clientId}-nationality`}>Nationality</FieldLabel>
                              <Input
                                id={`${participant.clientId}-nationality`}
                                value={participant.nationality}
                                maxLength={80}
                                onChange={(event) =>
                                  updateParticipant(participant.clientId, { nationality: event.target.value })
                                }
                                required
                              />
                            </Field>
                            <Field data-disabled={participant.type === "adult"}>
                              <FieldLabel htmlFor={`${participant.clientId}-age`}>
                                Age {participant.type === "adult" ? "(optional)" : ""}
                              </FieldLabel>
                              <Input
                                id={`${participant.clientId}-age`}
                                type="number"
                                min={0}
                                max={120}
                                value={participant.age}
                                onChange={(event) =>
                                  updateParticipant(participant.clientId, { age: event.target.value })
                                }
                                required={participant.type === "child"}
                              />
                            </Field>
                            <Field className="md:col-span-2">
                              <FieldLabel htmlFor={`${participant.clientId}-notes`}>Participant notes</FieldLabel>
                              <Input
                                id={`${participant.clientId}-notes`}
                                value={participant.notes}
                                maxLength={500}
                                placeholder="Accessibility, assistance, or other participant-specific notes"
                                onChange={(event) =>
                                  updateParticipant(participant.clientId, { notes: event.target.value })
                                }
                              />
                            </Field>
                          </FieldGroup>
                        </FieldSet>
                      ))}
                      <p className="text-muted-foreground text-xs">
                        {participants.length} of 20 participants · {adultCount} adults · {childCount} children
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle>Experience schedule</CardTitle>
                      <CardDescription>
                        Add one or more experiences. They will be submitted together as one booking.
                      </CardDescription>
                      <CardAction>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={experiences.length >= 10}
                          onClick={addExperience}
                        >
                          <CalendarPlus data-icon="inline-start" />
                          Add experience
                        </Button>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      {experiences.map((experience, index) => (
                        <FieldSet key={experience.clientId} className="rounded-lg border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <FieldLegend variant="label">Experience {index + 1}</FieldLegend>
                              {index === 0 ? <Badge variant="secondary">Primary schedule</Badge> : null}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={experiences.length === 1}
                              aria-label={`Remove experience ${index + 1}`}
                              onClick={() => removeExperience(experience.clientId)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                          <FieldGroup className="grid gap-5 md:grid-cols-2">
                            <Field className="md:col-span-2">
                              <FieldLabel htmlFor={`${experience.clientId}-package`}>Package</FieldLabel>
                              <Select
                                value={experience.packageId}
                                onValueChange={(value) =>
                                  value && updateExperience(experience.clientId, { packageId: value })
                                }
                              >
                                <SelectTrigger id={`${experience.clientId}-package`} className="w-full">
                                  <SelectValue placeholder="Select a package" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {packages.map((item) => (
                                      <SelectItem key={item.id} value={item.id}>
                                        {item.name} · {formatUsd(item.adult_price_usd)} adult
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`${experience.clientId}-event-date`}>Event date</FieldLabel>
                              <DatePicker
                                id={`${experience.clientId}-event-date`}
                                value={experience.eventDate}
                                onValueChange={(eventDate) => updateExperience(experience.clientId, { eventDate })}
                                required
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`${experience.clientId}-observation-spot`}>
                                Observation spot
                              </FieldLabel>
                              <Input
                                id={`${experience.clientId}-observation-spot`}
                                value={experience.observationSpot}
                                maxLength={120}
                                placeholder="Upon assignment"
                                onChange={(event) =>
                                  updateExperience(experience.clientId, { observationSpot: event.target.value })
                                }
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`${experience.clientId}-start-time`}>Start time</FieldLabel>
                              <TimePicker
                                id={`${experience.clientId}-start-time`}
                                value={experience.timeStart}
                                onValueChange={(timeStart) => updateExperience(experience.clientId, { timeStart })}
                                required
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`${experience.clientId}-end-time`}>End time</FieldLabel>
                              <TimePicker
                                id={`${experience.clientId}-end-time`}
                                value={experience.timeEnd}
                                onValueChange={(timeEnd) => updateExperience(experience.clientId, { timeEnd })}
                                required
                              />
                            </Field>
                          </FieldGroup>
                        </FieldSet>
                      ))}
                      <p className="text-muted-foreground text-xs">{experiences.length} of 10 scheduled experiences</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="step-3" forceMount className="data-[state=inactive]:hidden">
                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle>Service preferences</CardTitle>
                      <CardDescription>Optional details used by resort and field operations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FieldSet>
                        <FieldLegend className="sr-only">Service preferences</FieldLegend>
                        <FieldGroup className="grid gap-5 md:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor="booking-source">Booking source</FieldLabel>
                            <Select value={bookingSource} onValueChange={(value) => value && setBookingSource(value)}>
                              <SelectTrigger id="booking-source" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                                  <SelectItem value="Front desk">Front desk</SelectItem>
                                  <SelectItem value="Butler">Butler</SelectItem>
                                  <SelectItem value="Phone">Phone</SelectItem>
                                  <SelectItem value="Walk-in">Walk-in</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="booking-payment">Payment method</FieldLabel>
                            <Select value={paymentMethod} onValueChange={(value) => value && setPaymentMethod(value)}>
                              <SelectTrigger id="booking-payment" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                                  <SelectItem value="Cash">Cash</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="booking-special-occasion">Special occasion</FieldLabel>
                            <Input
                              id="booking-special-occasion"
                              name="specialOccasion"
                              maxLength={500}
                              placeholder="Birthday, anniversary..."
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="booking-dietary">Dietary restrictions</FieldLabel>
                            <Input id="booking-dietary" name="dietaryRestrictions" maxLength={500} />
                          </Field>
                          <Field className="md:col-span-2">
                            <FieldLabel htmlFor="booking-package-notes">Package notes</FieldLabel>
                            <Textarea
                              id="booking-package-notes"
                              name="packageNotes"
                              maxLength={4000}
                              placeholder="Guest-specific package preparation details."
                            />
                          </Field>
                          <Field className="md:col-span-2">
                            <FieldLabel htmlFor="booking-notes">Internal notes</FieldLabel>
                            <Textarea
                              id="booking-notes"
                              name="notes"
                              maxLength={2000}
                              placeholder="Visible to authorized operations staff."
                            />
                          </Field>
                        </FieldGroup>
                      </FieldSet>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>

              <div className="flex flex-col gap-6 xl:sticky xl:top-18 xl:self-start">
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle>Booking summary</CardTitle>
                    <CardDescription>Pricing is recalculated by the backend when submitted.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Package />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {selectedPackage?.name || "No package selected"}
                          {experiences.length > 1 ? ` +${experiences.length - 1} more` : ""}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {experiences.length} scheduled {experiences.length === 1 ? "experience" : "experiences"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Users />
                      </div>
                      <div>
                        <p className="font-medium">{adultCount + childCount} guests</p>
                        <p className="text-muted-foreground text-sm">
                          {adultCount} adults · {childCount} children
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {summaryInclusions.slice(0, 4).map((item) => (
                        <Badge key={item} variant="secondary">
                          {item}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t pt-4">
                      <span className="text-muted-foreground text-sm">Estimated base</span>
                      <strong className="text-lg tabular-nums">{formatUsd(estimatedBase)}</strong>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Service charge, tax, rewards, and commission are calculated securely after submission.
                    </p>
                  </CardContent>
                  <CardFooter className="flex-col items-stretch gap-2">
                    {currentStep > 1 ? (
                      <Button type="button" variant="outline" onClick={goToPreviousStep}>
                        <ArrowLeft data-icon="inline-start" />
                        Back
                      </Button>
                    ) : null}
                    {currentStep < 3 ? (
                      <Button type="button" onClick={goToNextStep}>
                        Continue
                        <ArrowRight data-icon="inline-end" />
                      </Button>
                    ) : (
                      <Button type="submit" disabled={submitting || readOnly}>
                        {submitting ? <Spinner data-icon="inline-start" /> : <CalendarPlus data-icon="inline-start" />}
                        {submitting ? "Creating booking..." : "Create booking"}
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                  </CardFooter>
                </Card>

                <Alert>
                  <Check />
                  <AlertTitle>
                    {role === "external" ? "Internal approval required" : "Immediately operational"}
                  </AlertTitle>
                  <AlertDescription>
                    {role === "external"
                      ? "External bookings start as Pending until internal resort staff approves them."
                      : "Internal bookings start as Active and are assigned to the creating staff member."}
                  </AlertDescription>
                </Alert>
              </div>
            </fieldset>
          </Tabs>
        </form>
      ) : null}

      {!loading && !error && packages.length && adultCount + childCount <= 0 ? (
        <FieldError>At least one adult or child is required.</FieldError>
      ) : null}
    </div>
  );
}
