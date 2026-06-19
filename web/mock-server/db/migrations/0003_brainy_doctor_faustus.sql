ALTER TABLE `player_progress` ADD `completed_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_progress` ADD `pending_rewards` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `quests` ADD `repeat` text;
