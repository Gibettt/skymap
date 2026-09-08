import { createLoginHandler } from '@ephemeris/auth';

export const POST = createLoginHandler({ allowedRoles: ['admin'] });
