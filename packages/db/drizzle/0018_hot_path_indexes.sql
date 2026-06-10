CREATE INDEX "economy_ledger_pilot_id_idx" ON "economy_ledger" USING btree ("pilot_id");--> statement-breakpoint
CREATE INDEX "items_pilot_id_idx" ON "items" USING btree ("pilot_id");--> statement-breakpoint
CREATE INDEX "thumper_runs_pilot_id_deployed_at_idx" ON "thumper_runs" USING btree ("pilot_id","deployed_at");