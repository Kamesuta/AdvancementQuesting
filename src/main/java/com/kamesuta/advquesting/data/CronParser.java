package com.kamesuta.advquesting.data;

import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.BitSet;

/**
 * 簡易 cron パーサー。"分 時 日 月 曜日" の5フィールド形式をサポートする。
 * 対応: 数値, *, * /n, a-b, a,b
 * 曜日: 0=日曜, 1=月曜, ..., 6=土曜
 */
public class CronParser {

    private final BitSet minutes = new BitSet(60);  // 0-59
    private final BitSet hours   = new BitSet(24);  // 0-23
    private final BitSet days    = new BitSet(32);  // 1-31
    private final BitSet months  = new BitSet(13);  // 1-12
    private final BitSet dows    = new BitSet(7);   // 0-6 (日-土)

    private CronParser(String expr) {
        String[] fields = expr.trim().split("\\s+");
        if (fields.length != 5) throw new IllegalArgumentException("cron must have 5 fields: " + expr);
        parse(fields[0], minutes, 0, 59);
        parse(fields[1], hours,   0, 23);
        parse(fields[2], days,    1, 31);
        parse(fields[3], months,  1, 12);
        parse(fields[4], dows,    0, 6);
    }

    private static void parse(String field, BitSet bs, int min, int max) {
        if ("*".equals(field)) {
            bs.set(min, max + 1);
            return;
        }
        for (String part : field.split(",")) {
            if (part.startsWith("*/")) {
                int step = Integer.parseInt(part.substring(2));
                for (int i = min; i <= max; i += step) bs.set(i);
            } else if (part.contains("-")) {
                String[] range = part.split("-", 2);
                int lo = Integer.parseInt(range[0]);
                int hi = Integer.parseInt(range[1]);
                bs.set(lo, hi + 1);
            } else {
                bs.set(Integer.parseInt(part));
            }
        }
    }

    /** cron 式をパースする。不正な場合は null を返す */
    public static CronParser parse(String expr) {
        try { return new CronParser(expr); } catch (Exception e) { return null; }
    }

    /** now より前で最も直近の発火時刻を返す (分単位精度)。マッチしない場合 null */
    public static ZonedDateTime prevFire(String expr, ZonedDateTime now) {
        CronParser cp = parse(expr);
        if (cp == null) return null;
        // 現在分の1分前から過去24時間以内を探す (schedule クエストは最大1分遅延で検出)
        ZonedDateTime t = now.truncatedTo(ChronoUnit.MINUTES).minusMinutes(1);
        ZonedDateTime limit = now.minusHours(25);
        while (t.isAfter(limit)) {
            if (cp.matches(t)) return t;
            t = t.minusMinutes(1);
        }
        return null;
    }

    /** 次の発火時刻を返す（残り時間表示用・APIで使用）。最大366日先まで探す */
    public static ZonedDateTime nextFire(String expr, ZonedDateTime from) {
        CronParser cp = parse(expr);
        if (cp == null) return null;
        ZonedDateTime t = from.truncatedTo(ChronoUnit.MINUTES).plusMinutes(1);
        ZonedDateTime limit = from.plusDays(366);
        while (t.isBefore(limit)) {
            if (cp.matches(t)) return t;
            t = t.plusMinutes(1);
        }
        return null;
    }

    private boolean matches(ZonedDateTime t) {
        return minutes.get(t.getMinute())
            && hours.get(t.getHour())
            && days.get(t.getDayOfMonth())
            && months.get(t.getMonthValue())
            && dows.get(t.getDayOfWeek().getValue() % 7); // ISO: 1=月...7=日 → %7: 1=月,0=日
    }
}
