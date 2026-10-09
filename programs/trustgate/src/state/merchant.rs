use anchor_lang::prelude::*;
use crate::state::passport::TrustTier;

/// Minimum trust tier a recipient requires from agents paying it
/// (PDA, seeds = ["merchant", merchant]).
///
/// Payment instructions always take this PDA, so the paying agent cannot
/// skip it or pick a lower tier for itself.
#[account]
pub struct MerchantPolicy {
    /// The recipient wallet this policy belongs to
    pub merchant: Pubkey,        // 32 bytes
    /// Minimum tier an agent needs to pay this recipient
    pub min_tier: TrustTier,     // 1 byte
    /// Bump seed for the PDA
    pub bump: u8,                // 1 byte
}

impl MerchantPolicy {
    pub const SEED: &'static [u8] = b"merchant";

    pub const LEN: usize = 8    // discriminator
        + 32   // merchant
        + 1    // min_tier
        + 1;   // bump

    /// Read the tier required by a merchant policy PDA.
    /// A recipient that never set a policy has an empty account: Bronze applies.
    /// The caller must have verified the PDA address via `seeds`.
    pub fn required_tier(info: &AccountInfo) -> Result<TrustTier> {
        if info.owner != &crate::ID || info.data_is_empty() {
            return Ok(TrustTier::Bronze);
        }
        let data = info.try_borrow_data()?;
        let policy = MerchantPolicy::try_deserialize(&mut &data[..])?;
        Ok(policy.min_tier)
    }
}

// ── Events ──

#[event]
pub struct MerchantPolicySet {
    pub merchant: Pubkey,
    pub min_tier: u8,
    pub timestamp: i64,
}
