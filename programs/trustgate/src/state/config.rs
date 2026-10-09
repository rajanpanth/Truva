use anchor_lang::prelude::*;

/// Global protocol configuration (singleton PDA, seeds = ["config"]).
///
/// A passport is only trusted by the gate when `passport.authority == config.scorer`,
/// so nobody can create a passport and assign themselves a tier.
#[account]
pub struct ProtocolConfig {
    /// Can rotate the scorer and hand over admin rights
    pub admin: Pubkey,           // 32 bytes
    /// The only key whose scores and tiers the gate accepts
    pub scorer: Pubkey,          // 32 bytes
    /// Bump seed for the PDA
    pub bump: u8,                // 1 byte
}

impl ProtocolConfig {
    pub const SEED: &'static [u8] = b"config";

    pub const LEN: usize = 8    // discriminator
        + 32   // admin
        + 32   // scorer
        + 1;   // bump
}

// ── Events ──

#[event]
pub struct ConfigUpdated {
    pub admin: Pubkey,
    pub scorer: Pubkey,
    pub timestamp: i64,
}
