import assert from "node:assert/strict";
import test from "node:test";

import {
  createAccessRoleSchema,
  importAccessRolesSchema,
  updateAccessRoleSchema,
} from "../validators/access-role.js";

const validRole = {
  name: "Booking Supervisor",
  description: "Manages the resort booking workflow.",
  baseRole: "internal",
  accessLevel: "scoped",
  permissionKeys: ["staff.bookings", "staff.notifications"],
};

test("role input removes duplicate permission keys and preserves valid access settings", () => {
  const parsed = createAccessRoleSchema.safeParse({
    ...validRole,
    permissionKeys: ["staff.bookings", "staff.bookings"],
  });

  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.data.permissionKeys, ["staff.bookings"]);
});

test("role import rejects case-insensitive duplicate names", () => {
  const parsed = importAccessRolesSchema.safeParse({
    roles: [validRole, { ...validRole, name: "  booking supervisor  " }],
  });

  assert.equal(parsed.success, false);
  assert.match(parsed.error.issues[0].message, /must be unique/i);
});

test("role update input accepts only supported actions", () => {
  assert.equal(
    updateAccessRoleSchema.safeParse({
      action: "delete",
    }).success,
    false,
  );
});
