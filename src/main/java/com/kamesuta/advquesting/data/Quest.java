package com.kamesuta.advquesting.data;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.Map;

/**
 * クエスト定義。JSON ファイルと 1:1 対応する。
 * Jackson でシリアライズ/デシリアライズする。
 * questlineId / mapPosition / commandNumber はランタイムで設定し、ファイルには保存しない（null → 除外）。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Quest {

    public String id;      // 8桁英数字 (例: "a3f7b2c1")
    public String title;
    public String subtitle;
    public String description;
    public String icon;
    public String category;
    public List<String> prerequisites;  // 同一クエストライン内のクエストIDリスト
    public List<Map<String, Object>> conditions;
    public List<Map<String, Object>> rewards;
    public MapPosition mapPosition;     // map.json から設定。ファイルには保存しない
    public List<Map<String, Object>> customButtons;
    public String status;
    public String creatorUuid;
    public String creatorName;
    public String createdAt;
    public String updatedAt;
    /** 繰り返し設定 (null = なし) */
    public RepeatConfig repeat;

    // ランタイムのみ。クエストファイルには保存しない（null → @JsonInclude で除外）
    public String questlineId;
    public Integer commandNumber;

    public static class RepeatConfig {
        /** "none" | "cooldown" | "schedule" | "unlimited" */
        public String type;
        /** cooldown 用: 時間数 */
        public double cooldownHours;
        /** schedule 用: cron 式 "分 時 日 月 曜日" */
        public String cron;
    }

    public static class MapPosition {
        public double x;
        public double y;
    }
}
