import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { PageHeader } from "../_components/page-header";
import { RewardSettingsForm } from "../_components/reward-settings-form";
import { getRewardSettings } from "../_lib/admin-data";

export default async function SettingsPage() {
  const settings = await getRewardSettings();
  const safeSettings = settings ?? {
    star_adult_unit: 1,
    star_child_unit: 0.5,
    star_threshold: 10,
    star_bonus_usd: 5,
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title="Pengaturan" description="Konfigurasi operasional yang tersimpan di PostgreSQL." />
      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <CardTitle>Reward bintang</CardTitle>
          <CardDescription>Atur unit per tamu, ambang reward, dan nilai bonus.</CardDescription>
        </CardHeader>
        <CardContent>
          <RewardSettingsForm settings={safeSettings} />
        </CardContent>
      </Card>
      <Card className="max-w-3xl" size="sm">
        <CardHeader>
          <CardTitle>Koneksi portal</CardTitle>
          <CardDescription>
            Landing: {process.env.NEXT_PUBLIC_LANDING_URL || "belum diatur"} · Staff:{" "}
            {process.env.NEXT_PUBLIC_STAFF_URL || "belum diatur"}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
