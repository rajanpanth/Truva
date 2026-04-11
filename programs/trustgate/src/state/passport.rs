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
    pub agent_pubkey: Pubkey,
    /// Trust score from 0 to 100
    pub trust_score: u8,
    /// Computed trust tier based on score
    pub trust_tier: TrustTier,
    /// Number of successful transactions
    pub transaction_count: u32,
    /// Authority that can update this passport
    pub authority: Pubkey,
    /// Timestamp of last update
    pub last_updated: i64,
    /// Whether this passport is frozen (blocked from transactions)
    pub is_frozen: bool,
    /// Bump seed for the PDA
    pub bump: u8,
}

impl AgentPassport {
    pub const LEN: usize = 8  // discriminator
        + 32  // agent_pubkey
        + 1   // trust_score
        + 1   // trust_tier (enum)
        + 4   // transaction_count
        + 32  // authority
        + 8   // last_updated
        + 1   // is_frozen
        + 1;  // bump
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
pub struct TrustUpdated {
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
    pub transaction_count: u32,
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
