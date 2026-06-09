CREATE TABLE "thumper_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployed_at" timestamp with time zone NOT NULL,
	"duration_seconds" integer NOT NULL
);
