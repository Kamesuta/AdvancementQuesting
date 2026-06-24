package com.kamesuta.advquesting.api;

import com.kamesuta.advquesting.data.CommentBlock;
import com.kamesuta.advquesting.data.CommentManager;
import com.kamesuta.advquesting.db.SessionDao;
import io.javalin.Javalin;
import io.javalin.http.ForbiddenResponse;
import io.javalin.http.NotFoundResponse;

import java.util.UUID;

public class CommentRoutes {

    private final CommentManager commentManager;
    private final SessionDao sessionDao;

    public CommentRoutes(CommentManager commentManager, SessionDao sessionDao) {
        this.commentManager = commentManager;
        this.sessionDao = sessionDao;
    }

    public void register(Javalin app) {

        // GET /api/comments
        app.get("/api/comments", ctx -> {
            ctx.json(commentManager.getAll());
        });

        // POST /api/comments — editor 以上
        app.post("/api/comments", ctx -> {
            SessionDao.SessionInfo session = AuthMiddleware.requireAuth(ctx, sessionDao);
            if (!session.isEditor()) throw new ForbiddenResponse();
            CommentBlock block = ctx.bodyAsClass(CommentBlock.class);
            block.id = UUID.randomUUID().toString();
            CommentBlock created = commentManager.upsert(block);
            ctx.status(201).json(created);
        });

        // PUT /api/comments/:id — editor 以上
        app.put("/api/comments/{id}", ctx -> {
            SessionDao.SessionInfo session = AuthMiddleware.requireAuth(ctx, sessionDao);
            if (!session.isEditor()) throw new ForbiddenResponse();
            String id = ctx.pathParam("id");
            CommentBlock block = ctx.bodyAsClass(CommentBlock.class);
            block.id = id;
            CommentBlock updated = commentManager.upsert(block);
            ctx.json(updated);
        });

        // DELETE /api/comments/:id — editor 以上
        app.delete("/api/comments/{id}", ctx -> {
            SessionDao.SessionInfo session = AuthMiddleware.requireAuth(ctx, sessionDao);
            if (!session.isEditor()) throw new ForbiddenResponse();
            String id = ctx.pathParam("id");
            if (!commentManager.delete(id)) throw new NotFoundResponse("Comment not found");
            ctx.status(204);
        });
    }
}
