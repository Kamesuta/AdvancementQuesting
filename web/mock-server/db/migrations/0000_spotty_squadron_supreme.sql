CREATE TABLE `auth_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`player_uuid` text NOT NULL,
	`player_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_uuid` text NOT NULL,
	`quest_id` text NOT NULL,
	`progress` text DEFAULT '[]' NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`reward_claimed` integer DEFAULT false NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`quest_id`) REFERENCES `quests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_quest_unique` ON `player_progress` (`player_uuid`,`quest_id`);--> statement-breakpoint
CREATE TABLE `player_sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`player_uuid` text NOT NULL,
	`player_name` text NOT NULL,
	`ip_address` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `proposal_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`proposal_id` integer NOT NULL,
	`player_uuid` text NOT NULL,
	`vote_type` text NOT NULL,
	`voted_at` integer NOT NULL,
	FOREIGN KEY (`proposal_id`) REFERENCES `quest_proposals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proposal_player_unique` ON `proposal_votes` (`proposal_id`,`player_uuid`);--> statement-breakpoint
CREATE TABLE `quest_proposals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quest_id` text NOT NULL,
	`proposer_uuid` text NOT NULL,
	`proposer_name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`votes_up` integer DEFAULT 0 NOT NULL,
	`votes_down` integer DEFAULT 0 NOT NULL,
	`reject_reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`quest_id`) REFERENCES `quests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quests` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`icon` text,
	`category` text,
	`prerequisites` text DEFAULT '[]' NOT NULL,
	`conditions` text DEFAULT '[]' NOT NULL,
	`rewards` text DEFAULT '[]' NOT NULL,
	`map_position` text,
	`custom_buttons` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`creator_uuid` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
