use anchor_lang::prelude::*;
use crate::errors::TruvaError;

/// Maximum number of recipients an owner can allowlist per vault
pub const MAX_ALLOWLIST: usize = 8;

/// Length of the rolling spend window in seconds (24 hours)
pub const SPEND_WINDOW_SECS: i64 = 86_400;

/// Owner-funded spending account for one agent and one mint
/// (PDA, seeds = ["vault", owner, agent, mint]).
///
/// Tokens sit in a token account owned by this PDA, so the agent key can
/// only move them through `vault_pay`, which enforces the owner's limits.
#[account]
pub struct AgentVault {
    /// Wallet that funds the vault and sets its limits
    pub owner: Pubkey,                           // 32 bytes
    /// Agent key allowed to spend from the vault
    pub agent: Pubkey,                           // 32 bytes
    /// Token mint held by the vault
    pub mint: Pubkey,                            // 32 bytes
    /// Maximum amount per payment (token base units)
    pub per_tx_limit: u64,                       // 8 bytes
    /// Maximum amount per 24h window (token base units)
    pub daily_limit: u64,                        // 8 bytes
    /// Amount spent in the current window
    pub spent_in_window: u64,                    // 8 bytes
    /// Timestamp the current window started
    pub window_start: i64,                       // 8 bytes
    /// Lifetime amount paid out by the agent
    pub total_spent: u64,                        // 8 bytes
    /// Owner kill switch: blocks all agent payments while true
    pub paused: bool,                            // 1 byte
    /// Number of used entries in `allowlist` (0 = any recipient)
    pub allowlist_len: u8,                       // 1 byte
    /// Recipient wallets the agent may pay
    pub allowlist: [Pubkey; MAX_ALLOWLIST],      // 32 * 8 bytes
    /// Bump seed for the PDA
    pub bump: u8,                                // 1 byte
}

impl AgentVault {
    pub const SEED: &'static [u8] = b"vault";

    pub const LEN: usize = 8    // discriminator
        + 32   // owner
        + 32   // agent
        + 32   // mint
        + 8    // per_tx_limit
        + 8    // daily_limit
        + 8    // spent_in_window
        + 8    // window_start
        + 8    // total_spent
        + 1    // paused
        + 1    // allowlist_len
        + 32 * MAX_ALLOWLIST // allowlist
        + 1;   // bump

    pub fn set_policy(
        &mut self,
        per_tx_limit: u64,
        daily_limit: u64,
        allowlist: &[Pubkey],
    ) -> Result<()> {
        require!(allowlist.len() <= MAX_ALLOWLIST, TruvaError::AllowlistTooLong);
        require!(per_tx_limit <= daily_limit, TruvaError::InvalidLimits);

        self.per_tx_limit = per_tx_limit;
        self.daily_limit = daily_limit;
        self.allowlist = [Pubkey::default(); MAX_ALLOWLIST];
        self.allowlist[..allowlist.len()].copy_from_slice(allowlist);
        self.allowlist_len = allowlist.len() as u8;
        Ok(())
    }

    pub fn is_allowed(&self, recipient: &Pubkey) -> bool {
        self.allowlist_len == 0
            || self.allowlist[..self.allowlist_len as usize].contains(recipient)
    }

    /// Check a payment against the owner's limits and record it.
    pub fn record_spend(&mut self, amount: u64, now: i64) -> Result<()> {
        require!(amount > 0, TruvaError::InvalidAmount);
        require!(amount <= self.per_tx_limit, TruvaError::ExceedsPerTxLimit);

        if now.saturating_sub(self.window_start) >= SPEND_WINDOW_SECS {
            self.window_start = now;
            self.spent_in_window = 0;
        }

        let spent = self
            .spent_in_window
            .checked_add(amount)
            .ok_or(TruvaError::ArithmeticOverflow)?;
        require!(spent <= self.daily_limit, TruvaError::ExceedsDailyLimit);

        self.spent_in_window = spent;
        self.total_spent = self
            .total_spent
            .checked_add(amount)
            .ok_or(TruvaError::ArithmeticOverflow)?;
        Ok(())
    }
}

// ── Events ──

#[event]
pub struct VaultCreated {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub agent: Pubkey,
    pub mint: Pubkey,
    pub per_tx_limit: u64,
    pub daily_limit: u64,
    pub timestamp: i64,
}

#[event]
pub struct VaultPolicyUpdated {
    pub vault: Pubkey,
    pub per_tx_limit: u64,
    pub daily_limit: u64,
    pub allowlist_len: u8,
    pub paused: bool,
    pub timestamp: i64,
}

#[event]
pub struct VaultPayment {
    pub vault: Pubkey,
    pub agent: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub spent_in_window: u64,
    pub trust_tier: u8,
    pub timestamp: i64,
}

#[event]
pub struct VaultWithdrawal {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
