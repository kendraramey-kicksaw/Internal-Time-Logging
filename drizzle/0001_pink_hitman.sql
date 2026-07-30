CREATE TABLE `setup_installations` (
	`install_id` text PRIMARY KEY NOT NULL,
	`user_hash` text,
	`email_domain` text,
	`app_version` text,
	`source` text,
	`local_mode` integer DEFAULT 1 NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`checkin_count` integer DEFAULT 1 NOT NULL,
	`user_agent` text
);
--> statement-breakpoint
CREATE INDEX `setup_installations_user_hash_idx` ON `setup_installations` (`user_hash`);--> statement-breakpoint
CREATE INDEX `setup_installations_last_seen_idx` ON `setup_installations` (`last_seen_at`);