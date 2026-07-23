CREATE TABLE `oauth_connections` (
	`user_email` text NOT NULL,
	`provider` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`token_expires_at` integer,
	`instance_url` text,
	`external_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_email`, `provider`)
);
