use anchor_lang::prelude::*;

/// Provenance of an agent's current score (PDA, seeds = ["score", agent]).
///
/// The passport says what the score is; this record says where it came from:
/// which inputs were hashed, which scoring model produced it, how many scorers
/// agreed, and which Solana Agent Registry entry the agent is linked to.
/// Anyone can recompute the hash from the published inputs and compare.
#[account]
pub struct ScoreRecord {
    /// The agent this record belongs to
    pub agent: Pubkey,               // 32 bytes
    /// The agent's entry in the Solana Agent Registry (default key = not linked)
    pub registry_asset: Pubkey,      // 32 bytes
    /// SHA-256 of the canonical scoring inputs
    pub inputs_hash: [u8; 32],       // 32 bytes
    /// Version of the scoring model that produced the score
    pub model_version: u16,          // 2 bytes
    /// The score that was written to the passport
    pub score: u8,                   // 1 byte
    /// Number of scorers that agreed (1 for a single scorer)
    pub votes: u8,                   // 1 byte
    /// Who wrote the score: the scorer key, or the committee PDA
    pub scorer: Pubkey,              // 32 bytes
    /// Timestamp the score was written
    pub scored_at: i64,              // 8 bytes
    /// Bump seed for the PDA
    pub bump: u8,                    // 1 byte
}

impl ScoreRecord {
    pub const SEED: &'static [u8] = b"score";

    pub const LEN: usize = 8    // discriminator
        + 32   // agent
        + 32   // registry_asset
        + 32   // inputs_hash
        + 2    // model_version
        + 1    // score
        + 1    // votes
        + 32   // scorer
        + 8    // scored_at
        + 1;   // bump
}

// ── Events ──

#[event]
pub struct ScoreAttested {
    pub agent: Pubkey,
    pub scorer: Pubkey,
    pub score: u8,
    pub trust_tier: u8,
    pub votes: u8,
    pub model_version: u16,
    pub inputs_hash: [u8; 32],
    pub registry_asset: Pubkey,
    pub timestamp: i64,
}
