CREATE TABLE `drama_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`type` text NOT NULL,
	`position` integer NOT NULL,
	`synced_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drama_lists_book_id_type_idx` ON `drama_lists` (`book_id`, `type`);--> statement-breakpoint
CREATE INDEX `drama_lists_position_idx` ON `drama_lists` (`position`);--> statement-breakpoint
INSERT INTO `drama_lists` (`id`, `book_id`, `type`, `position`, `synced_at`)
SELECT `id`, `book_id`, 'latest', `position`, `synced_at` FROM `latest_dramas`;--> statement-breakpoint
INSERT INTO `drama_lists` (`id`, `book_id`, `type`, `position`, `synced_at`)
SELECT `id`, `book_id`, 'featured', `position`, `synced_at` FROM `featured_dramas`;--> statement-breakpoint
DROP TABLE `latest_dramas`;--> statement-breakpoint
DROP TABLE `featured_dramas`;
