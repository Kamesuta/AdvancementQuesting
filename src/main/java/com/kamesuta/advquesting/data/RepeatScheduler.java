package com.kamesuta.advquesting.data;

import com.kamesuta.advquesting.api.NotificationRoutes;
import com.kamesuta.advquesting.db.ProgressDao;
import org.bukkit.plugin.java.JavaPlugin;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

/**
 * 毎分実行されるスケジューラ。schedule タイプの繰り返しクエストを復活させ SSE で通知する。
 */
public class RepeatScheduler {

    private final QuestManager questManager;
    private final ProgressDao progressDao;
    private final NotificationRoutes notificationRoutes;
    private final Logger log;
    private ScheduledExecutorService executor;

    public RepeatScheduler(JavaPlugin plugin, QuestManager questManager,
                           ProgressDao progressDao, NotificationRoutes notificationRoutes) {
        this.questManager = questManager;
        this.progressDao = progressDao;
        this.notificationRoutes = notificationRoutes;
        this.log = plugin.getLogger();
    }

    public void start() {
        executor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "repeat-scheduler");
            t.setDaemon(true);
            return t;
        });
        long nowSec = System.currentTimeMillis() / 1000;
        long delay = 60 - (nowSec % 60);
        executor.scheduleAtFixedRate(this::tick, delay, 60, TimeUnit.SECONDS);
    }

    public void stop() {
        if (executor != null) executor.shutdownNow();
    }

    private void tick() {
        try {
            List<Quest> quests = questManager.loadAll();
            for (Quest quest : quests) {
                if (!"public".equals(quest.status)) continue;
                Quest.RepeatConfig repeat = quest.repeat;
                if (repeat == null) continue;
                if (!"schedule".equals(repeat.type)) continue;
                if (repeat.cron == null) continue;

                List<ProgressDao.ProgressRecord> records = progressDao.findByQuest(quest.id);
                for (ProgressDao.ProgressRecord rec : records) {
                    if (!rec.completed()) continue;
                    String lastCompletedAt = rec.completedAt();
                    if (lastCompletedAt == null) continue;

                    Instant lastCompleted = Instant.parse(lastCompletedAt);
                    ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
                    ZonedDateTime prevFire = CronParser.prevFire(repeat.cron, now);
                    if (prevFire == null) continue;

                    if (lastCompleted.isBefore(prevFire.toInstant())) {
                        progressDao.resetForRepeat(rec.playerUuid(), quest.id);
                        notificationRoutes.sendRepeatReset(rec.playerUuid(), quest.id);
                    }
                }
            }
        } catch (Exception e) {
            log.warning("RepeatScheduler tick error: " + e.getMessage());
        }
    }
}
