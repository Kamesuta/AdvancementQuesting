package com.kamesuta.advquesting.api;

import com.kamesuta.advquesting.data.Quest;
import com.kamesuta.advquesting.data.QuestlineManager;
import com.kamesuta.advquesting.db.SessionDao;
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.ForbiddenResponse;
import io.javalin.http.NotFoundResponse;

import java.util.List;
import java.util.Map;

public class QuestRoutes {

    private final QuestlineManager questlineManager;
    private final SessionDao sessionDao;

    public QuestRoutes(QuestlineManager questlineManager, SessionDao sessionDao) {
        this.questlineManager = questlineManager;
        this.sessionDao = sessionDao;
    }

    public void register(Javalin app) {

        // GET /api/quests?questlineId=xxx&status=xxx&category=xxx
        app.get("/api/quests", ctx -> {
            String questlineIdFilter = ctx.queryParam("questlineId");
            String statusFilter = ctx.queryParam("status");
            String categoryFilter = ctx.queryParam("category");
            List<Quest> quests = questlineIdFilter != null
                ? questlineManager.loadByQuestline(questlineIdFilter)
                : questlineManager.loadAll();
            if (statusFilter != null) {
                quests = quests.stream().filter(q -> statusFilter.equals(q.status)).toList();
            }
            if (categoryFilter != null) {
                quests = quests.stream().filter(q -> categoryFilter.equals(q.category)).toList();
            }
            ctx.json(quests);
        });

        // GET /api/quests/:questlineId/:questId
        app.get("/api/quests/{questlineId}/{questId}", ctx -> {
            String questlineId = ctx.pathParam("questlineId");
            String questId = ctx.pathParam("questId");
            Quest quest = questlineManager.findById(questlineId, questId);
            if (quest == null) throw new NotFoundResponse("Quest not found");
            ctx.json(quest);
        });

        // POST /api/quests — editor 以上
        // Body: quest fields + questlineId (必須) + mapX/mapY (省略時 0)
        app.post("/api/quests", ctx -> {
            SessionDao.SessionInfo session = AuthMiddleware.requireAuth(ctx, sessionDao);
            if (!session.isEditor()) throw new ForbiddenResponse();
            @SuppressWarnings("unchecked")
            Map<String, Object> body = ctx.bodyAsClass(Map.class);
            String questlineId = body.get("questlineId") instanceof String s ? s : null;
            if (questlineId == null) throw new BadRequestResponse("questlineId is required");
            double x = body.get("mapX") instanceof Number n ? n.doubleValue() : 0.0;
            double y = body.get("mapY") instanceof Number n ? n.doubleValue() : 0.0;
            Quest quest = ctx.bodyAsClass(Quest.class);
            quest.creatorUuid = session.playerUuid();
            Quest created = questlineManager.create(quest, questlineId, x, y);
            ctx.status(201).json(created);
        });

        // PUT /api/quests/:questlineId/:questId — editor 以上
        app.put("/api/quests/{questlineId}/{questId}", ctx -> {
            SessionDao.SessionInfo session = AuthMiddleware.requireAuth(ctx, sessionDao);
            if (!session.isEditor()) throw new ForbiddenResponse();
            String questlineId = ctx.pathParam("questlineId");
            String questId = ctx.pathParam("questId");
            Quest patch = ctx.bodyAsClass(Quest.class);
            Quest updated = questlineManager.update(questlineId, questId, patch);
            if (updated == null) throw new NotFoundResponse("Quest not found");
            ctx.json(updated);
        });

        // DELETE /api/quests/:questlineId/:questId — editor 以上
        app.delete("/api/quests/{questlineId}/{questId}", ctx -> {
            SessionDao.SessionInfo session = AuthMiddleware.requireAuth(ctx, sessionDao);
            if (!session.isEditor()) throw new ForbiddenResponse();
            String questlineId = ctx.pathParam("questlineId");
            String questId = ctx.pathParam("questId");
            if (!questlineManager.delete(questlineId, questId)) throw new NotFoundResponse("Quest not found");
            ctx.status(204);
        });
    }
}
