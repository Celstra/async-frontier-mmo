ALTER TABLE "pilots" ADD COLUMN IF NOT EXISTS "equipped_scanner_item_id" uuid;
--> statement-breakpoint
ALTER TABLE "pilots" ADD CONSTRAINT "pilots_equipped_scanner_item_id_items_id_fk" FOREIGN KEY ("equipped_scanner_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
