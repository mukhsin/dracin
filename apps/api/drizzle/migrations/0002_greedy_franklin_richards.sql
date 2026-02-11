CREATE TABLE `auth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`id_token` text,
	`password` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `auth_accounts_user_idx` ON `auth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_accounts_provider_idx` ON `auth_accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `dramas` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`poster_url` text,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`language` text,
	`play_count` text,
	`source_endpoint` text,
	`release_year` integer,
	`country` text,
	`rating` real,
	`total_episodes` integer,
	`genres` text,
	`metadata` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dramas_book_id_unique` ON `dramas` (`book_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `dramas_slug_unique` ON `dramas` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `dramas_slug_idx` ON `dramas` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `dramas_book_id_idx` ON `dramas` (`book_id`);--> statement-breakpoint
CREATE INDEX `dramas_status_idx` ON `dramas` (`status`);--> statement-breakpoint
CREATE INDEX `dramas_title_idx` ON `dramas` (`title`);--> statement-breakpoint
CREATE INDEX `dramas_language_idx` ON `dramas` (`language`);--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`drama_id` text NOT NULL,
	`book_id` text,
	`number` integer NOT NULL,
	`title` text,
	`description` text,
	`duration` integer,
	`video_urls` text,
	`source_url` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`drama_id`) REFERENCES `dramas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_drama_number_idx` ON `episodes` (`drama_id`,`number`);--> statement-breakpoint
CREATE INDEX `episodes_drama_idx` ON `episodes` (`drama_id`);--> statement-breakpoint
CREATE INDEX `episodes_book_id_idx` ON `episodes` (`book_id`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_unique` ON `auth_sessions` (`token`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_idx` ON `auth_sessions` (`token`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`name` text,
	`image` text,
	`avatar_url` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `auth_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_verifications_identifier_idx` ON `auth_verifications` (`identifier`);--> statement-breakpoint
CREATE TABLE `watch_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`episode_id` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`watched_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watch_history_user_episode_idx` ON `watch_history` (`user_id`,`episode_id`);--> statement-breakpoint
CREATE INDEX `watch_history_user_watched_at_idx` ON `watch_history` (`user_id`,`watched_at`);--> statement-breakpoint
CREATE INDEX `watch_history_user_idx` ON `watch_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `watch_history_episode_idx` ON `watch_history` (`episode_id`);--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`drama_id` text NOT NULL,
	`added_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`drama_id`) REFERENCES `dramas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watchlist_user_drama_idx` ON `watchlist` (`user_id`,`drama_id`);--> statement-breakpoint
CREATE INDEX `watchlist_user_added_at_idx` ON `watchlist` (`user_id`,`added_at`);--> statement-breakpoint
CREATE INDEX `watchlist_user_idx` ON `watchlist` (`user_id`);--> statement-breakpoint
CREATE INDEX `watchlist_drama_idx` ON `watchlist` (`drama_id`);