package com.kamesuta.advquesting.data;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class CommentManager {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);

    private final File dataFile;
    private final ReadWriteLock lock = new ReentrantReadWriteLock();

    public CommentManager(File dataFolder) {
        this.dataFile = new File(dataFolder, "comments.json");
    }

    public List<CommentBlock> getAll() {
        lock.readLock().lock();
        try {
            return loadFromDisk();
        } finally {
            lock.readLock().unlock();
        }
    }

    public CommentBlock upsert(CommentBlock block) throws IOException {
        lock.writeLock().lock();
        try {
            List<CommentBlock> list = loadFromDisk();
            boolean found = false;
            for (int i = 0; i < list.size(); i++) {
                if (list.get(i).id.equals(block.id)) {
                    list.set(i, block);
                    found = true;
                    break;
                }
            }
            if (!found) {
                if (block.id == null) block.id = UUID.randomUUID().toString();
                list.add(block);
            }
            saveToDisk(list);
            return block;
        } finally {
            lock.writeLock().unlock();
        }
    }

    public boolean delete(String id) throws IOException {
        lock.writeLock().lock();
        try {
            List<CommentBlock> list = loadFromDisk();
            boolean removed = list.removeIf(b -> b.id.equals(id));
            if (removed) saveToDisk(list);
            return removed;
        } finally {
            lock.writeLock().unlock();
        }
    }

    private List<CommentBlock> loadFromDisk() {
        if (!dataFile.exists()) return new ArrayList<>();
        try {
            return MAPPER.readValue(dataFile, new TypeReference<List<CommentBlock>>() {});
        } catch (IOException e) {
            return new ArrayList<>();
        }
    }

    private void saveToDisk(List<CommentBlock> list) throws IOException {
        MAPPER.writeValue(dataFile, list);
    }
}
