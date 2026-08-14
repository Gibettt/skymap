import { z } from 'zod';

export const updateSkySettingsSchema = z.object({
  name: z.string().trim().min(1, 'Nama lokasi wajib diisi').max(120),
  latitude: z.coerce.number().min(-90, 'Latitude tidak valid').max(90, 'Latitude tidak valid'),
  longitude: z.coerce.number().min(-180, 'Longitude tidak valid').max(180, 'Longitude tidak valid'),
  timezone: z.string().trim().min(1, 'Timezone wajib diisi').max(64),
});
