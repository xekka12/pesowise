ALTER TABLE "users" ADD CONSTRAINT "users_threshold_range" CHECK ("warning_threshold" BETWEEN 50 AND 95);

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_date_format" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');

ALTER TABLE "budgets" ADD CONSTRAINT "budgets_limit_positive" CHECK ("limit_amount" > 0);
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_month_valid" CHECK ("month" BETWEEN 1 AND 12);
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_year_valid" CHECK ("year" BETWEEN 2000 AND 2100);

ALTER TABLE "savings_goals" ADD CONSTRAINT "goals_target_positive" CHECK ("target_amount" > 0);
ALTER TABLE "savings_goals" ADD CONSTRAINT "goals_saved_nonnegative" CHECK ("saved_amount" >= 0);
ALTER TABLE "savings_goals" ADD CONSTRAINT "goals_saved_within_target" CHECK ("saved_amount" <= "target_amount");
ALTER TABLE "savings_goals" ADD CONSTRAINT "goals_target_date_format" CHECK ("target_date" IS NULL OR "target_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');

ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_start_date_format" CHECK ("start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_end_date_format" CHECK ("end_date" IS NULL OR "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_next_date_format" CHECK ("next_occurrence" IS NULL OR "next_occurrence" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
