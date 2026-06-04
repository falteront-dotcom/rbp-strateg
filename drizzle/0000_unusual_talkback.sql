CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`base_potential` real NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_name_unique` ON `assets` (`name`);--> statement-breakpoint
CREATE TABLE `squadron_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`squadron_id` integer NOT NULL,
	`asset_id` integer NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`squadron_id`) REFERENCES `squadrons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `squadrons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`side` text NOT NULL,
	`created_at` integer
);
