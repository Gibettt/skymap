export type Role = {
  id: string;
  slug: string;
  role: string;
  description: string;
  baseRole: string;
  group: string;
  accessLevel: string;
  users: number;
  permissionSets: string[];
  permissionKeys: string[];
  lastReview: string | null;
  permissionsUpdatedAt: string | null;
  owner: string;
  status: "Active" | "Needs review";
  isSystem: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PermissionDefinition = {
  key: string;
  name: string;
  description: string;
  application: string;
  roleCount: number;
};

export type RoleMember = {
  id: string;
  name: string;
  email: string;
  baseRole: string;
  status: string;
  accessRoleId: string;
  resortName: string | null;
};
