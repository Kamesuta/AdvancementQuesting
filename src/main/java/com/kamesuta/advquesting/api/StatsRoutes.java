package com.kamesuta.advquesting.api;

import com.kamesuta.advquesting.data.Quest;
import com.kamesuta.advquesting.data.QuestManager;
import com.kamesuta.advquesting.db.StatsDao;
import io.javalin.Javalin;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 全体統計 API。
 *
 * GET /api/stats/leaderboard?metric=points|completions&limit=10
 * GET /api/stats/timeseries?metric=completions|points&days=30
 * GET /api/stats/rewards?limit=20
 * GET /api/stats/quests?sort=popular|hardest&limit=10
 * GET /api/stats/activity?limit=20
 */
public class StatsRoutes {

    private final StatsDao statsDao;
    private final QuestManager questManager;

    public StatsRoutes(StatsDao statsDao, QuestManager questManager) {
        this.statsDao = statsDao;
        this.questManager = questManager;
    }

    public void register(Javalin app) {

        app.get("/api/stats/leaderboard", ctx -> {
            String metric = "completions".equals(ctx.queryParam("metric")) ? "completions" : "points";
            int limit = parseIntOr(ctx.queryParam("limit"), 10);

            List<StatsDao.LeaderboardEntry> raw = "completions".equals(metric)
                ? statsDao.leaderboardByCompletions(limit)
                : statsDao.leaderboardByPoints(limit);

            List<Map<String, Object>> entries = new ArrayList<>(raw.size());
            for (int i = 0; i < raw.size(); i++) {
                StatsDao.LeaderboardEntry e = raw.get(i);
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("rank", i + 1);
                m.put("playerUuid", e.playerUuid());
                m.put("playerName", e.playerName());
                m.put("value", e.value());
                entries.add(m);
            }
            ctx.json(Map.of("metric", metric, "entries", entries));
        });

        app.get("/api/stats/timeseries", ctx -> {
            String metric = "points".equals(ctx.queryParam("metric")) ? "points" : "completions";
            int days = parseIntOr(ctx.queryParam("days"), 30);

            List<StatsDao.TimeseriesPoint> raw = "points".equals(metric)
                ? statsDao.timeseriesPoints(days)
                : statsDao.timeseriesCompletions(days);

            List<Map<String, Object>> data = new ArrayList<>(raw.size());
            for (StatsDao.TimeseriesPoint p : raw) {
                data.add(Map.of("date", p.date(), "value", p.value()));
            }
            ctx.json(Map.of("metric", metric, "days", days, "data", data));
        });

        app.get("/api/stats/rewards", ctx -> {
            int limit = parseIntOr(ctx.queryParam("limit"), 20);
            List<StatsDao.RewardAggEntry> raw = statsDao.rewardsAggregated(limit);

            List<Map<String, Object>> result = new ArrayList<>(raw.size());
            for (StatsDao.RewardAggEntry e : raw) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("rewardType", e.rewardType());
                m.put("rewardLabel", e.rewardLabel());
                m.put("totalAmount", e.totalAmount());
                m.put("claimCount", e.claimCount());
                result.add(m);
            }
            ctx.json(result);
        });

        app.get("/api/stats/quests", ctx -> {
            String sort = "hardest".equals(ctx.queryParam("sort")) ? "hardest" : "popular";
            int limit = parseIntOr(ctx.queryParam("limit"), 10);

            List<StatsDao.QuestStatEntry> raw = "hardest".equals(sort)
                ? statsDao.questStatsByHardest(limit)
                : statsDao.questStatsByPopularity(limit);

            List<Map<String, Object>> result = new ArrayList<>(raw.size());
            for (StatsDao.QuestStatEntry e : raw) {
                Quest quest = questManager.findById(e.questId());
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("questId", e.questId());
                m.put("questTitle", quest != null ? quest.title : "Quest #" + e.questId());
                m.put("questIcon", quest != null && quest.icon != null ? quest.icon : "stone");
                m.put("completionCount", e.completionCount());
                m.put("uniquePlayers", e.uniquePlayers());
                result.add(m);
            }
            ctx.json(result);
        });

        app.get("/api/stats/activity", ctx -> {
            int limit = parseIntOr(ctx.queryParam("limit"), 20);
            List<StatsDao.GlobalActivityRow> raw = statsDao.globalActivity(limit);

            List<Map<String, Object>> result = new ArrayList<>(raw.size());
            for (StatsDao.GlobalActivityRow r : raw) {
                Quest quest = questManager.findById(r.questId());
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", r.id());
                m.put("playerUuid", r.playerUuid());
                m.put("playerName", r.playerName());
                m.put("questId", r.questId());
                m.put("questTitle", quest != null ? quest.title : "Quest #" + r.questId());
                m.put("questIcon", quest != null && quest.icon != null ? quest.icon : "stone");
                m.put("completedAt", r.completedAt());
                result.add(m);
            }
            ctx.json(result);
        });
    }

    private static int parseIntOr(String s, int fallback) {
        if (s == null) return fallback;
        try {
            int v = Integer.parseInt(s);
            return v > 0 ? v : fallback;
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
