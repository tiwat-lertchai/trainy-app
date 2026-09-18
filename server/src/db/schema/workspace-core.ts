import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization, organizationMembership } from "./organization";

export const workspaceRecordStatus = pgEnum("workspace_record_status", ["active", "inactive"]);

export const memberTypeSource = pgEnum("member_type_source", [
  "migration",
  "self_claim",
  "invitation",
  "verification",
  "administrator",
]);

export const accessRoleKind = pgEnum("access_role_kind", ["system", "custom"]);

export const authorizationScopeType = pgEnum("authorization_scope_type", [
  "self",
  "assigned",
  "organization_unit",
  "workspace",
]);

export const verificationMethod = pgEnum("verification_method", [
  "registry_match",
  "domain_email",
  "invitation_attestation",
  "manual_review",
  "document_evidence",
  "legacy_migration",
]);

export const verificationClaimStatus = pgEnum("verification_claim_status", [
  "draft",
  "pending",
  "needs_information",
  "verified",
  "rejected",
  "cancelled",
]);

export const organizationMemberType = pgTable(
  "organization_member_type",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    status: workspaceRecordStatus("status").default("active").notNull(),
    isManaged: boolean("is_managed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("organization_member_type_org_key_uidx").on(table.organizationId, table.key),
    uniqueIndex("organization_member_type_id_org_uidx").on(table.id, table.organizationId),
  ],
);

export const membershipMemberType = pgTable(
  "membership_member_type",
  {
    organizationId: uuid("organization_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    memberTypeId: uuid("member_type_id").notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    source: memberTypeSource("source").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.membershipId, table.memberTypeId] }),
    foreignKey({
      columns: [table.membershipId, table.organizationId],
      foreignColumns: [organizationMembership.id, organizationMembership.organizationId],
      name: "membership_member_type_membership_org_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.memberTypeId, table.organizationId],
      foreignColumns: [organizationMemberType.id, organizationMemberType.organizationId],
      name: "membership_member_type_type_org_fk",
    }).onDelete("restrict"),
    uniqueIndex("membership_member_type_one_primary_uidx")
      .on(table.membershipId)
      .where(sql`${table.isPrimary}`),
  ],
);

export const accessPermission = pgTable("access_permission", {
  key: text("key").primaryKey(),
  moduleKey: text("module_key").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accessRole = pgTable(
  "access_role",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    kind: accessRoleKind("kind").notNull(),
    isManaged: boolean("is_managed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("access_role_org_key_uidx").on(table.organizationId, table.key),
    uniqueIndex("access_role_id_org_uidx").on(table.id, table.organizationId),
  ],
);

export const accessRolePermission = pgTable(
  "access_role_permission",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => accessRole.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => accessPermission.key, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionKey] })],
);

export const membershipRoleAssignment = pgTable(
  "membership_role_assignment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    roleId: uuid("role_id").notNull(),
    scopeType: authorizationScopeType("scope_type").default("workspace").notNull(),
    scopeRefId: text("scope_ref_id"),
    grantedByMembershipId: uuid("granted_by_membership_id"),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("membership_role_assignment_membership_idx").on(table.membershipId),
    foreignKey({
      columns: [table.membershipId, table.organizationId],
      foreignColumns: [organizationMembership.id, organizationMembership.organizationId],
      name: "membership_role_assignment_membership_org_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.roleId, table.organizationId],
      foreignColumns: [accessRole.id, accessRole.organizationId],
      name: "membership_role_assignment_role_org_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.grantedByMembershipId, table.organizationId],
      foreignColumns: [organizationMembership.id, organizationMembership.organizationId],
      name: "membership_role_assignment_granter_org_fk",
    }).onDelete("restrict"),
    uniqueIndex("membership_role_assignment_unique_uidx").on(
      table.membershipId,
      table.roleId,
      table.scopeType,
      table.scopeRefId,
    ),
    check(
      "membership_role_assignment_scope_ref",
      sql`(${table.scopeType} = 'organization_unit' AND ${table.scopeRefId} IS NOT NULL) OR (${table.scopeType} <> 'organization_unit' AND ${table.scopeRefId} IS NULL)`,
    ),
    check(
      "membership_role_assignment_expiry_order",
      sql`${table.expiresAt} IS NULL OR ${table.expiresAt} > ${table.grantedAt}`,
    ),
  ],
);

