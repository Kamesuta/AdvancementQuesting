package com.kamesuta.advquesting.api;

import com.google.gson.JsonObject;
import com.kamesuta.advquesting.db.SessionDao;
import io.javalin.Javalin;
import io.javalin.http.NotFoundResponse;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.plugin.Plugin;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

public class PlayerRoutes {

    private final Plugin plugin;
    private final SessionDao sessionDao;

    public PlayerRoutes(Plugin plugin, SessionDao sessionDao) {
        this.plugin = plugin;
        this.sessionDao = sessionDao;
    }

    public void register(Javalin app) {

        // GET /api/player/held-item — ログイン中プレイヤーの手持ちアイテムを返す
        app.get("/api/player/held-item", ctx -> {
            SessionDao.SessionInfo session = AuthMiddleware.requireAuth(ctx, sessionDao);

            CompletableFuture<Map<String, Object>> future = new CompletableFuture<>();
            Bukkit.getScheduler().runTask(plugin, () -> {
                try {
                    Player player = Bukkit.getPlayer(UUID.fromString(session.playerUuid()));
                    if (player == null) {
                        future.completeExceptionally(new NotFoundResponse("プレイヤーがオンラインではありません"));
                        return;
                    }
                    ItemStack item = player.getInventory().getItemInMainHand();
                    if (item.getType().isAir()) {
                        future.completeExceptionally(new NotFoundResponse("手持ちアイテムがありません"));
                        return;
                    }

                    Map<String, Object> result = new HashMap<>();
                    result.put("itemId", item.getType().getKey().toString());
                    result.put("count", item.getAmount());

                    // アイテム全体をJSON文字列として保存 (エンチャント・属性・カスタム名など全て含む)
                    JsonObject json = Bukkit.getUnsafe().serializeItemAsJson(item);
                    result.put("nbt", json.toString());

                    // 表示名 (カスタム名 or バニラ名) をプレーンテキストで返す
                    String displayName = PlainTextComponentSerializer.plainText()
                            .serialize(item.effectiveName());
                    result.put("displayName", displayName);

                    future.complete(result);
                } catch (Exception e) {
                    future.completeExceptionally(e);
                }
            });

            try {
                ctx.json(future.get());
            } catch (java.util.concurrent.ExecutionException e) {
                if (e.getCause() instanceof NotFoundResponse nf) throw nf;
                throw new RuntimeException(e.getCause());
            }
        });
    }

    /**
     * JSON文字列からItemStackを復元する。
     * ProgressManager から報酬付与時に呼ばれる。
     */
    public static ItemStack deserializeItem(String nbtJson) {
        try {
            JsonObject json = com.google.gson.JsonParser.parseString(nbtJson).getAsJsonObject();
            return Bukkit.getUnsafe().deserializeItemFromJson(json);
        } catch (Exception e) {
            return null;
        }
    }
}
