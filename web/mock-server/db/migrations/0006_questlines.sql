CREATE TABLE IF NOT EXISTS `questlines` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL DEFAULT 'メインクエストライン',
  `icon` text,
  `order` integer NOT NULL DEFAULT 1,
  `nodes` text NOT NULL DEFAULT '[]'
);--> statement-breakpoint
INSERT OR IGNORE INTO `questlines` (`id`, `title`, `icon`, `order`, `nodes`) VALUES ('00000000', 'メインクエストライン', NULL, 1, '[]');--> statement-breakpoint
ALTER TABLE `quests` ADD COLUMN `questline_id` text NOT NULL DEFAULT '00000000';--> statement-breakpoint
ALTER TABLE `player_progress` ADD COLUMN `questline_id` text NOT NULL DEFAULT '00000000';--> statement-breakpoint
ALTER TABLE `quest_completions` ADD COLUMN `questline_id` text NOT NULL DEFAULT '00000000';--> statement-breakpoint
ALTER TABLE `reward_claims` ADD COLUMN `questline_id` text NOT NULL DEFAULT '00000000';--> statement-breakpoint
ALTER TABLE `quest_proposals` ADD COLUMN `questline_id` text NOT NULL DEFAULT '00000000';
