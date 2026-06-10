CREATE TABLE "pilots" (
	"id" text PRIMARY KEY NOT NULL,
	"frame_id" text DEFAULT 'recon' NOT NULL
);--> statement-breakpoint
INSERT INTO "pilots" ("id", "frame_id") VALUES ('demo-pilot', 'recon');
