package com.kamesuta.advquesting.api;

import io.javalin.Javalin;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.Map;

public class ConfigRoutes {

    private final JavaPlugin plugin;

    public ConfigRoutes(JavaPlugin plugin) {
        this.plugin = plugin;
    }

    public void register(Javalin app) {
        app.get("/api/config", ctx -> {
            String title = plugin.getConfig().getString("site-title", "AdvancementQuesting");
            String faviconItem = plugin.getConfig().getString("site-favicon-item", "writable_book");
            ctx.json(Map.of(
                "title", title,
                "faviconItem", faviconItem
            ));
        });
    }
}
