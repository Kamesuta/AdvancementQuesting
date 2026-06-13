package com.kamesuta.advquesting.db;

import java.sql.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class ProposalDao {

    public record ProposalRecord(
        int id,
        int questId,
        String proposerUuid,
        String proposerName,
        String status,
        int votesUp,
        int votesDown,
        String rejectReason,
        String createdAt
    ) {}

    private final DatabaseManager db;

    public ProposalDao(DatabaseManager db) {
        this.db = db;
    }

    public List<ProposalRecord> findAll() throws SQLException {
        String sql = "SELECT * FROM quest_proposals ORDER BY created_at DESC";
        try (Statement st = db.getConnection().createStatement()) {
            return toList(st.executeQuery(sql));
        }
    }

    public List<ProposalRecord> findPending() throws SQLException {
        String sql = "SELECT * FROM quest_proposals WHERE status = 'pending' ORDER BY created_at DESC";
        try (Statement st = db.getConnection().createStatement()) {
            return toList(st.executeQuery(sql));
        }
    }

    public ProposalRecord findById(int id) throws SQLException {
        String sql = "SELECT * FROM quest_proposals WHERE id = ?";
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) return fromRow(rs);
            return null;
        }
    }

    public ProposalRecord create(int questId, String proposerUuid, String proposerName) throws SQLException {
        String sql = """
            INSERT INTO quest_proposals (quest_id, proposer_uuid, proposer_name, created_at)
            VALUES (?, ?, ?, ?)
            """;
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, questId);
            ps.setString(2, proposerUuid);
            ps.setString(3, proposerName);
            ps.setString(4, Instant.now().toString());
            ps.executeUpdate();
            ResultSet keys = ps.getGeneratedKeys();
            if (keys.next()) return findById(keys.getInt(1));
            throw new SQLException("Failed to get generated key");
        }
    }

    public boolean delete(int id) throws SQLException {
        String sql = "DELETE FROM quest_proposals WHERE id = ?";
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        }
    }

    public boolean approve(int id) throws SQLException {
        String sql = "UPDATE quest_proposals SET status = 'approved' WHERE id = ? AND status = 'pending'";
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        }
    }

    public boolean reject(int id, String reason) throws SQLException {
        String sql = "UPDATE quest_proposals SET status = 'rejected', reject_reason = ? WHERE id = ? AND status = 'pending'";
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setString(1, reason);
            ps.setInt(2, id);
            return ps.executeUpdate() > 0;
        }
    }

    /** 投票: 同方向なら取り消し、逆方向なら上書き。votes_up/down を同期更新する。 */
    public String vote(int proposalId, String playerUuid, String voteType) throws SQLException {
        Connection conn = db.getConnection();
        // 既存投票を確認
        String existing = null;
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT vote_type FROM proposal_votes WHERE proposal_id = ? AND player_uuid = ?")) {
            ps.setInt(1, proposalId);
            ps.setString(2, playerUuid);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) existing = rs.getString("vote_type");
        }

        if (voteType.equals(existing)) {
            // 同方向 → 取り消し
            try (PreparedStatement ps = conn.prepareStatement(
                    "DELETE FROM proposal_votes WHERE proposal_id = ? AND player_uuid = ?")) {
                ps.setInt(1, proposalId);
                ps.setString(2, playerUuid);
                ps.executeUpdate();
            }
            syncVoteCounts(proposalId);
            return null;
        } else {
            // 新規または上書き
            try (PreparedStatement ps = conn.prepareStatement("""
                    INSERT INTO proposal_votes (proposal_id, player_uuid, vote_type, voted_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(proposal_id, player_uuid) DO UPDATE SET vote_type = excluded.vote_type, voted_at = excluded.voted_at
                    """)) {
                ps.setInt(1, proposalId);
                ps.setString(2, playerUuid);
                ps.setString(3, voteType);
                ps.setString(4, Instant.now().toString());
                ps.executeUpdate();
            }
            syncVoteCounts(proposalId);
            return voteType;
        }
    }

    public String getMyVote(int proposalId, String playerUuid) throws SQLException {
        try (PreparedStatement ps = db.getConnection().prepareStatement(
                "SELECT vote_type FROM proposal_votes WHERE proposal_id = ? AND player_uuid = ?")) {
            ps.setInt(1, proposalId);
            ps.setString(2, playerUuid);
            ResultSet rs = ps.executeQuery();
            return rs.next() ? rs.getString("vote_type") : null;
        }
    }

    private void syncVoteCounts(int proposalId) throws SQLException {
        String sql = """
            UPDATE quest_proposals SET
                votes_up   = (SELECT COUNT(*) FROM proposal_votes WHERE proposal_id = ? AND vote_type = 'up'),
                votes_down = (SELECT COUNT(*) FROM proposal_votes WHERE proposal_id = ? AND vote_type = 'down')
            WHERE id = ?
            """;
        try (PreparedStatement ps = db.getConnection().prepareStatement(sql)) {
            ps.setInt(1, proposalId);
            ps.setInt(2, proposalId);
            ps.setInt(3, proposalId);
            ps.executeUpdate();
        }
    }

    private List<ProposalRecord> toList(ResultSet rs) throws SQLException {
        List<ProposalRecord> list = new ArrayList<>();
        while (rs.next()) list.add(fromRow(rs));
        return list;
    }

    private ProposalRecord fromRow(ResultSet rs) throws SQLException {
        return new ProposalRecord(
            rs.getInt("id"),
            rs.getInt("quest_id"),
            rs.getString("proposer_uuid"),
            rs.getString("proposer_name"),
            rs.getString("status"),
            rs.getInt("votes_up"),
            rs.getInt("votes_down"),
            rs.getString("reject_reason"),
            rs.getString("created_at")
        );
    }
}
