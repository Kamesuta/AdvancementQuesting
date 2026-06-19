CREATE TABLE `quest_completions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_uuid` text NOT NULL,
	`player_name` text NOT NULL,
	`quest_id` integer NOT NULL,
	`completed_at` text NOT NULL
);
