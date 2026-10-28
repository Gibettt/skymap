"use client";

import * as React from "react";

import { Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { type StaffBooking, staffApi } from "../../_lib/staff-api";

const STAR_LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

/** Read-only stars for a saved rating. */
export function StaffReviewStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {STAR_LABELS.map((label, index) => (
        <Star
          key={label}
          aria-hidden="true"
          className={cn("size-4", index < rating ? "fill-amber-400 text-amber-400" : "text-slate-500")}
        />
      ))}
    </span>
  );
}

export function StaffReviewDialog({
  booking,
  onOpenChange,
  onSaved,
}: {
  booking: StaffBooking | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setRating(booking?.staff_review?.rating ?? 0);
    setComment(booking?.staff_review?.comment ?? "");
  }, [booking]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!booking || rating < 1) {
      toast.error("Choose 1 to 5 stars.");
      return;
    }
    setSaving(true);
    try {
      await staffApi(`/api/bookings/${booking.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      toast.success(`Thanks — your rating for ${booking.booking_code} was saved.`);
      onOpenChange(false);
      await onSaved();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Your rating could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(booking)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form className="flex flex-col gap-4" onSubmit={save}>
          <DialogHeader>
            <DialogTitle>Rate this experience</DialogTitle>
            <DialogDescription>
              {booking ? `${booking.package_name} · ${booking.guest_name} · ${booking.booking_code}` : ""}
            </DialogDescription>
          </DialogHeader>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-medium text-sm">Your rating</legend>
            <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
              {STAR_LABELS.map((label, index) => {
                const value = index + 1;
                const selected = value <= rating;
                return (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} ${value === 1 ? "star" : "stars"} — ${label}`}
                    className="rounded-md p-1.5 outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95"
                    onClick={() => setRating(value)}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === "ArrowRight" || keyEvent.key === "ArrowUp") setRating(Math.min(5, value + 1));
                      if (keyEvent.key === "ArrowLeft" || keyEvent.key === "ArrowDown") setRating(Math.max(1, value - 1));
                    }}
                  >
                    <Star
                      aria-hidden="true"
                      className={cn("size-8", selected ? "fill-amber-400 text-amber-400" : "text-muted-foreground")}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {rating ? STAR_LABELS[rating - 1] : "Tap a star to rate the session."}
            </p>
          </fieldset>

          <Field>
            <FieldLabel htmlFor="staff-review-comment">Feedback (optional)</FieldLabel>
            <Textarea
              id="staff-review-comment"
              value={comment}
              maxLength={1000}
              placeholder="How did the session go? Anything the resort team should know?"
              onChange={(changeEvent) => setComment(changeEvent.target.value)}
            />
            <FieldDescription>Visible to the resort team and administrators.</FieldDescription>
          </Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving || rating < 1}>
              {saving ? <Spinner data-icon="inline-start" /> : <Star data-icon="inline-start" />}
              {saving ? "Saving..." : booking?.staff_review ? "Update rating" : "Save rating"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
