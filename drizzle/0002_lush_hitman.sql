ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'OPERATOR';--> statement-breakpoint
CREATE UNIQUE INDEX "users_single_admin_idx" ON "users" USING btree ("role") WHERE "users"."role" = 'ADMIN';