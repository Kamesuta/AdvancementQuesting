package com.kamesuta.advquesting.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kamesuta.advquesting.db.SessionDao;
import io.javalin.Javalin;
import io.javalin.http.ForbiddenResponse;
import io.javalin.http.HttpResponseException;
import org.bukkit.plugin.java.JavaPlugin;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * クエスト作成補助AI。タスク／報酬の文脈と任意のヒント（チャット）から、
 * クエスト名＋説明の候補を OpenAI に提案させる。APIキーはサーバー側に秘匿する。
 */
public class AiRoutes {

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
    private static final String SYSTEM_PROMPT = """
            あなたはマインクラフトのクエスト作成を補助するアシスタントです。
            与えられたタスク（達成条件）と報酬の内容を踏まえ、プレイヤーがワクワクする
            クエスト名と説明文を日本語で提案してください。
            ファンタジー世界観とユーモアを大切にし、物語を進めているような没入感のある表現にします。
            例えば「マナ理論」のような世界観を感じさせる言葉を取り入れると魅力的です。
            クエスト名は20文字程度まで、説明文は60〜120文字程度で、内容はタスクと矛盾しないようにします。
            必ず次のJSON形式のみを出力してください（前後に文章を付けない）:
            {"candidates":[{"title":"...","description":"..."},{"title":"...","description":"..."},{"title":"...","description":"..."}]}
            候補は必ず3件、互いに毛色の違うものにしてください。
            """;

    private final JavaPlugin plugin;
    private final SessionDao sessionDao;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public AiRoutes(JavaPlugin plugin, SessionDao sessionDao) {
        this.plugin = plugin;
        this.sessionDao = sessionDao;
    }

    /** リクエストボディ。messages は省略可（リロール/再提案時の会話履歴）。 */
    public record SuggestRequest(List<String> tasks, List<String> rewards, List<ChatMsg> messages) {
    }

    public record ChatMsg(String role, String content) {
    }

    public void register(Javalin app) {
        // POST /api/ai/quest-suggest — editor 以上
        app.post("/api/ai/quest-suggest", ctx -> {
            SessionDao.SessionInfo session = AuthMiddleware.requireAuth(ctx, sessionDao);
            if (!session.isEditor()) throw new ForbiddenResponse();

            String apiKey = plugin.getConfig().getString("openai-api-key", "");
            if (apiKey == null || apiKey.isBlank()) {
                throw new HttpResponseException(503,
                        "AI機能が無効です（config.yml に openai-api-key を設定してください）", Map.of());
            }

            SuggestRequest req = ctx.bodyAsClass(SuggestRequest.class);
            String model = plugin.getConfig().getString("openai-model", "gpt-5.4-nano");

            JsonNode candidates = callOpenAi(apiKey, model, req);
            ObjectNode result = mapper.createObjectNode();
            result.set("candidates", candidates);
            ctx.json(result);
        });
    }

    private JsonNode callOpenAi(String apiKey, String model, SuggestRequest req) {
        // messages を組み立てる
        ArrayNode messages = mapper.createArrayNode();
        messages.add(msg("system", SYSTEM_PROMPT));
        messages.add(msg("user", buildContext(req)));
        if (req.messages() != null) {
            for (ChatMsg m : req.messages()) {
                String role = "assistant".equals(m.role()) ? "assistant" : "user";
                messages.add(msg(role, m.content() == null ? "" : m.content()));
            }
        }

        ObjectNode body = mapper.createObjectNode();
        body.put("model", model);
        body.set("messages", messages);
        ObjectNode responseFormat = mapper.createObjectNode();
        responseFormat.put("type", "json_object");
        body.set("response_format", responseFormat);

        HttpResponse<String> resp;
        try {
            HttpRequest httpReq = HttpRequest.newBuilder()
                    .uri(URI.create(OPENAI_URL))
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .build();
            resp = httpClient.send(httpReq, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            plugin.getLogger().warning("OpenAI への接続に失敗しました: " + e.getMessage());
            throw new HttpResponseException(502, "AI提案の生成に失敗しました（接続エラー）", Map.of());
        }

        if (resp.statusCode() / 100 != 2) {
            plugin.getLogger().warning("OpenAI がエラーを返しました (" + resp.statusCode() + "): " + resp.body());
            throw new HttpResponseException(502, "AI提案の生成に失敗しました（OpenAIエラー）", Map.of());
        }

        try {
            JsonNode root = mapper.readTree(resp.body());
            String content = root.path("choices").path(0).path("message").path("content").asText("");
            JsonNode parsed = mapper.readTree(content);
            JsonNode candidates = parsed.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                throw new IllegalStateException("candidates が空です");
            }
            return candidates;
        } catch (Exception e) {
            plugin.getLogger().warning("OpenAI 応答の解析に失敗しました: " + e.getMessage());
            throw new HttpResponseException(502, "AI提案の解析に失敗しました", Map.of());
        }
    }

    private static String buildContext(SuggestRequest req) {
        StringBuilder sb = new StringBuilder();
        sb.append("以下のクエストにふさわしいクエスト名と説明文を提案してください。\n\n");
        sb.append("【タスク（達成条件）】\n");
        if (req.tasks() != null && !req.tasks().isEmpty()) {
            for (String t : req.tasks()) sb.append("- ").append(t).append("\n");
        } else {
            sb.append("（未設定）\n");
        }
        sb.append("\n【報酬】\n");
        if (req.rewards() != null && !req.rewards().isEmpty()) {
            for (String r : req.rewards()) sb.append("- ").append(r).append("\n");
        } else {
            sb.append("（未設定）\n");
        }
        return sb.toString();
    }

    private ObjectNode msg(String role, String content) {
        ObjectNode node = mapper.createObjectNode();
        node.put("role", role);
        node.put("content", content);
        return node;
    }
}
