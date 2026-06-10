CREATE TABLE "resource_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_slug" text NOT NULL,
	"display_name" text NOT NULL,
	"family" text NOT NULL,
	"stat_oq" integer NOT NULL,
	"stat_conductivity" integer NOT NULL,
	"stat_hardness" integer NOT NULL,
	"stat_heat_resistance" integer NOT NULL,
	"stat_malleability" integer NOT NULL,
	"bloom_id" integer NOT NULL,
	"concentration_min_percent" integer NOT NULL,
	"concentration_max_percent" integer NOT NULL,
	"lifespan_days" integer NOT NULL,
	"spawned_at" timestamp with time zone NOT NULL,
	"extinct_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX "resource_instances_display_name_idx" ON "resource_instances" ("display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_instances_bloom_slug_idx" ON "resource_instances" ("bloom_id","resource_slug");--> statement-breakpoint
CREATE TABLE "resource_stacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pilot_id" text NOT NULL,
	"resource_instance_id" uuid NOT NULL,
	"quantity" integer NOT NULL
);--> statement-breakpoint
ALTER TABLE "resource_stacks" ADD CONSTRAINT "resource_stacks_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_stacks" ADD CONSTRAINT "resource_stacks_resource_instance_id_resource_instances_id_fk" FOREIGN KEY ("resource_instance_id") REFERENCES "public"."resource_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "resource_stacks_pilot_instance_idx" ON "resource_stacks" ("pilot_id","resource_instance_id");--> statement-breakpoint
CREATE TABLE "economy_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"pilot_id" text,
	"resource_instance_id" uuid,
	"resource_stack_id" uuid,
	"quantity_delta" integer,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
