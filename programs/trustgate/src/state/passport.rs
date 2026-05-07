use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
pub enum TrustTier {
    Bronze = 0,
    Silver = 1,
    Gold = 2,
}

impl TrustTier {
    pub fn from_score(score: u8) -> Self {
        match score {
            0..=49 => TrustTier::Bronze,
            50..=79 => TrustTier::Silver,
            80..=100 => TrustTier::Gold,
            _ => TrustTier::Bronze,
        }
    }

    pub fn label(&self) -> &str {
        match self {
            TrustTier::Bronze => "Bronze",
            TrustTier::Silver => "Silver",
            TrustTier::Gold => "Gold",
        }
    }
}

#[account]
pub struct AgentPassport {
    /// The public key of the agent this passport belongs to
    pub agent: Pubkey,           // 32 bytes
    /// Authority that can update this passport
    pub authority: Pubkey,       // 32 bytes
    /// Trust score from 0 to 100
    pub trust_score: u8,         // 1 byte
    /// Computed trust tier based on score
    pub trust_tier: TrustTier,   // 1 byte
    /// Total number of transactions
    pub tx_count: u64,           // 8 bytes
    /// Number of successful transactions
    pub success_count: u64,      // 8 bytes
    /// Whether this passport is frozen (blocked from transactions)
    pub frozen: bool,            // 1 byte
    /// Timestamp when passport was created
    pub created_at: i64,         // 8 bytes
    /// Timestamp of last update
    pub updated_at: i64,         // 8 bytes
    /// Bump seed for the PDA
    pub bump: u8,                // 1 byte
}

impl AgentPassport {
    pub const LEN: usize = 8    // discriminator
        + 32   // agent
        + 32   // authority
        + 1    // trust_score
        + 1    // trust_tier (enum)
        + 8    // tx_count
        + 8    // success_count
        + 1    // frozen
        + 8    // created_at
        + 8    // updated_at
        + 1;   // bump
}

// ── Events ──

#[event]
pub struct PassportInitialized {
    pub agent: Pubkey,
    pub authority: Pubkey,
    pub trust_score: u8,
    pub trust_tier: u8,
    pub timestamp: i64,
}

#[event]
pub struct TrustTierUpdated {
    pub agent: Pubkey,
    pub old_score: u8,
    pub new_score: u8,
    pub old_tier: u8,
    pub new_tier: u8,
    pub timestamp: i64,
}

#[event]
pub struct PaymentProcessed {
    pub agent: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub trust_tier: u8,
    pub tx_count: u64,
    pub timestamp: i64,
}

#[event]
pub struct PassportFrozen {
    pub agent: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PassportUnfrozen {
    pub agent: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PassportClosed {
    pub agent: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}
