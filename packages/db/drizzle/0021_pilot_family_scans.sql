CREATE TABLE "pilot_family_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pilot_id" text NOT NULL,
	"bloom_id" integer NOT NULL,
	"family" text NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pilot_family_scans" ADD CONSTRAINT "pilot_family_scans_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_family_scans_pilot_bloom_family_idx" ON "pilot_family_scans" USING btree ("pilot_id","bloom_id","family");
