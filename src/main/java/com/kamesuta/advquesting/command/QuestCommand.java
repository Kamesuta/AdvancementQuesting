package com.kamesuta.advquesting.command;

import com.kamesuta.advquesting.data.ProgressManager;
import com.kamesuta.advquesting.data.Quest;
import com.kamesuta.advquesting.data.QuestManager;
import com.kamesuta.advquesting.db.AuthCodeDao;
import com.kamesuta.advquesting.db.ProgressDao;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;

import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public class QuestCommand implements CommandExecutor, TabCompleter {

    private final AuthCodeDao authCodeDao;
    private final String webUrl;
    private final ProgressDao progressDao;
    private final ProgressManager progressManager;
    private final QuestManager questManager;

    public QuestCommand(AuthCodeDao authCodeDao, String webUrl,
                        ProgressDao progressDao, ProgressManager progressManager,
                        QuestManager questManager) {
        this.authCodeDao = authCodeDao;
        this.webUrl = webUrl;
        this.progressDao = progressDao;
        this.progressManager = progressManager;
        this.questManager = questManager;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 0) {
            // /quest — コード付きログインURLを表示
            if (sender instanceof Player player) {
                String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
                String role = determineRole(player);
                Instant expiresAt = Instant.now().plusSeconds(300);
                try {
                    authCodeDao.insert(code, player.getUniqueId().toString(), player.getName(), role, expiresAt);
                } catch (SQLException e) {
                    player.sendMessage(Component.text("URLの生成に失敗しました。", NamedTextColor.RED));
                    return true;
                }
                String loginUrl = webUrl + "/login?code=" + code;
                player.sendMessage(Component.text("クエストマップを開く: ", NamedTextColor.GOLD)
                    .append(Component.text(loginUrl, NamedTextColor.AQUA)
                        .clickEvent(ClickEvent.openUrl(loginUrl))
                        .decorate(TextDecoration.UNDERLINED)));
                player.sendMessage(Component.text("URLをクリックするとそのままログインできます。", NamedTextColor.GRAY));
            } else {
                sender.sendMessage(Component.text("Web UI: ", NamedTextColor.GOLD)
                    .append(Component.text(webUrl, NamedTextColor.AQUA)
                        .clickEvent(ClickEvent.openUrl(webUrl))
                        .decorate(TextDecoration.UNDERLINED)));
            }
            return true;
        }

        switch (args[0].toLowerCase()) {
            case "code" -> handleCode(sender);
            case "progress" -> handleProgress(sender);
            case "claim" -> handleClaim(sender, args);
            case "complete" -> handleSetCompleted(sender, args, true);
            case "uncomplete" -> handleSetCompleted(sender, args, false);
            default -> sender.sendMessage(Component.text(
                "使い方: /quest [code|progress|claim <id>|complete <player> <id>|uncomplete <player> <id>]",
                NamedTextColor.RED));
        }
        return true;
    }

    /** /quest complete|uncomplete <player> <questId> — OP限定で達成状態を強制設定 */
    private void handleSetCompleted(CommandSender sender, String[] args, boolean completed) {
        if (!sender.isOp() && !sender.hasPermission("aq.admin")) {
            sender.sendMessage(Component.text("このコマンドには権限が必要です。", NamedTextColor.RED));
            return;
        }
        if (args.length < 3) {
            sender.sendMessage(Component.text(
                "使い方: /quest " + (completed ? "complete" : "uncomplete") + " <プレイヤー名> <クエストID>",
                NamedTextColor.RED));
            return;
        }
        String targetName = args[1];
        int questId;
        try {
            questId = Integer.parseInt(args[2]);
        } catch (NumberFormatException e) {
            sender.sendMessage(Component.text("クエストIDは数字で指定してください。", NamedTextColor.RED));
            return;
        }

        // 対象プレイヤーの UUID を解決（オンライン優先、なければオフライン）
        Player online = org.bukkit.Bukkit.getPlayerExact(targetName);
        String targetUuid;
        if (online != null) {
            targetUuid = online.getUniqueId().toString();
        } else {
            org.bukkit.OfflinePlayer offline = org.bukkit.Bukkit.getOfflinePlayer(targetName);
            // 過去にプレイ実績がないプレイヤーは誤入力の可能性が高いので弾く
            if (!offline.hasPlayedBefore()) {
                sender.sendMessage(Component.text(
                    "プレイヤーが見つかりません（未プレイ）: " + targetName, NamedTextColor.RED));
                return;
            }
            targetUuid = offline.getUniqueId().toString();
        }

        try {
            boolean ok = progressManager.setQuestCompleted(targetUuid, questId, completed);
            if (!ok) {
                sender.sendMessage(Component.text("クエストが見つかりません: #" + questId, NamedTextColor.RED));
                return;
            }
            sender.sendMessage(Component.text(
                targetName + " のクエスト #" + questId + " を" + (completed ? "達成済み" : "未達成") + "にしました。",
                NamedTextColor.GREEN));
        } catch (SQLException e) {
            sender.sendMessage(Component.text("達成状態の更新に失敗しました。", NamedTextColor.RED));
        }
    }

    private void handleCode(CommandSender sender) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage(Component.text("プレイヤーのみ使用できます。", NamedTextColor.RED));
            return;
        }
        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
        String role = determineRole(player);
        Instant expiresAt = Instant.now().plusSeconds(300);
        try {
            authCodeDao.insert(code, player.getUniqueId().toString(), player.getName(), role, expiresAt);
        } catch (SQLException e) {
            player.sendMessage(Component.text("コードの生成に失敗しました。", NamedTextColor.RED));
            return;
        }
        player.sendMessage(Component.text("認証コード: ", NamedTextColor.GOLD)
            .append(Component.text(code, NamedTextColor.WHITE).decorate(TextDecoration.BOLD)));
        player.sendMessage(Component.text("有効期限: 5分", NamedTextColor.GRAY));
        player.sendMessage(Component.text("Web UI でコードを入力してください: ", NamedTextColor.GRAY)
            .append(Component.text(webUrl, NamedTextColor.AQUA)
                .clickEvent(ClickEvent.openUrl(webUrl))
                .decorate(TextDecoration.UNDERLINED)));
    }

    private void handleProgress(CommandSender sender) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage(Component.text("プレイヤーのみ使用できます。", NamedTextColor.RED));
            return;
        }
        try {
            List<ProgressDao.ProgressRecord> records = progressDao.findByPlayer(player.getUniqueId().toString());
            if (records.isEmpty()) {
                player.sendMessage(Component.text("進行中のクエストはありません。", NamedTextColor.GRAY));
                return;
            }
            player.sendMessage(Component.text("=== クエスト進捗 ===", NamedTextColor.GOLD));
            for (ProgressDao.ProgressRecord r : records) {
                Quest quest = questManager.findById(r.questId());
                String title = quest != null ? quest.title : "Quest #" + r.questId();
                if (r.completed() && r.rewardClaimed()) {
                    player.sendMessage(Component.text("§7[受取済] " + title));
                } else if (r.completed()) {
                    player.sendMessage(Component.text("§a[完了] " + title + " §7(§e/quest claim " + r.questId() + "§7)"));
                } else {
                    player.sendMessage(Component.text("§e[進行中] " + title));
                }
            }
        } catch (SQLException e) {
            player.sendMessage(Component.text("進捗の取得に失敗しました。", NamedTextColor.RED));
        }
    }

    private void handleClaim(CommandSender sender, String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage(Component.text("プレイヤーのみ使用できます。", NamedTextColor.RED));
            return;
        }
        if (args.length < 2) {
            player.sendMessage(Component.text("使い方: /quest claim <クエストID>", NamedTextColor.RED));
            return;
        }
        int questId;
        try {
            questId = Integer.parseInt(args[1]);
        } catch (NumberFormatException e) {
            player.sendMessage(Component.text("クエストIDは数字で指定してください。", NamedTextColor.RED));
            return;
        }
        try {
            boolean ok = progressManager.claimReward(player.getUniqueId().toString(), questId);
            if (!ok) {
                player.sendMessage(Component.text("クエストが未完了か、すでに報酬を受け取り済みです。", NamedTextColor.RED));
            }
        } catch (SQLException e) {
            player.sendMessage(Component.text("報酬の受け取りに失敗しました。", NamedTextColor.RED));
        }
    }

    private String determineRole(Player player) {
        if (player.isOp() || player.hasPermission("aq.editor")) return "editor";
        return "player";
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String label, String[] args) {
        boolean admin = sender.isOp() || sender.hasPermission("aq.admin");
        if (args.length == 1) {
            List<String> subs = new java.util.ArrayList<>(List.of("code", "progress", "claim"));
            if (admin) { subs.add("complete"); subs.add("uncomplete"); }
            return subs;
        }
        // complete/uncomplete <player> のプレイヤー名補完
        if (args.length == 2 && admin
                && (args[0].equalsIgnoreCase("complete") || args[0].equalsIgnoreCase("uncomplete"))) {
            return org.bukkit.Bukkit.getOnlinePlayers().stream().map(Player::getName).toList();
        }
        return List.of();
    }
}
