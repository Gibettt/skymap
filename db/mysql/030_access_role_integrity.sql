START TRANSACTION;

UPDATE users user_record
LEFT JOIN access_roles assigned_role ON assigned_role.id = user_record.access_role_id
JOIN access_roles fallback_role
  ON fallback_role.is_system = TRUE
  AND fallback_role.status = 'active'
  AND fallback_role.base_role = user_record.role
SET user_record.access_role_id = fallback_role.id
WHERE assigned_role.id IS NULL
  OR assigned_role.status <> 'active'
  OR assigned_role.base_role <> user_record.role;

SET @role_identity_index_exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'access_roles'
    AND index_name = 'uq_access_roles_id_base_role'
);
SET @role_identity_index_sql = IF(
  @role_identity_index_exists = 0,
  'ALTER TABLE access_roles ADD UNIQUE KEY uq_access_roles_id_base_role (id, base_role)',
  'SELECT 1'
);
PREPARE role_identity_index_stmt FROM @role_identity_index_sql;
EXECUTE role_identity_index_stmt;
DEALLOCATE PREPARE role_identity_index_stmt;

SET @compatible_role_fk_exists = (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'users'
    AND constraint_name = 'fk_users_access_role_base'
);
SET @compatible_role_fk_sql = IF(
  @compatible_role_fk_exists = 0,
  'ALTER TABLE users ADD CONSTRAINT fk_users_access_role_base FOREIGN KEY (access_role_id, role) REFERENCES access_roles(id, base_role) ON DELETE RESTRICT',
  'SELECT 1'
);
PREPARE compatible_role_fk_stmt FROM @compatible_role_fk_sql;
EXECUTE compatible_role_fk_stmt;
DEALLOCATE PREPARE compatible_role_fk_stmt;

COMMIT;
