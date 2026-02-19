CREATE TABLE `featured_dramas` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`position` integer NOT NULL,
	`synced_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `featured_dramas_book_id_unique` ON `featured_dramas` (`book_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `featured_dramas_book_id_idx` ON `featured_dramas` (`book_id`);--> statement-breakpoint
CREATE INDEX `featured_dramas_position_idx` ON `featured_dramas` (`position`);--> statement-breakpoint
CREATE TABLE `latest_dramas` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`position` integer NOT NULL,
	`synced_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `latest_dramas_book_id_unique` ON `latest_dramas` (`book_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `latest_dramas_book_id_idx` ON `latest_dramas` (`book_id`);--> statement-breakpoint
CREATE INDEX `latest_dramas_position_idx` ON `latest_dramas` (`position`);