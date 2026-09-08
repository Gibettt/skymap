"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

interface RewardSettings {
  star_adult_unit: string | number;
  star_child_unit: string | number;
  star_threshold: string | number;
  star_bonus_usd: string | number;
}

export function RewardSettingsForm({ settings }: { settings: RewardSettings }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    const response = await fetch("/api/reward-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        starAdultUnit: formData.get("starAdultUnit"),
        starChildUnit: formData.get("starChildUnit"),
        starThreshold: formData.get("starThreshold"),
        starBonusUsd: formData.get("starBonusUsd"),
      }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) {
      toast.error(result.error ?? "Pengaturan gagal disimpan.");
      return;
    }
    toast.success("Pengaturan reward disimpan.");
    router.refresh();
  }

  return (
    <form action={submit} className="flex flex-col gap-5">
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="starAdultUnit">Unit bintang per dewasa</FieldLabel>
          <Input
            id="starAdultUnit"
            name="starAdultUnit"
            type="number"
            step="0.01"
            defaultValue={settings.star_adult_unit}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="starChildUnit">Unit bintang per anak</FieldLabel>
          <Input
            id="starChildUnit"
            name="starChildUnit"
            type="number"
            step="0.01"
            defaultValue={settings.star_child_unit}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="starThreshold">Ambang penukaran</FieldLabel>
          <Input
            id="starThreshold"
            name="starThreshold"
            type="number"
            step="0.01"
            defaultValue={settings.star_threshold}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="starBonusUsd">Bonus (USD)</FieldLabel>
          <Input
            id="starBonusUsd"
            name="starBonusUsd"
            type="number"
            step="0.01"
            defaultValue={settings.star_bonus_usd}
            required
          />
        </Field>
      </FieldGroup>
      <FieldDescription>Perubahan langsung digunakan oleh perhitungan reward booking berikutnya.</FieldDescription>
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Menyimpan..." : "Simpan pengaturan"}
        </Button>
      </div>
    </form>
  );
}
