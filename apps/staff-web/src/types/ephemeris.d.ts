declare module "@ephemeris/auth" {
  export interface EphemerisUser {
    id: string;
    name: string;
    email: string;
    role: "admin" | "internal" | "external";
    status: string;
    resort_id: string | null;
    access_role_id: string | null;
    access_role_name?: string | null;
    access_role_slug?: string | null;
    access_role_status?: string | null;
    access_role_level?: "full" | "scoped" | "read_only" | null;
    resort_name?: string | null;
    resort_code?: string | null;
    resort_location?: string | null;
    resort_status?: string | null;
  }

  export function currentUser(): Promise<EphemerisUser | null>;
  export function getUserPermissions(user: EphemerisUser): Promise<string[]>;
}
