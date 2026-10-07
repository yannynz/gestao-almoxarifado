import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ["ADMIN", "OPERATOR"]);
export const toolStatusEnum = pgEnum("tool_status", ["ACTIVE", "MAINTENANCE"]);
export const movementTypeEnum = pgEnum("movement_type", ["ENTRY", "CONSUMPTION", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("OPERATOR"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("users_single_admin_idx").on(table.role).where(sql`${table.role} = 'ADMIN'`),
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("sessions_expires_at_idx").on(table.expiresAt)]);

export const loginRateLimits = pgTable("login_rate_limits", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull().default(1),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("login_rate_limits_blocked_until_idx").on(table.blockedUntil)]);

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  registrationCode: text("registration_code").unique(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tools = pgTable("tools", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  status: toolStatusEnum("status").notNull().default("ACTIVE"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("tools_status_idx").on(table.status)]);

export const toolLoans = pgTable("tool_loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  toolId: uuid("tool_id").notNull().references(() => tools.id, { onDelete: "restrict" }),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "restrict" }),
  checkedOutBy: uuid("checked_out_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  checkedOutAt: timestamp("checked_out_at", { withTimezone: true }).notNull().defaultNow(),
  returnedBy: uuid("returned_by").references(() => users.id, { onDelete: "restrict" }),
  returnedAt: timestamp("returned_at", { withTimezone: true }),
  notes: text("notes"),
}, (table) => [
  uniqueIndex("tool_loans_one_open_per_tool").on(table.toolId).where(sql`${table.returnedAt} is null`),
  index("tool_loans_employee_idx").on(table.employeeId),
  index("tool_loans_returned_at_idx").on(table.returnedAt),
  check("tool_loans_return_consistent", sql`(${table.returnedAt} is null and ${table.returnedBy} is null) or (${table.returnedAt} is not null and ${table.returnedBy} is not null and ${table.returnedAt} >= ${table.checkedOutAt})`),
]);

export const supplies = pgTable("supplies", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(0),
  minimumQuantity: integer("minimum_quantity").notNull().default(0),
  unit: text("unit").notNull().default("UN"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("supplies_quantity_nonnegative", sql`${table.quantity} >= 0`),
  check("supplies_minimum_nonnegative", sql`${table.minimumQuantity} >= 0`),
]);

export const supplyMovements = pgTable("supply_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  operationId: uuid("operation_id").notNull().unique(),
  supplyId: uuid("supply_id").notNull().references(() => supplies.id, { onDelete: "restrict" }),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "restrict" }),
  type: movementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  registeredBy: uuid("registered_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("supply_movements_quantity_positive", sql`${table.quantity} > 0`),
  index("supply_movements_created_idx").on(table.createdAt),
]);
