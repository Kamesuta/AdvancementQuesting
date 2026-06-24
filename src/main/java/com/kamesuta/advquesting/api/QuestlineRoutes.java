package com.kamesuta.advquesting.api;

import com.kamesuta.advquesting.data.Questline;
import com.kamesuta.advquesting.data.QuestlineManager;
import com.kamesuta.advquesting.db.SessionDao;
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.ForbiddenResponse;
import io.javalin.http.NotFoundResponse;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * クエストライン API。
 *
 * GET /api/questlines
 *   クエストライン一覧（order 順）を返す。
 *
 * PUT /api/questlines/{id}/map
 *   map.json のノード配置を一括更新する（エディタのドラッグ操作後）。
 */
public class QuestlineRoutes {

    private final QuestlineManager questlineManager;
    private final SessionDao sessionDao;

    public QuestlineRoutes(QuestlineManager questlineManager, SessionDao sessionDao) {
        this.questlineManager = questlineManager;
        this.sessionDao = sessionDao;
    }

    public void register(Javalin app) {

        // GET /api/questlines — クエストライン一覧
        app.get("/api/questlines", ctx -> {
            List<Questline> questlines = questlineManager.loadAllQuestlines();
            List<Map<String, Object>> result = new ArrayList<>(questlines.size());
            for (Questline ql : questlines) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", ql.id);
                m.put("order", ql.order);
                m.put("title", ql.title);
                m.put("icon", ql.icon);
                m.put("questCount", ql.quests.size());
                m.put("nodes", ql.nodes);
                result.add(m);
            }
            ctx.json(result);
        });

        // PUT /api/questlines/{id}/map — map.json を一括更新 (editor以上)
        app.put("/api/questlines/{id}/map", ctx -> {
            SessionDao.SessionInfo session = AuthMiddleware.requireAuth(ctx, sessionDao);
            if (!session.isEditor()) throw new ForbiddenResponse();
            String questlineId = ctx.pathParam("id");

            @SuppressWarnings("unchecked")
            Map<String, Object> body = ctx.bodyAsClass(Map.class);
            Object nodesObj = body.get("nodes");
            if (!(nodesObj instanceof List<?>)) throw new BadRequestResponse("nodes must be an array");

            List<Questline.MapNode> nodes = new ArrayList<>();
            for (Object item : (List<?>) nodesObj) {
                if (!(item instanceof Map<?, ?> m)) continue;
                Questline.MapNode node = new Questline.MapNode();
                Object qid = m.get("questId");
                if (!(qid instanceof String)) continue;
                node.questId = (String) qid;
                node.x = m.get("x") instanceof Number n ? n.doubleValue() : 0.0;
                node.y = m.get("y") instanceof Number n ? n.doubleValue() : 0.0;
                nodes.add(node);
            }

            try {
                questlineManager.updateMap(questlineId, nodes);
            } catch (java.io.IOException e) {
                throw new NotFoundResponse("Questline not found: " + questlineId);
            }
            ctx.json(Map.of("status", "updated", "nodeCount", nodes.size()));
        });
    }
}
