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

public class AiRoutes {

    private static final String OPENAI_URL = "https://api.openai.com/v1/responses";

    private static final String SYSTEM_PROMPT = """
            あなたはマインクラフトのクエスト作成を補助するアシスタントです。
            与えられたタスク（達成条件）と報酬の内容を踏まえ、プレイヤーがワクワクする
            クエスト名と説明文を日本語で提案してください。

            ファンタジー世界観とユーモアを大切にし、物語を進めているような
            没入感のある表現にしてください。

            クエスト名は20文字程度まで、説明文は60〜120文字程度で、
            内容はタスクと矛盾しないようにしてください。

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

    public record SuggestRequest(List<String> tasks, List<String> rewards, List<ChatMsg> messages) {}
    public record ChatMsg(String role, String content) {}
    public record Candidate(String title, String description) {}
    public record CandidateResponse(List<Candidate> candidates) {}

    public void register(Javalin app) {
        app.post("/api/ai/quest-suggest", ctx -> {
            SessionDao.SessionInfo session = AuthMiddleware.requireAuth(ctx, sessionDao);
            if (!session.isEditor()) throw new ForbiddenResponse();

            String apiKey = plugin.getConfig().getString("openai-api-key", "");
            if (apiKey == null || apiKey.isBlank()) {
                throw new HttpResponseException(503,
                        "AI機能が無効です（config.yml に openai-api-key を設定してください）",
                        Map.of());
            }

            SuggestRequest req = ctx.bodyAsClass(SuggestRequest.class);
            String model = plugin.getConfig().getString("openai-model", "gpt-5-mini");

            JsonNode candidates = callOpenAi(apiKey, model, req);

            ObjectNode result = mapper.createObjectNode();
            result.set("candidates", candidates);
            ctx.json(result);
        });
    }

    private JsonNode callOpenAi(String apiKey, String model, SuggestRequest req) {
        ArrayNode input = mapper.createArrayNode();

        input.add(msg("system", SYSTEM_PROMPT));
        input.add(msg("user", buildContext(req)));

        if (req.messages() != null) {
            for (ChatMsg m : req.messages()) {
                input.add(msg(
                        "assistant".equals(m.role()) ? "assistant" : "user",
                        m.content() == null ? "" : m.content()
                ));
            }
        }

        ObjectNode body = mapper.createObjectNode();
        body.put("model", model);
        body.set("input", input);

        ObjectNode text = mapper.createObjectNode();
        ObjectNode format = mapper.createObjectNode();

        format.put("type", "json_schema");
        format.put("name", "quest_candidates");
        format.put("strict", true);

        ObjectNode schema = mapper.createObjectNode();
        schema.put("type", "object");

        ObjectNode properties = mapper.createObjectNode();

        ObjectNode candidates = mapper.createObjectNode();
        candidates.put("type", "array");

        ObjectNode item = mapper.createObjectNode();
        item.put("type", "object");

        ObjectNode itemProps = mapper.createObjectNode();
        itemProps.putObject("title").put("type", "string");
        itemProps.putObject("description").put("type", "string");

        item.set("properties", itemProps);

        ArrayNode itemRequired = mapper.createArrayNode();
        itemRequired.add("title");
        itemRequired.add("description");
        item.set("required", itemRequired);
        item.put("additionalProperties", false);

        candidates.set("items", item);
        properties.set("candidates", candidates);

        schema.set("properties", properties);

        ArrayNode required = mapper.createArrayNode();
        required.add("candidates");
        schema.set("required", required);
        schema.put("additionalProperties", false);

        format.set("schema", schema);
        text.set("format", format);
        body.set("text", text);

        try {
            HttpRequest httpReq = HttpRequest.newBuilder()
                    .uri(URI.create(OPENAI_URL))
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> resp =
                    httpClient.send(httpReq, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() / 100 != 2) {
                plugin.getLogger().warning(
                        "OpenAI がエラーを返しました (" +
                                resp.statusCode() + "): " + resp.body());
                throw new HttpResponseException(
                        502,
                        "AI提案の生成に失敗しました（OpenAIエラー）",
                        Map.of()
                );
            }

            JsonNode root = mapper.readTree(resp.body());

            String json = root.path("output")
                    .path(0)
                    .path("content")
                    .path(0)
                    .path("text")
                    .asText();

            CandidateResponse parsed =
                    mapper.readValue(json, CandidateResponse.class);

            return mapper.valueToTree(parsed.candidates());

        } catch (HttpResponseException e) {
            throw e;
        } catch (Exception e) {
            plugin.getLogger().warning(
                    "OpenAI 応答の解析に失敗しました: " + e.getMessage());
            throw new HttpResponseException(
                    502,
                    "AI提案の生成に失敗しました",
                    Map.of()
            );
        }
    }

    private static String buildContext(SuggestRequest req) {
        StringBuilder sb = new StringBuilder();

        sb.append("以下のクエストにふさわしいクエスト名と説明文を提案してください。\n\n");

        sb.append("【タスク（達成条件）】\n");
        if (req.tasks() != null && !req.tasks().isEmpty()) {
            for (String t : req.tasks()) {
                sb.append("- ").append(t).append("\n");
            }
        } else {
            sb.append("（未設定）\n");
        }

        sb.append("\n【報酬】\n");
        if (req.rewards() != null && !req.rewards().isEmpty()) {
            for (String r : req.rewards()) {
                sb.append("- ").append(r).append("\n");
            }
        } else {
            sb.append("（未設定）\n");
        }

        return sb.toString();
    }

    private ObjectNode msg(String role, String content) {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("role", role);

        ArrayNode contentArray = mapper.createArrayNode();

        ObjectNode text = mapper.createObjectNode();
        text.put("type", "input_text");
        text.put("text", content);

        contentArray.add(text);
        msg.set("content", contentArray);

        return msg;
    }
}
