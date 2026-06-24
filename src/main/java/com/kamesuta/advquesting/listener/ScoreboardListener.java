package com.kamesuta.advquesting.listener;

import com.kamesuta.advquesting.data.ProgressManager;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.Plugin;
import org.bukkit.scheduler.BukkitTask;
import org.bukkit.scoreboard.Objective;
import org.bukkit.scoreboard.Score;
import org.bukkit.scoreboard.Scoreboard;

import java.util.ArrayList;
import java.util.List;

/**
 * 定期的にスコアボードをポーリングして scoreboard 条件を確認する。
 * Paper 1.21 に ScoreSetEvent が存在しないため、BukkitTask でポーリングする。
 */
public class ScoreboardListener {

    private record ScoreSnapshot(String playerUuid, String objective, int score) {}

    private final ProgressManager progressManager;
    private Plugin plugin;
    private BukkitTask task;

    public ScoreboardListener(ProgressManager progressManager) {
        this.progressManager = progressManager;
    }

    public void start(Plugin plugin) {
        this.plugin = plugin;
        // 20 ticks = 1秒ごとにポーリング
        task = Bukkit.getScheduler().runTaskTimer(plugin, this::tick, 20L, 20L);
    }

    public void stop() {
        if (task != null) {
            task.cancel();
            task = null;
        }
    }

    private void tick() {
        // スコアボード値の読み取りはメインスレッドで行い、DB操作は非同期に委譲する。
        // SQLite書き込みをメインスレッドで行うとWALチェックポイント待ちで10秒以上ブロックする。
        Scoreboard scoreboard = Bukkit.getScoreboardManager().getMainScoreboard();
        List<ScoreSnapshot> snapshots = new ArrayList<>();
        for (Player player : Bukkit.getOnlinePlayers()) {
            String playerUuid = player.getUniqueId().toString();
            for (Objective objective : scoreboard.getObjectives()) {
                Score score = objective.getScore(player);
                if (score.isScoreSet()) {
                    snapshots.add(new ScoreSnapshot(playerUuid, objective.getName(), score.getScore()));
                }
            }
        }
        if (!snapshots.isEmpty()) {
            Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
                for (ScoreSnapshot s : snapshots) {
                    progressManager.onScoreChange(s.playerUuid(), s.objective(), s.score());
                }
            });
        }
    }
}
