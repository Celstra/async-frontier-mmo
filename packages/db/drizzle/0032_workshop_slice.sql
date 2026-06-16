ALTER TABLE "items" ADD COLUMN "favorited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "reclaimed_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "workshop_reclaims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pilot_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"returned_resources" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pilot_workshop_state" (
	"pilot_id" text PRIMARY KEY NOT NULL,
	"starter_granted_at" timestamp with time zone,
	"craft_count_since_crate" integer DEFAULT 0 NOT NULL,
	"next_timed_crate_at" timestamp with time zone,
	"crate_sequence" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop_crates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pilot_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opened_at" timestamp with time zone,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workshop_reclaims" ADD CONSTRAINT "workshop_reclaims_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_reclaims" ADD CONSTRAINT "workshop_reclaims_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_workshop_state" ADD CONSTRAINT "pilot_workshop_state_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_crates" ADD CONSTRAINT "workshop_crates_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_reclaims_pilot_idempotency_idx" ON "workshop_reclaims" USING btree ("pilot_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "workshop_reclaims_pilot_item_idx" ON "workshop_reclaims" USING btree ("pilot_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_crates_pilot_sequence_idx" ON "workshop_crates" USING btree ("pilot_id","sequence");--> statement-breakpoint
CREATE INDEX "workshop_crates_pilot_status_idx" ON "workshop_crates" USING btree ("pilot_id","status");
