CREATE TABLE IF NOT EXISTS "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pilot_id" text NOT NULL,
	"schematic_id" text NOT NULL,
	"schematic_version" integer NOT NULL,
	"display_name" text NOT NULL,
	"property_scores" jsonb NOT NULL,
	"provenance" jsonb NOT NULL,
	"has_minor_flaw" boolean DEFAULT false NOT NULL,
	"condition" integer DEFAULT 100 NOT NULL,
	"integrity" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crafting_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pilot_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"schematic_id" text NOT NULL,
	"schematic_version" integer NOT NULL,
	"craft_mode" text NOT NULL,
	"experiment_seed" text,
	"tuning" jsonb NOT NULL,
	"slot_selections" jsonb NOT NULL,
	"preview" jsonb NOT NULL,
	"result_explanation" jsonb NOT NULL,
	"experiment_outcome" text,
	"has_minor_flaw" boolean DEFAULT false NOT NULL,
	"item_id" uuid,
	"status" text NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crafting_attempts" ADD CONSTRAINT "crafting_attempts_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crafting_attempts" ADD CONSTRAINT "crafting_attempts_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crafting_attempts_pilot_idempotency_idx" ON "crafting_attempts" USING btree ("pilot_id","idempotency_key");
