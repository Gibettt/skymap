export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function jsonError(error) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}

export async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'Request body bukan JSON yang valid');
  }
}
