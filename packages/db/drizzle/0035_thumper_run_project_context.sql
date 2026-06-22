ALTER TABLE "thumper_runs" ADD COLUMN "run_mode" text;--> statement-breakpoint
ALTER TABLE "thumper_runs" ADD COLUMN "project_schematic_id" text;--> statement-breakpoint
ALTER TABLE "thumper_runs" ADD COLUMN "project_target_slot_id" text;--> statement-breakpoint
ALTER TABLE "thumper_runs" ADD COLUMN "project_target_family" text;--> statement-breakpoint
ALTER TABLE "thumper_runs" ADD COLUMN "project_need_units" integer;--> statement-breakpoint
ALTER TABLE "pilot_project_targets" ADD COLUMN "secured_claim_result_id" uuid;--> statement-breakpoint
ALTER TABLE "pilot_project_targets" ADD COLUMN "secured_resource_stack_id" uuid;--> statement-breakpoint
ALTER TABLE "pilot_project_targets" ADD COLUMN "secured_quantity" integer;--> statement-breakpoint
ALTER TABLE "pilot_project_targets" ADD COLUMN "secured_project_need_units" integer;--> statement-breakpoint
ALTER TABLE "pilot_project_targets" ADD COLUMN "secured_spot_remaining_units" integer;--> statement-breakpoint
ALTER TABLE "pilot_project_targets" ADD CONSTRAINT "pilot_project_targets_secured_claim_result_id_thumper_run_results_id_fk" FOREIGN KEY ("secured_claim_result_id") REFERENCES "public"."thumper_run_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_project_targets" ADD CONSTRAINT "pilot_project_targets_secured_resource_stack_id_resource_stacks_id_fk" FOREIGN KEY ("secured_resource_stack_id") REFERENCES "public"."resource_stacks"("id") ON DELETE no action ON UPDATE no action;