export const workspaceProfile = pgTable(
  "workspace_profile",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id").notNull(),
    displayName: text("display_name"),
    institutionalIdentifier: text("institutional_identifier"),
    institutionalEmail: text("institutional_email"),
    attributes: jsonb("attributes").$type<Record<string, string | number | boolean | null>>(),
    source: text("source").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("workspace_profile_membership_uidx").on(table.membershipId),
    foreignKey({
      columns: [table.membershipId, table.organizationId],
      foreignColumns: [organizationMembership.id, organizationMembership.organizationId],
      name: "workspace_profile_membership_org_fk",
    }).onDelete("cascade"),
    index("workspace_profile_org_identifier_idx").on(
      table.organizationId,
      table.institutionalIdentifier,
    ),
  ],
);

export const verificationClaim = pgTable(
  "verification_claim",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    claimedMemberTypeId: uuid("claimed_member_type_id").notNull(),
    method: verificationMethod("method").notNull(),
    status: verificationClaimStatus("status").default("draft").notNull(),
    identifierNormalized: text("identifier_normalized"),
    evidenceRef: text("evidence_ref"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedByMembershipId: uuid("decided_by_membership_id"),
    reasonCode: text("reason_code"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("verification_claim_membership_status_idx").on(table.membershipId, table.status),
    foreignKey({
      columns: [table.membershipId, table.organizationId],
      foreignColumns: [organizationMembership.id, organizationMembership.organizationId],
      name: "verification_claim_membership_org_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.claimedMemberTypeId, table.organizationId],
      foreignColumns: [organizationMemberType.id, organizationMemberType.organizationId],
      name: "verification_claim_type_org_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.decidedByMembershipId, table.organizationId],
      foreignColumns: [organizationMembership.id, organizationMembership.organizationId],
      name: "verification_claim_reviewer_org_fk",
    }).onDelete("restrict"),
    check(
      "verification_claim_decision_fields",
      sql`(${table.status} IN ('verified', 'rejected') AND ${table.decidedAt} IS NOT NULL) OR (${table.status} NOT IN ('verified', 'rejected'))`,
    ),
    check(
      "verification_claim_no_self_review",
      sql`${table.decidedByMembershipId} IS NULL OR ${table.decidedByMembershipId} <> ${table.membershipId}`,
    ),
  ],
);

export const organizationMemberTypeRelations = relations(
  organizationMemberType,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [organizationMemberType.organizationId],
      references: [organization.id],
    }),
    memberships: many(membershipMemberType),
    verificationClaims: many(verificationClaim),
  }),
);

export const membershipMemberTypeRelations = relations(membershipMemberType, ({ one }) => ({
  membership: one(organizationMembership, {
    fields: [membershipMemberType.membershipId],
    references: [organizationMembership.id],
  }),
  memberType: one(organizationMemberType, {
    fields: [membershipMemberType.memberTypeId],
    references: [organizationMemberType.id],
  }),
}));

export const accessRoleRelations = relations(accessRole, ({ one, many }) => ({
  organization: one(organization, {
    fields: [accessRole.organizationId],
    references: [organization.id],
  }),
  permissions: many(accessRolePermission),
  assignments: many(membershipRoleAssignment),
}));

export const accessRolePermissionRelations = relations(accessRolePermission, ({ one }) => ({
  role: one(accessRole, {
    fields: [accessRolePermission.roleId],
    references: [accessRole.id],
  }),
  permission: one(accessPermission, {
    fields: [accessRolePermission.permissionKey],
    references: [accessPermission.key],
  }),
}));

export const membershipRoleAssignmentRelations = relations(membershipRoleAssignment, ({ one }) => ({
  membership: one(organizationMembership, {
    fields: [membershipRoleAssignment.membershipId],
    references: [organizationMembership.id],
    relationName: "assignedMembership",
  }),
  role: one(accessRole, {
    fields: [membershipRoleAssignment.roleId],
    references: [accessRole.id],
  }),
  grantedBy: one(organizationMembership, {
    fields: [membershipRoleAssignment.grantedByMembershipId],
    references: [organizationMembership.id],
    relationName: "grantingMembership",
  }),
}));

export const workspaceProfileRelations = relations(workspaceProfile, ({ one }) => ({
  organization: one(organization, {
    fields: [workspaceProfile.organizationId],
    references: [organization.id],
  }),
  membership: one(organizationMembership, {
    fields: [workspaceProfile.membershipId],
    references: [organizationMembership.id],
  }),
}));

export const verificationClaimRelations = relations(verificationClaim, ({ one }) => ({
  membership: one(organizationMembership, {
    fields: [verificationClaim.membershipId],
    references: [organizationMembership.id],
    relationName: "claimMembership",
  }),
  claimedMemberType: one(organizationMemberType, {
    fields: [verificationClaim.claimedMemberTypeId],
    references: [organizationMemberType.id],
  }),
  decidedBy: one(organizationMembership, {
    fields: [verificationClaim.decidedByMembershipId],
    references: [organizationMembership.id],
    relationName: "claimReviewer",
  }),
}));
