declare module "@ephemeris/auth" {
  export interface EphemerisUser {
    id: string;
    name: string;
    email: string;
    role: "admin" | "internal" | "external";
    status: string;
    resort_id: string | null;
    resort_name?: string | null;
    resort_code?: string | null;
  }

  export function currentUser(): Promise<EphemerisUser | null>;
  export function getUserPermissions(user: EphemerisUser): Promise<string[]>;
}
