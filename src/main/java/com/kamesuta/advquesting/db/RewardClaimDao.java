package com.kamesuta.advquesting.db;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 報酬受取ログ (reward_claims) の DAO。
 * 報酬1項目=1レコードで追記し、トータル獲得報酬を集計する。
 */
public class RewardClaimDao {

    /** 受取明細1行。 */
    public record ClaimRow(
        long id,
        String questlineId,
        String questId,
        String questTitle,
        String rewardType,
        String rewardLabel,
        String itemType,
        long amount,
        String claimedAt
    ) {}

    private final DatabaseManager db;

    public RewardClaimDao(DatabaseManager db) {
        this.db = db;
    }

    /** 報酬1項目を追記する。 */
    public void insert(String playerUuid, String playerName, String questlineId, String questId,
                       String questTitle, String rewardType, String rewardLabel, String itemType,
                       long amount, String claimedAt, String source) throws SQLException {
        String sql = """
            INSERT INTO reward_claims
              (player_uuid, player_name, questline_id, quest_id, quest_title, reward_type, reward_label, item_type, amount, claimed_at, source)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """;
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setString(1, playerUuid);
            ps.setString(2, playerName);
            ps.setString(3, questlineId);
            ps.setString(4, questId);
            ps.setString(5, questTitle);
            ps.setString(6, rewardType);
            ps.setString(7, rewardLabel);
            ps.setString(8, itemType);
            ps.setLong(9, amount);
            ps.setString(10, claimedAt);
            ps.setString(11, source);
            ps.executeUpdate();
        }
    }

    /**
     * 1クエスト分の報酬 (rewards 配列) をまとめて追記する。
     */
    public void insertQuestRewards(String playerUuid, String playerName, String questlineId,
                                   String questId, String questTitle, List<Map<String, Object>> rewards,
                                   String claimedAt, String source) throws SQLException {
        if (rewards == null) return;
        for (Map<String, Object> reward : rewards) {
            String type = (String) reward.get("type");
            if (type == null) continue;
            String label = reward.get("label") instanceof String s ? s : null;
            String itemType = null;
            long amount = 1;
            if ("item".equals(type)) {
                Object it = reward.getOrDefault("itemType", reward.get("itemId"));
                itemType = it instanceof String s ? s : null;
                amount = ((Number) reward.getOrDefault("count", 1)).longValue();
            } else if ("experience".equals(type) || "point".equals(type)) {
                amount = ((Number) reward.getOrDefault("amount", 0)).longValue();
            } else {
                amount = 1;
            }
            insert(playerUuid, playerName, questlineId, questId, questTitle,
                   type, label, itemType, amount, claimedAt, source);
        }
    }

    /** 指定プレイヤーの全受取明細を新しい順で返す。 */
    public List<ClaimRow> byPlayer(String playerUuid) throws SQLException {
        String sql = """
            SELECT id, questline_id, quest_id, quest_title, reward_type, reward_label, item_type, amount, claimed_at
            FROM reward_claims
            WHERE player_uuid = ?
            ORDER BY id DESC
            """;
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setString(1, playerUuid);
            ResultSet rs = ps.executeQuery();
            List<ClaimRow> rows = new ArrayList<>();
            while (rs.next()) {
                rows.add(new ClaimRow(
                    rs.getLong("id"),
                    rs.getString("questline_id"),
                    rs.getString("quest_id"),
                    rs.getString("quest_title"),
                    rs.getString("reward_type"),
                    rs.getString("reward_label"),
                    rs.getString("item_type"),
                    rs.getLong("amount"),
                    rs.getString("claimed_at")
                ));
            }
            return rows;
        }
    }

    /** 指定プレイヤーの type別 amount 合計を返す (totalsByType)。 */
    public Map<String, Long> totalsByType(String playerUuid) throws SQLException {
        String sql = "SELECT reward_type, SUM(amount) AS total FROM reward_claims WHERE player_uuid = ? GROUP BY reward_type";
        Map<String, Long> totals = new java.util.LinkedHashMap<>();
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setString(1, playerUuid);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                totals.put(rs.getString("reward_type"), rs.getLong("total"));
            }
        }
        return totals;
    }

    /**
     * 既存の player_progress (completed=1 AND reward_claimed=1) を reward_claims に遡及移行する。
     * 冪等 (source='migrated' の既存レコードがある場合はスキップ)。
     *
     * @param rewardsResolver (questlineId, questId) → (title, rewards)。null を返したらスキップ。
     * @param nameResolver    uuid → 表示名。null/失敗時は uuid を使う。
     * @return 移行したクエスト数
     */
    public int migrateFromProgress(
            java.util.function.BiFunction<String, String, QuestRewards> rewardsResolver,
            java.util.function.Function<String, String> nameResolver) throws SQLException {
        String sql = """
            SELECT pp.player_uuid AS uuid, pp.questline_id AS qlid, pp.quest_id AS qid, pp.completed_at AS cat
            FROM player_progress pp
            WHERE pp.completed = 1 AND pp.reward_claimed = 1
              AND NOT EXISTS (
                  SELECT 1 FROM reward_claims rc
                  WHERE rc.player_uuid = pp.player_uuid
                    AND rc.questline_id = pp.questline_id
                    AND rc.quest_id = pp.quest_id
                    AND rc.source = 'migrated'
              )
            """;
        int migrated = 0;
        List<String[]> targets = new ArrayList<>();
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                targets.add(new String[]{
                    rs.getString("uuid"), rs.getString("qlid"), rs.getString("qid"), rs.getString("cat")
                });
            }
        }
        for (String[] t : targets) {
            String uuid = t[0];
            String qlid = t[1];
            String qid = t[2];
            String claimedAt = (t[3] == null || t[3].isEmpty()) ? java.time.Instant.now().toString() : t[3];
            QuestRewards qr = rewardsResolver.apply(qlid, qid);
            if (qr == null || qr.rewards() == null || qr.rewards().isEmpty()) continue;
            String name = uuid;
            if (nameResolver != null) {
                try {
                    String resolved = nameResolver.apply(uuid);
                    if (resolved != null && !resolved.isEmpty()) name = resolved;
                } catch (Exception ignored) {}
            }
            insertQuestRewards(uuid, name, qlid, qid, qr.title(), qr.rewards(), claimedAt, "migrated");
            migrated++;
        }
        return migrated;
    }

    /** 移行時に解決するクエストのタイトルと報酬。 */
    public record QuestRewards(String title, List<Map<String, Object>> rewards) {}
}
