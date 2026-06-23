package com.kamesuta.advquesting.db;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/** 全体統計 (leaderboard / timeseries / rewards / quests / activity) の DAO。 */
public class StatsDao {

    public record LeaderboardEntry(String playerUuid, String playerName, long value) {}
    public record TimeseriesPoint(String date, long value) {}
    public record RewardAggEntry(String rewardType, String rewardLabel, long totalAmount, long claimCount) {}
    public record QuestStatEntry(int questId, long completionCount, long uniquePlayers) {}
    public record GlobalActivityRow(long id, String playerUuid, String playerName, int questId, String completedAt) {}

    private final DatabaseManager db;

    public StatsDao(DatabaseManager db) {
        this.db = db;
    }

    public List<LeaderboardEntry> leaderboardByPoints(int limit) throws SQLException {
        String sql = """
            SELECT player_uuid, MAX(player_name) AS player_name, SUM(amount) AS total
            FROM reward_claims
            WHERE reward_type = 'point'
            GROUP BY player_uuid
            ORDER BY total DESC
            LIMIT ?
            """;
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setInt(1, limit);
            ResultSet rs = ps.executeQuery();
            List<LeaderboardEntry> rows = new ArrayList<>();
            while (rs.next()) {
                rows.add(new LeaderboardEntry(rs.getString("player_uuid"), rs.getString("player_name"), rs.getLong("total")));
            }
            return rows;
        }
    }

    public List<LeaderboardEntry> leaderboardByCompletions(int limit) throws SQLException {
        String sql = """
            SELECT player_uuid, MAX(player_name) AS player_name, COUNT(*) AS total
            FROM quest_completions
            GROUP BY player_uuid
            ORDER BY total DESC
            LIMIT ?
            """;
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setInt(1, limit);
            ResultSet rs = ps.executeQuery();
            List<LeaderboardEntry> rows = new ArrayList<>();
            while (rs.next()) {
                rows.add(new LeaderboardEntry(rs.getString("player_uuid"), rs.getString("player_name"), rs.getLong("total")));
            }
            return rows;
        }
    }

    public List<TimeseriesPoint> timeseriesCompletions(int days) throws SQLException {
        String sql = """
            SELECT strftime('%Y-%m-%d', completed_at) AS date, COUNT(*) AS value
            FROM quest_completions
            WHERE completed_at >= datetime('now', '-' || ? || ' days')
            GROUP BY date
            ORDER BY date ASC
            """;
        return queryTimeseries(sql, days);
    }

    public List<TimeseriesPoint> timeseriesPoints(int days) throws SQLException {
        String sql = """
            SELECT strftime('%Y-%m-%d', claimed_at) AS date, SUM(amount) AS value
            FROM reward_claims
            WHERE reward_type = 'point'
              AND claimed_at >= datetime('now', '-' || ? || ' days')
            GROUP BY date
            ORDER BY date ASC
            """;
        return queryTimeseries(sql, days);
    }

    private List<TimeseriesPoint> queryTimeseries(String sql, int days) throws SQLException {
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setInt(1, days);
            ResultSet rs = ps.executeQuery();
            List<TimeseriesPoint> rows = new ArrayList<>();
            while (rs.next()) {
                rows.add(new TimeseriesPoint(rs.getString("date"), rs.getLong("value")));
            }
            return rows;
        }
    }

    public List<RewardAggEntry> rewardsAggregated(int limit) throws SQLException {
        String sql = """
            SELECT reward_type, reward_label, SUM(amount) AS total_amount, COUNT(*) AS claim_count
            FROM reward_claims
            GROUP BY reward_type, reward_label
            ORDER BY total_amount DESC
            LIMIT ?
            """;
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setInt(1, limit);
            ResultSet rs = ps.executeQuery();
            List<RewardAggEntry> rows = new ArrayList<>();
            while (rs.next()) {
                rows.add(new RewardAggEntry(rs.getString("reward_type"), rs.getString("reward_label"), rs.getLong("total_amount"), rs.getLong("claim_count")));
            }
            return rows;
        }
    }

    public List<QuestStatEntry> questStatsByPopularity(int limit) throws SQLException {
        return questStats("DESC", limit);
    }

    public List<QuestStatEntry> questStatsByHardest(int limit) throws SQLException {
        return questStats("ASC", limit);
    }

    private List<QuestStatEntry> questStats(String order, int limit) throws SQLException {
        String sql = """
            SELECT quest_id, COUNT(*) AS completion_count, COUNT(DISTINCT player_uuid) AS unique_players
            FROM quest_completions
            GROUP BY quest_id
            ORDER BY unique_players %s, completion_count %s
            LIMIT ?
            """.formatted(order, order);
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setInt(1, limit);
            ResultSet rs = ps.executeQuery();
            List<QuestStatEntry> rows = new ArrayList<>();
            while (rs.next()) {
                rows.add(new QuestStatEntry(rs.getInt("quest_id"), rs.getLong("completion_count"), rs.getLong("unique_players")));
            }
            return rows;
        }
    }

    public List<GlobalActivityRow> globalActivity(int limit) throws SQLException {
        String sql = """
            SELECT id, player_uuid, player_name, quest_id, completed_at
            FROM quest_completions
            ORDER BY id DESC
            LIMIT ?
            """;
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setInt(1, limit);
            ResultSet rs = ps.executeQuery();
            List<GlobalActivityRow> rows = new ArrayList<>();
            while (rs.next()) {
                rows.add(new GlobalActivityRow(rs.getLong("id"), rs.getString("player_uuid"), rs.getString("player_name"), rs.getInt("quest_id"), rs.getString("completed_at")));
            }
            return rows;
        }
    }
}
