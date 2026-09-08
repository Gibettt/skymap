import { z } from 'zod';
import { uuidSchema } from './common.js';

export const baseRoleSchema = z.enum(['admin', 'internal', 'external']);
export const accessLevelSchema = z.enum(['full', 'scoped', 'read_only']);
export const permissionKeySchema = z.string().trim().regex(/^(admin|staff)\.[a-z_]+$/).max(80);

export const createAccessRoleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).default(''),
  baseRole: baseRoleSchema,
  accessLevel: accessLevelSchema.default('scoped'),
  permissionKeys: z.array(permissionKeySchema).max(50).default([]).transform((keys) => [...new Set(keys)]),
});

export const updateAccessRoleSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('details'),
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(240).default(''),
    accessLevel: accessLevelSchema,
  }),
  z.object({
    action: z.literal('permissions'),
    permissionKeys: z.array(permissionKeySchema).max(50).transform((keys) => [...new Set(keys)]),
  }),
  z.object({
    action: z.literal('members'),
    memberIds: z.array(uuidSchema).max(500).transform((ids) => [...new Set(ids)]),
  }),
  z.object({ action: z.literal('review') }),
]);

export const importAccessRolesSchema = z
  .object({
    roles: z.array(createAccessRoleSchema).min(1).max(100),
  })
  .superRefine(({ roles }, context) => {
    const names = new Set();
    roles.forEach((role, index) => {
      const normalizedName = role.name.toLocaleLowerCase("en-US");
      if (names.has(normalizedName)) {
        context.addIssue({
          code: "custom",
          message: "Role names in an import must be unique",
          path: ["roles", index, "name"],
        });
      }
      names.add(normalizedName);
    });
  });
