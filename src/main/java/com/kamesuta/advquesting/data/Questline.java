package com.kamesuta.advquesting.data;

import java.util.ArrayList;
import java.util.List;

/**
 * クエストラインの定義。
 * フォルダ名: {2桁順序}_{8桁ID}_{日本語名}  例: 01_a1b2c3d4_冒険クエストライン
 * map.json に icon / nodes を保存。id / order / title はフォルダ名から取得。
 */
public class Questline {

    /** フォルダ名から抽出した 8 桁 ID。map.json には保存しない */
    public String id;

    /** フォルダ名先頭 2 桁の並び順 */
    public int order;

    /** フォルダ名から抽出した日本語名 */
    public String title;

    /** map.json に保存するアイコン */
    public String icon;

    /** map.json に保存するノード位置リスト。配列順がコマンド採番順になる */
    public List<MapNode> nodes = new ArrayList<>();

    /** loadAll 時に quests/ フォルダから設定。map.json には保存しない */
    public List<Quest> quests = new ArrayList<>();

    /** map.json のファイル形式（icon と nodes のみを持つ） */
    public static class MapFile {
        public String icon;
        public List<MapNode> nodes = new ArrayList<>();
    }

    public static class MapNode {
        public String questId;
        public double x;
        public double y;
    }
}
