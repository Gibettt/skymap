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
  Plus,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  "package",
  "date",
  "start-time",
  "end-time",
  "guests",
  "guest-name",
  "room",
  "guest-phone",
  "guest-email",
  "language",
];

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}
function resolvePrimaryPriceType(pkg: {
  primary_price_type?: string | null;
  adult_price_usd?: number | string | null;
  couple_price_usd?: number | string | null;
  group_price_usd?: number | string | null;
  family_price_usd?: number | string | null;
}): string {
  if (pkg.primary_price_type) return pkg.primary_price_type;
  if (Number(pkg.adult_price_usd ?? 0) > 0) return "adult";
  if (Number(pkg.couple_price_usd ?? 0) > 0) return "couple";
  if (Number(pkg.group_price_usd ?? 0) > 0) return "group";
  if (Number(pkg.family_price_usd ?? 0) > 0) return "family";
  return "adult";
}

function getPackageHeadlinePrice(pkg: {
  primary_price_type?: string | null;
  adult_price_usd?: number | string | null;
  couple_price_usd?: number | string | null;
  group_price_usd?: number | string | null;
  family_price_usd?: number | string | null;
}): string {
  const pType = resolvePrimaryPriceType(pkg);
  if (pType === "couple" && pkg.couple_price_usd) {
    return `${formatUsd(pkg.couple_price_usd)} /couple`;
  }
  if (pType === "group" && pkg.group_price_usd) {
    return `${formatUsd(pkg.group_price_usd)} /group`;
  }
  if (pType === "family" && pkg.family_price_usd) {
    return `${formatUsd(pkg.family_price_usd)} /family`;
  }
  if (pkg.adult_price_usd != null && Number(pkg.adult_price_usd) > 0) {
    return `${formatUsd(pkg.adult_price_usd)} /adult`;
  }
  if (pkg.couple_price_usd) {
    return `${formatUsd(pkg.couple_price_usd)} /couple`;
  }
  return formatUsd(pkg.adult_price_usd ?? 0);
}
function normalizePackage(item: StaffPackage): StaffPackage {
  return {
    ...item,
    adult_price_usd: item.adult_price_usd == null ? 0 : Number(item.adult_price_usd),
    child_price_usd: item.child_price_usd == null ? null : Number(item.child_price_usd),
    couple_price_usd: item.couple_price_usd == null ? null : Number(item.couple_price_usd),
    group_price_usd: item.group_price_usd == null ? null : Number(item.group_price_usd),
    family_price_usd: item.family_price_usd == null ? null : Number(item.family_price_usd),
    meal_price_usd: item.meal_price_usd == null ? null : Number(item.meal_price_usd),
    primary_price_type: item.primary_price_type || "adult",
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
          {BOOKING_FIELD_SKELETONS.map((id) => (
            <div key={id} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
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
  { value: 1, label: "Package & schedule" },
  { value: 2, label: "Guests & participants" },
  { value: 3, label: "Contact & stay" },
];

function createParticipant(index: number, type: "adult" | "child" = "adult"): BookingParticipantDraft {
  return {
    clientId: `participant-${type}-${index}-${Date.now()}`,
    fullName: "",
    type,
    age: type === "child" ? "8" : "",
    nationality: "",
    notes: "",
  };
}

function computeEndTime(timeStart: string): string {
  if (!timeStart) return "22:00";
  const [h = "21", m = "00"] = timeStart.split(":");
  const hourNum = Number(h);
  if (hourNum >= 23) {
    return "23:59";
  }
  const nextH = Math.min(23, hourNum + 1);
  return `${String(nextH).padStart(2, "0")}:${m}`;
}

function createExperience(index: number, packageId = ""): BookingExperienceDraft {
  return {
    clientId: `experience-${index}`,
    packageId,
    eventDate: tomorrowDate(),
    timeStart: "21:00",
    timeEnd: computeEndTime("21:00"),
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

  // Guest counters (Adults & Kids)
  const [numAdults, setNumAdults] = React.useState(1);
  const [numChildren, setNumChildren] = React.useState(0);

  const [participants, setParticipants] = React.useState<BookingParticipantDraft[]>(() => [
    createParticipant(0, "adult"),
  ]);
  const experienceSequence = React.useRef(1);
  const [experiences, setExperiences] = React.useState<BookingExperienceDraft[]>(() => [createExperience(0)]);
  const [currentStep, setCurrentStep] = React.useState<BookingStep>(1);
  const [highestStep, setHighestStep] = React.useState<BookingStep>(1);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  // Quick package dialog
  const [quickPackageOpen, setQuickPackageOpen] = React.useState(false);
  const [quickPkgName, setQuickPkgName] = React.useState("Stargazing with Astronomer");
  const [quickPkgAdultPrice, setQuickPkgAdultPrice] = React.useState("65");
  const [quickPkgChildPrice, setQuickPkgChildPrice] = React.useState("65");
  const [quickPkgLocation, setQuickPkgLocation] = React.useState("Observatory Deck");
  const [quickPkgPending, setQuickPkgPending] = React.useState(false);

  async function handleSaveQuickPackage() {
    if (!quickPkgName.trim()) return;
    setQuickPkgPending(true);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickPkgName.trim(),
          packageType: "regular",
          experienceType: "communal",
          location: quickPkgLocation.trim() || "Observatory Deck",
          schedule: "Upon request",
          adultPriceUsd: quickPkgAdultPrice || "65",
          childPriceUsd: quickPkgChildPrice || quickPkgAdultPrice || "65",
          resortId: user?.resort_id,
          isActive: true,
          isChargeable: Number(quickPkgAdultPrice || "65") > 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat package");
      if (data.package) {
        const normalized = normalizePackage(data.package);
        setPackages((prev) => [normalized, ...prev]);
        setExperiences((prev) =>
          prev.map((exp, idx) =>
            idx === 0
              ? { ...exp, packageId: normalized.id, observationSpot: normalized.location || exp.observationSpot }
              : exp,
          ),
        );
        toast.success(`Package "${normalized.name}" berhasil dibuat`);
        setQuickPackageOpen(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat package");
    } finally {
      setQuickPkgPending(false);
    }
  }

  React.useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [meRes, pkgsRes] = await Promise.all([
          staffApi<MeResponse>("/api/me"),
          staffApi<PackagesResponse>("/api/packages"),
        ]);
        if (!active) return;
        setUser(meRes.user);
        const normalizedPackages = (pkgsRes.packages || []).map(normalizePackage);
        setPackages(normalizedPackages);
        if (normalizedPackages[0]) {
          setExperiences([createExperience(0, normalizedPackages[0].id)]);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load booking form.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const scheduledPackages = experiences.map(
    (experience) => packages.find((item) => item.id === experience.packageId) || null,
  );
  const selectedPackage = scheduledPackages[0] || null;

  // Determine if couple booking
  const isCoupleBooking = Boolean(
    selectedPackage &&
      (selectedPackage.primary_price_type === "couple" ||
        selectedPackage.name.toLowerCase().includes("couple") ||
        selectedPackage.name.toLowerCase().includes("dine under the moon") ||
        selectedPackage.name.toLowerCase().includes("sip under the stars")),
  );

  // Sync participants based on adult and kid count dropdowns
  function syncGuestCounts(adults: number, children: number) {
    setParticipants((prev) => {
      const existingAdults = prev.filter((p) => p.type === "adult");
      const existingChildren = prev.filter((p) => p.type === "child");

      const newAdults: BookingParticipantDraft[] = [];
      for (let i = 0; i < adults; i++) {
        newAdults.push(
          existingAdults[i] || {
            clientId: `participant-adult-${i}-${Date.now()}`,
            fullName: "",
            type: "adult",
            age: "",
            nationality: prev[0]?.nationality || "",
            notes: "",
          },
        );
      }

      const newChildren: BookingParticipantDraft[] = [];
      for (let i = 0; i < children; i++) {
        newChildren.push(
          existingChildren[i] || {
            clientId: `participant-child-${i}-${Date.now()}`,
            fullName: "",
            type: "child",
            age: "8",
            nationality: prev[0]?.nationality || "",
            notes: "",
          },
        );
      }

      return [...newAdults, ...newChildren];
    });
  }

  const adultCount = participants.filter((p) => p.type === "adult").length || numAdults;
  const childCount = participants.filter((p) => p.type === "child").length || numChildren;

  // Accurately compute estimated base based on package's primary price type
  const estimatedBase = scheduledPackages.reduce((total, scheduledPackage) => {
    if (!scheduledPackage?.is_chargeable) return total;
    const pType = resolvePrimaryPriceType(scheduledPackage);

    const childRate = scheduledPackage.child_price_usd != null ? Number(scheduledPackage.child_price_usd) : 0;
    const childrenTotal = childCount * childRate;

    if (
      pType === "couple" &&
      scheduledPackage.couple_price_usd != null &&
      Number(scheduledPackage.couple_price_usd) > 0
    ) {
      const coupleCount = Math.max(1, Math.ceil(adultCount / 2));
      const extraAdultRate =
        Number(scheduledPackage.adult_price_usd || 0) || Number(scheduledPackage.couple_price_usd) / 2;
      const extraAdultTotal = adultCount > 2 ? (adultCount - 2) * extraAdultRate : 0;
      return (
        total +
        (coupleCount === 1
          ? Number(scheduledPackage.couple_price_usd)
          : coupleCount * Number(scheduledPackage.couple_price_usd)) +
        extraAdultTotal +
        childrenTotal
      );
    }

    if (pType === "group" && scheduledPackage.group_price_usd != null && Number(scheduledPackage.group_price_usd) > 0) {
      return total + Number(scheduledPackage.group_price_usd) + childrenTotal;
    }

    if (
      pType === "family" &&
      scheduledPackage.family_price_usd != null &&
      Number(scheduledPackage.family_price_usd) > 0
    ) {
      return total + Number(scheduledPackage.family_price_usd) + childrenTotal;
    }

    const adultRate = Number(scheduledPackage.adult_price_usd || 0);
    return total + adultCount * adultRate + childrenTotal;
  }, 0);

  const summaryInclusions = Array.from(
    new Set(scheduledPackages.flatMap((scheduledPackage) => packageInclusions(scheduledPackage?.inclusions ?? null))),
  );
  const hasIncompleteExperience = experiences.some(
    (experience, index) => !scheduledPackages[index] || !experience.eventDate || !experience.timeStart,
  );
  const readOnly = user?.access_role_level === "read_only";

  function updateParticipant(clientId: string, changes: Partial<BookingParticipantDraft>) {
    setParticipants((current) =>
      current.map((participant) => (participant.clientId === clientId ? { ...participant, ...changes } : participant)),
    );
  }

  function addExperience() {
    if (experiences.length >= 10) return;
    const nextId = experienceSequence.current;
    experienceSequence.current += 1;
    setExperiences((current) => [...current, createExperience(nextId, packages[0]?.id || "")]);
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
    // Step 1: Package & Schedule
    if (step === 1) {
      if (!selectedPackage) {
        return "Select an experience package to continue.";
      }
      if (hasIncompleteExperience) {
        return "Complete every experience schedule and ensure each end time is after its start time.";
      }
      return "";
    }

    // Step 2: Guests & Participants
    if (step === 2) {
      if (adultCount + childCount <= 0) {
        return "At least one adult or child is required.";
      }

      const adultParticipants = participants.filter((p) => p.type === "adult");
      if (!adultParticipants[0]?.fullName.trim()) {
        return "Primary guest full name is required.";
      }
      if (!adultParticipants[0]?.nationality.trim()) {
        return "Primary guest nationality is required.";
      }

      // Check remaining adult participants
      for (let i = 1; i < adultParticipants.length; i++) {
        // If it's a couple booking, 2nd guest details are completely optional!
        if (isCoupleBooking && i === 1) {
          continue;
        }
        if (!adultParticipants[i].fullName.trim()) {
          return `Complete the full name for Adult ${i + 1}.`;
        }
        if (!adultParticipants[i].nationality.trim()) {
          return `Complete the nationality for Adult ${i + 1}.`;
        }
      }

      // Check child participants
      const childParticipants = participants.filter((p) => p.type === "child");
      for (let i = 0; i < childParticipants.length; i++) {
        if (
          childParticipants[i].age === "" ||
          Number(childParticipants[i].age) < 0 ||
          Number(childParticipants[i].age) >= 18
        ) {
          return `Enter a valid age (under 18y) for Child ${i + 1}.`;
        }
      }
      return "";
    }

    // Step 3: Contact & Stay
    if (step === 3) {
      const form = formRef.current;
      const formData = new FormData(form ?? undefined);
      const guestEmail = String(formData.get("guestEmail") || "").trim();
      const roomNumber = String(formData.get("roomNumber") || "").trim();
      const emailInput = form?.elements.namedItem("guestEmail");
      if (!roomNumber) return "Complete the room or villa number.";
      if (guestEmail && emailInput instanceof HTMLInputElement && !emailInput.checkValidity()) {
        return "Enter a valid guest email address.";
      }
      return "";
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

    for (const step of [1, 2, 3] as const) {
      const validationError = validationErrorForStep(step);
      if (validationError) {
        setCurrentStep(step);
        setError(validationError);
        return;
      }
    }

    if (!selectedPackage) {
      setCurrentStep(1);
      setError("Select a package for the primary experience schedule.");
      return;
    }

    setSubmitting(true);
    setError("");

    const normalizedParticipants: Array<{
      fullName: string;
      type: "adult" | "child";
      age: number | null;
      nationality: string;
      notes: string | null;
    }> = [];

    const adultParticipants = participants.filter((p) => p.type === "adult");
    const childParticipants = participants.filter((p) => p.type === "child");

    adultParticipants.forEach((adult, index) => {
      const isSecondCoupleGuest = isCoupleBooking && index === 1;
      const name =
        adult.fullName.trim() ||
        (isSecondCoupleGuest ? `${adultParticipants[0].fullName.trim()} (Guest 2)` : `Adult ${index + 1}`);
      const nationality = adult.nationality.trim() || adultParticipants[0]?.nationality.trim() || "Unspecified";
      normalizedParticipants.push({
        fullName: name,
        type: "adult",
        age: adult.age === "" ? null : Number(adult.age),
        nationality,
        notes: adult.notes.trim() || null,
      });
    });

    childParticipants.forEach((child, index) => {
      const name = child.fullName.trim() || `Child ${index + 1}`;
      const nationality = child.nationality.trim() || adultParticipants[0]?.nationality.trim() || "Unspecified";
      normalizedParticipants.push({
        fullName: name,
        type: "child",
        age: child.age === "" ? 8 : Number(child.age),
        nationality,
        notes: child.notes.trim() || null,
      });
    });

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
      guestPhone: String(formData.get("guestPhone") || "").trim() || null,
      guestEmail: String(formData.get("guestEmail") || "").trim() || null,
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
      packageNotes: String(formData.get("packageNotes") || ""),
      notes: String(formData.get("notes") || ""),
    };

    try {
      const createdBooking = await staffApi<StaffBooking>("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      toast.success(
        role === "external"
          ? "Booking submitted. An internal guide will review it shortly."
          : `Booking ${createdBooking.booking_code} created successfully.`,
      );
      await onCreated(createdBooking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking.");
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
          <AlertTitle>Cannot continue</AlertTitle>
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
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <Package className="text-amber-500" />
          <AlertTitle>No active package is available for this resort</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>An active package is required to create a booking. You can create one quickly below:</span>
            <Button
              type="button"
              size="sm"
              className="w-fit bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-sm hover:from-fuchsia-400 hover:to-violet-500 border-0"
              onClick={() => setQuickPackageOpen(true)}
            >
              <Plus data-icon="inline-start" /> Quick create package (e.g. Stargazing with Astronomer - $65)
            </Button>
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
                          "max-w-full text-center text-xs font-medium",
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
                {/* STEP 1: Package & Experience Schedule (FIRST SELECT PACKAGE) */}
                <TabsContent value="step-1" forceMount className="flex flex-col gap-6 data-[state=inactive]:hidden">
                  <Card>
                    <CardHeader className="border-b">
                      <div className="flex flex-col gap-1">
                        <CardTitle>Experience package & schedule</CardTitle>
                        <CardDescription>
                          Select the package first, then choose the date, time, and observation spot.
                        </CardDescription>
                      </div>
                      <CardAction>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={experiences.length >= 10}
                          onClick={addExperience}
                        >
                          <CalendarPlus data-icon="inline-start" />
                          Add another experience
                        </Button>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5 pt-5">
                      {experiences.map((experience, index) => (
                        <FieldSet key={experience.clientId} className="rounded-xl border p-4.5 bg-card/40">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <FieldLegend variant="label" className="font-semibold text-sm">
                                Experience {index + 1}
                              </FieldLegend>
                              {index === 0 ? <Badge variant="secondary">Primary experience</Badge> : null}
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
                              <FieldLabel htmlFor={`${experience.clientId}-package`} className="font-semibold">
                                Select package *
                              </FieldLabel>
                              <Select
                                value={experience.packageId}
                                onValueChange={(value) => {
                                  if (value === "__new_package__") {
                                    setQuickPackageOpen(true);
                                  } else if (value) {
                                    const selectedPkg = packages.find((item) => item.id === value);
                                    updateExperience(experience.clientId, {
                                      packageId: value,
                                      ...(selectedPkg?.location ? { observationSpot: selectedPkg.location } : {}),
                                    });
                                    if (index === 0 && selectedPkg) {
                                      const isPkgCouple =
                                        selectedPkg.primary_price_type === "couple" ||
                                        selectedPkg.name.toLowerCase().includes("couple") ||
                                        selectedPkg.name.toLowerCase().includes("dine under the moon") ||
                                        selectedPkg.name.toLowerCase().includes("sip under the stars");
                                      if (isPkgCouple && numAdults < 2) {
                                        setNumAdults(2);
                                        syncGuestCounts(2, numChildren);
                                      }
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger
                                  id={`${experience.clientId}-package`}
                                  className="w-full bg-background font-medium"
                                >
                                  <SelectValue placeholder="Choose experience package..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {packages.map((item) => {
                                      const priceDisplay = getPackageHeadlinePrice(item);
                                      return (
                                        <SelectItem key={item.id} value={item.id}>
                                          {item.name} · {priceDisplay}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectGroup>
                                  <SelectSeparator />
                                  <SelectItem value="__new_package__" className="text-primary font-medium">
                                    + Quick create package
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>

                            <Field>
                              <FieldLabel htmlFor={`${experience.clientId}-event-date`} className="font-medium">
                                Event date *
                              </FieldLabel>
                              <DatePicker
                                id={`${experience.clientId}-event-date`}
                                value={experience.eventDate}
                                onValueChange={(eventDate) => updateExperience(experience.clientId, { eventDate })}
                                required
                              />
                            </Field>

                            <Field>
                              <FieldLabel htmlFor={`${experience.clientId}-observation-spot`} className="font-medium">
                                Observation spot
                              </FieldLabel>
                              <Input
                                id={`${experience.clientId}-observation-spot`}
                                placeholder="e.g. Observatory Deck / Beach"
                                value={experience.observationSpot}
                                maxLength={120}
                                onChange={(event) =>
                                  updateExperience(experience.clientId, { observationSpot: event.target.value })
                                }
                              />
                            </Field>

                            <Field>
                              <FieldLabel htmlFor={`${experience.clientId}-start-time`} className="font-medium">
                                Start time *
                              </FieldLabel>
                              <TimePicker
                                id={`${experience.clientId}-start-time`}
                                value={experience.timeStart}
                                onValueChange={(timeStart) => {
                                  updateExperience(experience.clientId, {
                                    timeStart,
                                    timeEnd: computeEndTime(timeStart),
                                  });
                                }}
                                required
                              />
                            </Field>

                            <Field>
                              <FieldLabel htmlFor={`${experience.clientId}-end-time`} className="font-medium">
                                End time *
                              </FieldLabel>
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
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* STEP 2: Guests & Participants (SEPARATE BARS FOR ADULTS & KIDS) */}
                <TabsContent value="step-2" forceMount className="flex flex-col gap-6 data-[state=inactive]:hidden">
                  <Card>
                    <CardHeader className="border-b">
                      <div className="flex flex-col gap-1">
                        <CardTitle>Guests & participants</CardTitle>
                        <CardDescription>Select how many adults and kids, then complete guest details.</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5 pt-5">
                      {/* Separate Bars for Adults and Kids (as requested by client) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <Field>
                          <div className="flex items-center justify-between mb-1.5">
                            <FieldLabel htmlFor="booking-num-adults" className="font-semibold text-sm">
                              Adults
                            </FieldLabel>
                            <span className="text-xs text-muted-foreground">12y and older</span>
                          </div>
                          <Select
                            value={String(numAdults)}
                            onValueChange={(val) => {
                              const count = parseInt(val, 10) || 1;
                              setNumAdults(count);
                              syncGuestCounts(count, numChildren);
                            }}
                          >
                            <SelectTrigger id="booking-num-adults" className="w-full bg-background font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((n) => (
                                  <SelectItem key={n} value={String(n)}>
                                    {n} {n === 1 ? "Adult" : "Adults"}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field>
                          <div className="flex items-center justify-between mb-1.5">
                            <FieldLabel htmlFor="booking-num-kids" className="font-semibold text-sm">
                              Kids / Children
                            </FieldLabel>
                            <span className="text-xs text-muted-foreground">Under 12y</span>
                          </div>
                          <Select
                            value={String(numChildren)}
                            onValueChange={(val) => {
                              const count = parseInt(val, 10) || 0;
                              setNumChildren(count);
                              syncGuestCounts(numAdults, count);
                            }}
                          >
                            <SelectTrigger id="booking-num-kids" className="w-full bg-background font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                  <SelectItem key={n} value={String(n)}>
                                    {n === 0 ? "0 Kids (No children)" : `${n} ${n === 1 ? "Kid" : "Kids"}`}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>

                      {/* Adult Guests List */}
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm text-foreground">Adult Guests ({numAdults})</h3>
                          {isCoupleBooking && (
                            <Badge
                              variant="outline"
                              className="border-pink-500/30 bg-pink-500/10 text-pink-300 text-xs"
                            >
                              Couple package — 2nd guest details optional
                            </Badge>
                          )}
                        </div>

                        {participants
                          .filter((p) => p.type === "adult")
                          .map((participant, index) => {
                            const isSecondCoupleGuest = isCoupleBooking && index === 1;

                            return (
                              <FieldSet key={participant.clientId} className="rounded-lg border p-4 bg-card/40">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-2">
                                    <FieldLegend variant="label" className="font-medium">
                                      Adult {index + 1}
                                    </FieldLegend>
                                    {index === 0 && <Badge variant="secondary">Primary guest</Badge>}
                                    {isSecondCoupleGuest && (
                                      <Badge variant="outline" className="text-xs">
                                        Optional
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <FieldGroup className="grid gap-4 md:grid-cols-2">
                                  <Field>
                                    <FieldLabel htmlFor={`${participant.clientId}-name`}>
                                      Full name {isSecondCoupleGuest ? "(optional)" : "*"}
                                    </FieldLabel>
                                    <Input
                                      id={`${participant.clientId}-name`}
                                      value={participant.fullName}
                                      maxLength={200}
                                      placeholder={
                                        isSecondCoupleGuest ? "Partner name (optional for couple)" : "Guest full name"
                                      }
                                      onChange={(e) =>
                                        updateParticipant(participant.clientId, { fullName: e.target.value })
                                      }
                                      required={!isSecondCoupleGuest}
                                    />
                                  </Field>

                                  <Field>
                                    <FieldLabel htmlFor={`${participant.clientId}-nationality`}>
                                      Nationality {isSecondCoupleGuest ? "(optional)" : "*"}
                                    </FieldLabel>
                                    <Input
                                      id={`${participant.clientId}-nationality`}
                                      value={participant.nationality}
                                      maxLength={80}
                                      placeholder={
                                        isSecondCoupleGuest
                                          ? participants[0]?.nationality || "Optional"
                                          : "e.g. Maldivian, French, British"
                                      }
                                      onChange={(e) =>
                                        updateParticipant(participant.clientId, { nationality: e.target.value })
                                      }
                                      required={!isSecondCoupleGuest}
                                    />
                                  </Field>

                                  <Field className="md:col-span-2">
                                    <FieldLabel htmlFor={`${participant.clientId}-notes`}>Notes (optional)</FieldLabel>
                                    <Input
                                      id={`${participant.clientId}-notes`}
                                      value={participant.notes}
                                      maxLength={500}
                                      placeholder="Accessibility or special requests"
                                      onChange={(e) =>
                                        updateParticipant(participant.clientId, { notes: e.target.value })
                                      }
                                    />
                                  </Field>
                                </FieldGroup>
                              </FieldSet>
                            );
                          })}
                      </div>

                      {/* Children Guests List */}
                      {numChildren > 0 && (
                        <div className="flex flex-col gap-4 mt-2">
                          <h3 className="font-semibold text-sm text-foreground">Children Guests ({numChildren})</h3>
                          {participants
                            .filter((p) => p.type === "child")
                            .map((child, index) => (
                              <FieldSet key={child.clientId} className="rounded-lg border p-4 bg-card/40">
                                <FieldLegend variant="label" className="font-medium mb-3">
                                  Child {index + 1}
                                </FieldLegend>
                                <FieldGroup className="grid gap-4 md:grid-cols-3">
                                  <Field>
                                    <FieldLabel htmlFor={`${child.clientId}-name`}>Name (optional)</FieldLabel>
                                    <Input
                                      id={`${child.clientId}-name`}
                                      value={child.fullName}
                                      maxLength={200}
                                      placeholder={`Child ${index + 1}`}
                                      onChange={(e) => updateParticipant(child.clientId, { fullName: e.target.value })}
                                    />
                                  </Field>

                                  <Field>
                                    <FieldLabel htmlFor={`${child.clientId}-age`}>Age (under 12y) *</FieldLabel>
                                    <Input
                                      id={`${child.clientId}-age`}
                                      type="number"
                                      min="0"
                                      max="17"
                                      value={child.age}
                                      placeholder="8"
                                      required
                                      onChange={(e) => updateParticipant(child.clientId, { age: e.target.value })}
                                    />
                                  </Field>

                                  <Field>
                                    <FieldLabel htmlFor={`${child.clientId}-nationality`}>
                                      Nationality (optional)
                                    </FieldLabel>
                                    <Input
                                      id={`${child.clientId}-nationality`}
                                      value={child.nationality}
                                      maxLength={80}
                                      placeholder={participants[0]?.nationality || "Optional"}
                                      onChange={(e) =>
                                        updateParticipant(child.clientId, { nationality: e.target.value })
                                      }
                                    />
                                  </Field>
                                </FieldGroup>
                              </FieldSet>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* STEP 3: Contact, Stay & Preferences */}
                <TabsContent value="step-3" forceMount className="flex flex-col gap-6 data-[state=inactive]:hidden">
                  <Card>
                    <CardHeader className="border-b">
                      <div className="flex flex-col gap-1">
                        <CardTitle>Contact and stay information</CardTitle>
                        <CardDescription>Resort room assignment and guest contact details.</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-5">
                      <FieldSet>
                        <FieldLegend className="sr-only">Contact and stay information</FieldLegend>
                        <FieldGroup className="grid gap-5 md:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor="booking-room" className="font-semibold">
                              Room or villa number *
                            </FieldLabel>
                            <Input
                              id="booking-room"
                              name="roomNumber"
                              maxLength={20}
                              placeholder="e.g. Villa 102"
                              required
                            />
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
                          <Field>
                            <FieldLabel htmlFor="booking-guest-phone">Phone or WhatsApp (optional)</FieldLabel>
                            <Input
                              id="booking-guest-phone"
                              name="guestPhone"
                              maxLength={30}
                              autoComplete="tel"
                              placeholder="+960 ..."
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="booking-guest-email">Email (optional)</FieldLabel>
                            <Input
                              id="booking-guest-email"
                              name="guestEmail"
                              type="email"
                              maxLength={254}
                              autoComplete="email"
                              placeholder="guest@example.com"
                            />
                          </Field>
                        </FieldGroup>
                      </FieldSet>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="border-b">
                      <div className="flex flex-col gap-1">
                        <CardTitle>Service preferences</CardTitle>
                        <CardDescription>Optional details used by resort and field operations.</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-5">
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
                            <Input
                              id="booking-dietary"
                              name="dietaryRestrictions"
                              maxLength={500}
                              placeholder="Vegetarian, allergies, halal..."
                            />
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

              {/* Sidebar Summary */}
              <div className="flex flex-col gap-6 xl:sticky xl:top-18 xl:self-start">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking summary</CardTitle>
                    <CardDescription>Pricing is recalculated securely when submitted.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Package />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{selectedPackage?.name || "No package selected"}</p>
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
                          {adultCount} {adultCount === 1 ? "adult" : "adults"} · {childCount}{" "}
                          {childCount === 1 ? "child" : "children"}
                        </p>
                      </div>
                    </div>
                    {summaryInclusions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {summaryInclusions.slice(0, 4).map((item) => (
                          <Badge key={item} variant="secondary" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t pt-4">
                      <span className="text-muted-foreground text-sm">Estimated base</span>
                      <strong className="text-lg tabular-nums text-foreground">{formatUsd(estimatedBase)}</strong>
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

      <Dialog open={quickPackageOpen} onOpenChange={setQuickPackageOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick create package</DialogTitle>
            <DialogDescription>
              Create an experience package for your resort so you can proceed with the booking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Field>
              <FieldLabel htmlFor="qp-name">Package name</FieldLabel>
              <Input
                id="qp-name"
                value={quickPkgName}
                onChange={(e) => setQuickPkgName(e.target.value)}
                placeholder="e.g. Stargazing with Astronomer"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="qp-adult-price">Adult price (USD)</FieldLabel>
                <Input
                  id="qp-adult-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quickPkgAdultPrice}
                  onChange={(e) => setQuickPkgAdultPrice(e.target.value)}
                  placeholder="65.00"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="qp-child-price">Child price (USD)</FieldLabel>
                <Input
                  id="qp-child-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quickPkgChildPrice}
                  onChange={(e) => setQuickPkgChildPrice(e.target.value)}
                  placeholder="65.00"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="qp-location">Location</FieldLabel>
              <Input
                id="qp-location"
                value={quickPkgLocation}
                onChange={(e) => setQuickPkgLocation(e.target.value)}
                placeholder="e.g. Observatory Deck / Beach / Kids Club"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setQuickPackageOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={quickPkgPending || !quickPkgName.trim()}
              className="bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-sm hover:from-fuchsia-400 hover:to-violet-500 border-0"
              onClick={handleSaveQuickPackage}
            >
              {quickPkgPending ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
              {quickPkgPending ? "Saving..." : "Create and select"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
