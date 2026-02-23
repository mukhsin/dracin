CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`drama_id` text NOT NULL,
	`added_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`drama_id`) REFERENCES `dramas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorites_user_drama_idx` ON `favorites` (`user_id`,`drama_id`);--> statement-breakpoint
CREATE INDEX `favorites_user_added_at_idx` ON `favorites` (`user_id`,`added_at`);--> statement-breakpoint
CREATE INDEX `favorites_user_idx` ON `favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `favorites_drama_idx` ON `favorites` (`drama_id`);
