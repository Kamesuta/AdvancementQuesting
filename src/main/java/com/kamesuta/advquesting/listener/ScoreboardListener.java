package com.kamesuta.advquesting.listener;

import com.kamesuta.advquesting.data.ProgressManager;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.Plugin;
import org.bukkit.scheduler.BukkitTask;
import org.bukkit.scoreboard.Objective;
import org.bukkit.scoreboard.Score;
import org.bukkit.scoreboard.Scoreboard;

/**
 * 定期的にスコアボードをポーリングして scoreboard 条件を確認する。
 * Paper 1.21 に ScoreSetEvent が存在しないため、BukkitTask でポーリングする。
 */
public class ScoreboardListener {

    private final ProgressManager progressManager;
    private BukkitTask task;

    public ScoreboardListener(ProgressManager progressManager) {
        this.progressManager = progressManager;
    }

    public void start(Plugin plugin) {
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
        Scoreboard scoreboard = Bukkit.getScoreboardManager().getMainScoreboard();
        for (Player player : Bukkit.getOnlinePlayers()) {
            String playerUuid = player.getUniqueId().toString();
            for (Objective objective : scoreboard.getObjectives()) {
                Score score = objective.getScore(player);
                if (score.isScoreSet()) {
                    progressManager.onScoreChange(playerUuid, objective.getName(), score.getScore());
                }
            }
        }
    }
}
