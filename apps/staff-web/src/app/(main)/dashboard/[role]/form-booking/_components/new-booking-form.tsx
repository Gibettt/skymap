"use client";

import * as React from "react";
import {
  CalendarDays,
  Clock,
  Info,
  Package,
  Plus,
  ShieldAlert,
  Sparkles,
  User,
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
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

import {
  type StaffBooking,
  type StaffPackage,
  type StaffRole,
  type StaffUser,
  formatUsd,
  staffApi,
} from "../../_lib/staff-api";

interface PackagesResponse {
  packages: StaffPackage[];
}

interface MeResponse {
  user: StaffUser;
}

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

function isAddonPackage(pkg: StaffPackage): boolean {
  const type = String(pkg.package_type).toLowerCase().trim();
  const name = String(pkg.name).toLowerCase().trim();
  return (
    type === "addon" ||
    type === "add-on" ||
    name.includes("add-on") ||
    name.includes("addon")
  );
}

function BookingFormLoading() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
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

export function NewBookingForm({ role, onCreated, onCancel }: NewBookingFormProps) {
  const [user, setUser] = React.useState<StaffUser | null>(null);
  const [packages, setPackages] = React.useState<StaffPackage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  // 1. Package & Add-on
  const [selectedPackageId, setSelectedPackageId] = React.useState<string>("");
  const [selectedAddonId, setSelectedAddonId] = React.useState<string>("none");

  // Schedule
  const [eventDate, setEventDate] = React.useState<string>(tomorrowDate());
  const [timeStart, setTimeStart] = React.useState<string>("21:00");
  const [timeEnd, setTimeEnd] = React.useState<string>("22:00");
  const [observationSpot, setObservationSpot] = React.useState<string>("");

  // 2. Guest Information
  const [guestName, setGuestName] = React.useState<string>("");
  const [roomNumber, setRoomNumber] = React.useState<string>("");
  const [adultCount, setAdultCount] = React.useState<number>(2);
  const [childCount, setChildCount] = React.useState<number>(0);
  const [guestPhone, setGuestPhone] = React.useState<string>("");
  const [guestEmail, setGuestEmail] = React.useState<string>("");
  const [preferredLanguage, setPreferredLanguage] = React.useState<string>("English");
  const [notes, setNotes] = React.useState<string>("");

  // Quick Create Package Modal
  const [quickPackageOpen, setQuickPackageOpen] = React.useState(false);
  const [quickPkgName, setQuickPkgName] = React.useState("Stargazing with Astronomer");
  const [quickPkgAdultPrice, setQuickPkgAdultPrice] = React.useState("65");
  const [quickPkgChildPrice, setQuickPkgChildPrice] = React.useState("65");
  const [quickPkgLocation, setQuickPkgLocation] = React.useState("Observatory Deck");
  const [quickPkgPending, setQuickPkgPending] = React.useState(false);

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

        // Pre-select first main package if available
        const mainPkgs = normalized.filter((p) => !isAddonPackage(p));
        if (mainPkgs.length > 0 && !selectedPackageId) {
          setSelectedPackageId(mainPkgs[0].id);
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat data form.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadForm();
    return () => {
      active = false;
    };
  }, [selectedPackageId]);

  // Filter main packages vs add-on packages
  const addonPackages = React.useMemo(() => packages.filter(isAddonPackage), [packages]);
  const mainPackages = React.useMemo(() => packages.filter((p) => !isAddonPackage(p)), [packages]);

  // Selected package and add-on objects
  const selectedPackage = React.useMemo(
    () => packages.find((p) => p.id === selectedPackageId) || null,
    [packages, selectedPackageId],
  );
  const selectedAddon = React.useMemo(
    () => (selectedAddonId && selectedAddonId !== "none" ? packages.find((p) => p.id === selectedAddonId) || null : null),
    [packages, selectedAddonId],
  );

  // Price calculations
  const adultPrice = Number(selectedPackage?.adult_price_usd ?? 0);
  const childPrice =
    selectedPackage?.package_type === "kids" && Number(selectedPackage.adult_price_usd) === 0
      ? Number(selectedPackage.child_price_usd ?? 0)
      : adultPrice * 0.5;

  const addonAdultPrice = Number(selectedAddon?.adult_price_usd ?? 0);

  const baseAdultTotal = adultCount * adultPrice;
  const baseChildTotal = childCount * childPrice;
  const baseAddonTotal = selectedAddon ? (adultCount * addonAdultPrice) : 0;

  const isChargeable = selectedPackage?.is_chargeable !== false;
  const baseTotal = isChargeable ? baseAdultTotal + baseChildTotal + baseAddonTotal : 0;
  const serviceCharge = isChargeable ? Math.round(baseTotal * 0.1 * 100) / 100 : 0;
  const gst = isChargeable ? Math.round(baseTotal * 0.17 * 100) / 100 : 0;
  const grandTotal = isChargeable ? baseTotal + serviceCharge + gst : 0;

  const readOnly = user?.access_role_level === "read_only";

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
      if (!res.ok) throw new Error(data.error || "Gagal membuat package.");
      const newPkg = normalizePackage(data.package);
      setPackages((prev) => [newPkg, ...prev]);
      setSelectedPackageId(newPkg.id);
      setQuickPackageOpen(false);
      toast.success(`Package "${newPkg.name}" berhasil dibuat dan dipilih!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat package");
    } finally {
      setQuickPkgPending(false);
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;

    if (!selectedPackage) {
      setError("Please select a package from the dropdown.");
      return;
    }
    if (!guestName.trim()) {
      setError("Please enter the guest name.");
      return;
    }
    if (!roomNumber.trim()) {
      setError("Please enter the room or villa number.");
      return;
    }
    if (timeEnd <= timeStart) {
      setError("End time must be after start time.");
      return;
    }

    setSubmitting(true);
    setError("");

    // Build participants: 1 lead participant + companions + kids
    const participantsPayload: Array<{
      fullName: string;
      type: "adult" | "child";
      age: number | null;
      nationality: string;
      notes: string | null;
    }> = [
      {
        fullName: guestName.trim(),
        type: "adult",
        age: null,
        nationality: "International",
        notes: null,
      },
    ];
    for (let i = 2; i <= adultCount; i++) {
      participantsPayload.push({
        fullName: `${guestName.trim()} - Guest ${i}`,
        type: "adult" as const,
        age: null,
        nationality: "International",
        notes: null,
      });
    }

    for (let i = 1; i <= childCount; i++) {
      participantsPayload.push({
        fullName: `${guestName.trim()} - Kid ${i}`,
        type: "child" as const,
        age: 8,
        nationality: "International",
        notes: null,
      });
    }

    // Build experiences
    const experiencesPayload = [
      {
        packageId: selectedPackage.id,
        eventDate,
        timeStart,
        timeEnd,
        observationSpot: observationSpot.trim() || null,
      },
    ];

    if (selectedAddon) {
      experiencesPayload.push({
        packageId: selectedAddon.id,
        eventDate,
        timeStart,
        timeEnd,
        observationSpot: observationSpot.trim() || null,
      });
    }

    const payload = {
      packageId: selectedPackage.id,
      eventDate,
      timeStart,
      timeEnd,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim() || null,
      guestEmail: guestEmail.trim() || null,
      roomNumber: roomNumber.trim(),
      nationality: "International",
      adultCount,
      childCount,
      childAges: childCount > 0 ? Array(childCount).fill("8").join(", ") : "",
      participants: participantsPayload,
      experiences: experiencesPayload,
      preferredLanguage,
      observationSpot: observationSpot.trim() || null,
      specialOccasion: "",
      dietaryRestrictions: "",
      privacyPreference: "Standard",
      rescheduleConsent: "Yes",
      slotStatus: "available",
      bookingSource: "WhatsApp",
      paymentMethod: "Bank transfer",
      notes: notes.trim() || "",
      packageNotes: selectedAddon ? `Add-on: ${selectedAddon.name}` : "",
      addOns: selectedAddon ? [selectedAddon.name] : [],
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
      toast.success(`Booking ${response.booking.booking_code} created successfully!`);
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
    <div data-staff-booking-form={role} className="flex min-w-0 flex-col gap-6">
      {loading ? <BookingFormLoading /> : null}

      {!loading && error ? (
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>Notice</AlertTitle>
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
              className="w-fit border-0 bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-sm hover:from-fuchsia-400 hover:to-violet-500"
              onClick={() => setQuickPackageOpen(true)}
            >
              <Plus data-icon="inline-start" /> Quick create package (e.g. Stargazing with Astronomer - $65)
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && packages.length ? (
        <form onSubmit={handleFormSubmit} noValidate>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* LEFT COLUMN: All In One Page */}
            <div className="space-y-6">
              {/* SECTION 1: PACKAGE & ADD-ON SELECTION */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b bg-muted/20 pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-cyan-400" />
                    <div>
                      <CardTitle className="text-base font-semibold">1. Experience & Package</CardTitle>
                      <CardDescription>
                        Select the stargazing package from the dropdown and add any optional add-ons.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    {/* PACKAGE DROPDOWN */}
                    <Field>
                      <FieldLabel htmlFor="booking-package">Package *</FieldLabel>
                      <Select
                        value={selectedPackageId}
                        onValueChange={(val) => {
                          setSelectedPackageId(val);
                          setError("");
                        }}
                      >
                        <SelectTrigger id="booking-package" className="w-full font-medium">
                          <SelectValue placeholder="Select a package..." />
                        </SelectTrigger>
                        <SelectContent>
                          {mainPackages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              {pkg.name} ({formatUsd(pkg.adult_price_usd)}/adult)
                            </SelectItem>
                          ))}
                          {mainPackages.length === 0 && (
                            <SelectItem value="__none__" disabled>
                              No main packages found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </Field>

                    {/* ADD-ON COLUMN DROPDOWN */}
                    <Field>
                      <FieldLabel htmlFor="booking-addon">Add-on (optional)</FieldLabel>
                      <Select value={selectedAddonId} onValueChange={setSelectedAddonId}>
                        <SelectTrigger id="booking-addon" className="w-full">
                          <SelectValue placeholder="None (No add-on)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (No add-on)</SelectItem>
                          {addonPackages.map((addon) => (
                            <SelectItem key={addon.id} value={addon.id}>
                              {addon.name} {addon.adult_price_usd > 0 ? `(+${formatUsd(addon.adult_price_usd)})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {addonPackages.length === 0 ? (
                        <p className="mt-1 text-muted-foreground text-xs">
                          No add-ons available for this resort.
                        </p>
                      ) : null}
                    </Field>
                  </div>

                  {/* SCHEDULE: DATE & TIME */}
                  <div className="grid gap-5 border-border/50 border-t pt-5 sm:grid-cols-3">
                    <Field>
                      <FieldLabel className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> Event Date *
                      </FieldLabel>
                      <DatePicker value={eventDate} onValueChange={(d) => d && setEventDate(d)} />
                    </Field>

                    <Field>
                      <FieldLabel className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Start Time *
                      </FieldLabel>
                      <TimePicker value={timeStart} onValueChange={setTimeStart} />
                    </Field>

                    <Field>
                      <FieldLabel className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" /> End Time *
                      </FieldLabel>
                      <TimePicker value={timeEnd} onValueChange={setTimeEnd} />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 2: GUEST INFORMATION */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b bg-muted/20 pb-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-indigo-400" />
                    <div>
                      <CardTitle className="text-base font-semibold">2. Guest Information</CardTitle>
                      <CardDescription>
                        One name is enough to proceed (e.g. Julian Family). Phone & email are optional.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    {/* GUEST NAME */}
                    <Field>
                      <FieldLabel htmlFor="booking-guest-name">Guest Name *</FieldLabel>
                      <Input
                        id="booking-guest-name"
                        placeholder="e.g. Julian Family"
                        value={guestName}
                        onChange={(e) => {
                          setGuestName(e.target.value);
                          setError("");
                        }}
                        required
                        className="font-medium"
                      />
                    </Field>

                    {/* VILLA / ROOM NUMBER */}
                    <Field>
                      <FieldLabel htmlFor="booking-room">Villa / Room Number *</FieldLabel>
                      <Input
                        id="booking-room"
                        placeholder="e.g. Villa 102"
                        value={roomNumber}
                        onChange={(e) => {
                          setRoomNumber(e.target.value);
                          setError("");
                        }}
                        required
                        maxLength={20}
                      />
                    </Field>
                  </div>

                  {/* NUMBER OF PARTICIPANTS (ADULTS & KIDS) */}
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-cyan-400" />
                      <span className="font-semibold text-foreground text-sm">Number of Participants</span>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="booking-adults">Number of Adults *</FieldLabel>
                        <Input
                          id="booking-adults"
                          type="number"
                          min={1}
                          max={20}
                          onChange={(e) => setAdultCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          required
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="booking-kids">Number of Kids (under 12y)</FieldLabel>
                        <Input
                          id="booking-kids"
                          type="number"
                          min={0}
                          max={20}
                          onChange={(e) => setChildCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        />
                        {childCount > 0 ? (
                          <p className="mt-1 font-medium text-cyan-400 text-xs">
                            ✓ {childCount} kid participant{childCount > 1 ? "s" : ""} included (50% package rate)
                          </p>
                        ) : (
                          <p className="mt-1 text-muted-foreground text-xs">
                            Kids receive 50% discount on regular stargazing packages.
                          </p>
                        )}
                      </Field>
                    </div>
                  </div>

                  {/* WHATSAPP & EMAIL (OPTIONAL) */}
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="booking-phone">Phone / WhatsApp (optional)</FieldLabel>
                      <Input
                        id="booking-phone"
                        placeholder="+62... / +960..."
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        maxLength={30}
                        autoComplete="tel"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="booking-email">Email (optional)</FieldLabel>
                      <Input
                        id="booking-email"
                        type="email"
                        placeholder="guest@example.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        maxLength={254}
                        autoComplete="email"
                      />
                    </Field>
                  </div>

                  {/* OPTIONAL EXTRAS */}
                  <div className="grid gap-5 border-border/50 border-t pt-4 md:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor="booking-language">Preferred Language</FieldLabel>
                      <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                        <SelectTrigger id="booking-language" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Bahasa Indonesia">Bahasa Indonesia</SelectItem>
                          <SelectItem value="Arabic">Arabic</SelectItem>
                          <SelectItem value="Mandarin">Mandarin</SelectItem>
                          <SelectItem value="Russian">Russian</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="booking-spot">Observation Spot (optional)</FieldLabel>
                      <Input
                        id="booking-spot"
                        placeholder="e.g. Sunset Pier"
                        value={observationSpot}
                        onChange={(e) => setObservationSpot(e.target.value)}
                        maxLength={120}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="booking-notes">Notes (optional)</FieldLabel>
                      <Input
                        id="booking-notes"
                        placeholder="e.g. Anniversary celebration"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={500}
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: LIVE PRICE SUMMARY & BOOK NOW */}
            <div className="space-y-4">
              <Card className="sticky top-6 border-cyan-500/30 bg-card/95 shadow-lg backdrop-blur-sm">
                <CardHeader className="border-b bg-muted/20 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-semibold text-base">Booking Summary</CardTitle>
                    {selectedPackage ? (
                      <Badge variant="outline" className="border-cyan-500/40 bg-cyan-950/30 font-medium text-cyan-300">
                        {selectedPackage.name}
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm">
                  {selectedPackage ? (
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-slate-300">
                        <span>Adults ({adultCount} × {formatUsd(adultPrice)})</span>
                        <span className="font-semibold text-slate-100">{formatUsd(baseAdultTotal)}</span>
                      </div>

                      {childCount > 0 ? (
                        <div className="flex justify-between text-slate-300">
                          <span>Kids ({childCount} × {formatUsd(childPrice)})</span>
                          <span className="font-semibold text-slate-100">{formatUsd(baseChildTotal)}</span>
                        </div>
                      ) : null}

                      {selectedAddon ? (
                        <div className="flex justify-between text-cyan-300">
                          <span className="truncate pr-2">Add-on: {selectedAddon.name}</span>
                          <span className="font-semibold text-cyan-200">+{formatUsd(baseAddonTotal)}</span>
                        </div>
                      ) : null}

                      <Separator className="my-2 border-slate-700/60" />

                      <div className="flex justify-between text-slate-400 text-xs">
                        <span>Subtotal</span>
                        <span className="text-slate-200 font-medium">{formatUsd(baseTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-xs">
                        <span>Service Charge (10%)</span>
                        <span className="text-slate-200 font-medium">{formatUsd(serviceCharge)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-xs">
                        <span>Tourism GST (17%)</span>
                        <span className="text-slate-200 font-medium">{formatUsd(gst)}</span>
                      </div>

                      <Separator className="my-2 border-slate-700/60" />

                      <div className="flex items-baseline justify-between pt-1">
                        <span className="font-bold text-base text-white">Total Price</span>
                        <span className="font-extrabold text-2xl text-emerald-400 drop-shadow-sm">
                          {formatUsd(grandTotal)}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Automatically calculated for {adultCount + childCount} participant{adultCount + childCount > 1 ? "s" : ""}.
                      </p>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-muted-foreground text-sm">
                      Select a package to see price breakdown.
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col gap-2 border-t pt-4">
                  <Button
                    type="submit"
                    className="h-12 w-full border-0 bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-base text-white shadow-md hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                    disabled={submitting || readOnly || !selectedPackage || !guestName.trim() || !roomNumber.trim()}
                  >
                    {submitting ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" /> Creating Booking...
                      </>
                    ) : (
                      "Book Now"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      ) : null}

      {/* Quick Create Package Dialog */}
      <Dialog open={quickPackageOpen} onOpenChange={setQuickPackageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Create Package</DialogTitle>
            <DialogDescription>
              Create an initial stargazing package for this resort so you can immediately create bookings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field>
              <FieldLabel>Package Name</FieldLabel>
              <Input
                value={quickPkgName}
                onChange={(e) => setQuickPkgName(e.target.value)}
                placeholder="Stargazing with Astronomer"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Adult Price (USD)</FieldLabel>
                <Input
                  type="number"
                  value={quickPkgAdultPrice}
                  onChange={(e) => setQuickPkgAdultPrice(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Child Price (USD)</FieldLabel>
                <Input
                  type="number"
                  value={quickPkgChildPrice}
                  onChange={(e) => setQuickPkgChildPrice(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Location</FieldLabel>
              <Input
                value={quickPkgLocation}
                onChange={(e) => setQuickPkgLocation(e.target.value)}
                placeholder="Observatory Deck"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuickPackageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuickPackage} disabled={quickPkgPending}>
              {quickPkgPending ? "Saving..." : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
