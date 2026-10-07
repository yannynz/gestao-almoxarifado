CREATE TYPE "public"."movement_type" AS ENUM('ENTRY', 'CONSUMPTION', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'OPERATOR');--> statement-breakpoint
CREATE TYPE "public"."tool_status" AS ENUM('ACTIVE', 'MAINTENANCE');--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"registration_code" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_registration_code_unique" UNIQUE("registration_code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "supplies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"minimum_quantity" integer DEFAULT 0 NOT NULL,
	"unit" text DEFAULT 'UN' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplies_code_unique" UNIQUE("code"),
	CONSTRAINT "supplies_quantity_nonnegative" CHECK ("supplies"."quantity" >= 0),
	CONSTRAINT "supplies_minimum_nonnegative" CHECK ("supplies"."minimum_quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "supply_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"employee_id" uuid,
	"type" "movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"registered_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supply_movements_operation_id_unique" UNIQUE("operation_id"),
	CONSTRAINT "supply_movements_quantity_positive" CHECK ("supply_movements"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "tool_loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"checked_out_by" uuid NOT NULL,
	"checked_out_at" timestamp with time zone DEFAULT now() NOT NULL,
	"returned_by" uuid,
	"returned_at" timestamp with time zone,
	"notes" text,
	CONSTRAINT "tool_loans_return_consistent" CHECK (("tool_loans"."returned_at" is null and "tool_loans"."returned_by" is null) or ("tool_loans"."returned_at" is not null and "tool_loans"."returned_by" is not null and "tool_loans"."returned_at" >= "tool_loans"."checked_out_at"))
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "tool_status" DEFAULT 'ACTIVE' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tools_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'ADMIN' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_movements" ADD CONSTRAINT "supply_movements_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_movements" ADD CONSTRAINT "supply_movements_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_movements" ADD CONSTRAINT "supply_movements_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_loans" ADD CONSTRAINT "tool_loans_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_loans" ADD CONSTRAINT "tool_loans_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_loans" ADD CONSTRAINT "tool_loans_checked_out_by_users_id_fk" FOREIGN KEY ("checked_out_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_loans" ADD CONSTRAINT "tool_loans_returned_by_users_id_fk" FOREIGN KEY ("returned_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "supply_movements_created_idx" ON "supply_movements" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tool_loans_one_open_per_tool" ON "tool_loans" USING btree ("tool_id") WHERE "tool_loans"."returned_at" is null;--> statement-breakpoint
CREATE INDEX "tool_loans_employee_idx" ON "tool_loans" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "tool_loans_returned_at_idx" ON "tool_loans" USING btree ("returned_at");--> statement-breakpoint
CREATE INDEX "tools_status_idx" ON "tools" USING btree ("status");