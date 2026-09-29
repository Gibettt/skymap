import { ApiError, jsonError, requireUser } from '@ephemeris/auth';
import { searchResortLocations } from '../../../lib/resort-geocoding.js';

export async function GET(request) {
  try {
    await requireUser(['admin']);
    const query = new URL(request.url).searchParams.get('q')?.trim() || '';
    if (query.length < 3 || query.length > 200) {
      throw new ApiError(400, 'Masukkan minimal 3 karakter nama resort atau lokasi');
    }

    return Response.json({
      results: await searchResortLocations(query),
      attribution: 'OpenStreetMap contributors',
    });
  } catch (error) {
    return jsonError(error);
  }
}
