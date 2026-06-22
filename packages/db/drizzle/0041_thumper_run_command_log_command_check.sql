ALTER TABLE "thumper_run_command_log" ADD CONSTRAINT "thumper_run_command_log_command_check" CHECK ("command" in ('drill', 'bank', 'brace', 'vent'));
