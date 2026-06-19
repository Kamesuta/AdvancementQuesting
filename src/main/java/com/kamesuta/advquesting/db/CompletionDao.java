package com.kamesuta.advquesting.db;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * クリアログ (quest_completions) の DAO。
 * 1クリア=1レコードで追記し、ランキングを集計する。
 */
public class CompletionDao {

    /** ランキング1行 (プレイヤー単位に集計済み)。rank はアプリ側で付与する。 */
    public record RankRow(
        String playerUuid,
        String playerName,
        int clears,
        String firstAt   // 初回クリア時刻 (ISO 8601)
    ) {}

    private final DatabaseManager db;

    public CompletionDao(DatabaseManager db) {
        this.db = db;
    }

    /** クリアログを1件追記する。 */
    public void insert(String playerUuid, String playerName, int questId, String completedAt) throws SQLException {
        String sql = "INSERT INTO quest_completions (player_uuid, player_name, quest_id, completed_at) VALUES (?, ?, ?, ?)";
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setString(1, playerUuid);
            ps.setString(2, playerName);
            ps.setInt(3, questId);
            ps.setString(4, completedAt);
            ps.executeUpdate();
        }
    }

    /**
     * クリア順ランキング: プレイヤーごとの初回クリア時刻が早い順。
     * 各プレイヤーの最新の表示名 (最後にクリアしたときの名前) を採用する。
     */
    public List<RankRow> firstClearRanking(int questId) throws SQLException {
        String sql = """
            SELECT player_uuid,
                   COUNT(*) AS clears,
                   MIN(completed_at) AS first_at,
                   MAX(completed_at) AS last_at
            FROM quest_completions
            WHERE quest_id = ?
            GROUP BY player_uuid
            ORDER BY first_at ASC
            """;
        return query(sql, questId);
    }

    /**
     * クリア回数ランキング: 回数の多い順、同数は初回クリアが早い順。
     */
    public List<RankRow> countRanking(int questId) throws SQLException {
        String sql = """
            SELECT player_uuid,
                   COUNT(*) AS clears,
                   MIN(completed_at) AS first_at,
                   MAX(completed_at) AS last_at
            FROM quest_completions
            WHERE quest_id = ?
            GROUP BY player_uuid
            ORDER BY clears DESC, first_at ASC
            """;
        return query(sql, questId);
    }

    private List<RankRow> query(String sql, int questId) throws SQLException {
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setInt(1, questId);
            ResultSet rs = ps.executeQuery();
            List<RankRow> rows = new ArrayList<>();
            while (rs.next()) {
                rows.add(new RankRow(
                    rs.getString("player_uuid"),
                    resolveName(rs.getString("player_uuid")),
                    rs.getInt("clears"),
                    rs.getString("first_at")
                ));
            }
            return rows;
        }
    }

    /**
     * 最新の表示名を取得する (最後にクリアしたときに記録した名前)。
     * 改名されていても直近のログの名前を使う。
     */
    private String resolveName(String playerUuid) throws SQLException {
        String sql = "SELECT player_name FROM quest_completions WHERE player_uuid = ? ORDER BY completed_at DESC LIMIT 1";
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setString(1, playerUuid);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) return rs.getString(1);
            return playerUuid;
        }
    }
}
