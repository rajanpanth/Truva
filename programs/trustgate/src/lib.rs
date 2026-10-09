use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5");

#[program]
pub mod trustgate {
    use super::*;

    /// Create the global protocol config and set the scorer
    /// Signer must be the program's upgrade authority
    pub fn initialize_config(ctx: Context<InitializeConfig>, scorer: Pubkey) -> Result<()> {
        instructions::config::initialize_handler(ctx, scorer)
    }

    /// Rotate the scorer and/or hand over admin rights
    /// Admin only
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        new_admin: Option<Pubkey>,
        new_scorer: Option<Pubkey>,
    ) -> Result<()> {
        instructions::config::update_handler(ctx, new_admin, new_scorer)
    }

    /// Initialize a new Agent Passport PDA
    /// Creates with trust_score = 0, trust_tier = Bronze, tx_count = 0, frozen = false
    /// Anyone can pay for it; the authority is always the protocol scorer
    pub fn initialize_passport(ctx: Context<InitializePassport>) -> Result<()> {
        instructions::initialize_passport::handler(ctx)
    }

    /// Bring a passport under the current protocol scorer with an explicit score and tier
    /// Scorer only
    pub fn adopt_passport(
        ctx: Context<AdoptPassport>,
        score: u8,
        tier: TrustTier,
    ) -> Result<()> {
        instructions::adopt_passport::handler(ctx, score, tier)
    }

    /// Update an agent's trust score and tier (called by backend authority only)
    /// The tier is computed off-chain from all scoring signals, so it is passed in
    /// rather than derived from the score
    /// Validates: authority must match passport.authority
    /// Validates: score must be 0-100
    /// Emits: TrustTierUpdated event with old and new tier
    pub fn update_trust_tier(
        ctx: Context<UpdateTrustTier>,
        new_score: u8,
        new_tier: TrustTier,
    ) -> Result<()> {
        instructions::update_trust_tier::handler(ctx, new_score, new_tier)
    }

    /// Read-only trust check for other programs to call by CPI
    /// Fails unless the passport is scored by the protocol scorer, not frozen,
    /// and at or above min_tier. Return data: [trust_score, trust_tier]
    /// Write a score with its provenance: inputs hash, model version and
    /// Solana Agent Registry link. The tier is derived from the score.
    pub fn attest_score(
        ctx: Context<AttestScore>,
        score: u8,
        inputs_hash: [u8; 32],
        model_version: u16,
        registry_asset: Pubkey,
    ) -> Result<()> {
        instructions::score::attest_handler(ctx, score, inputs_hash, model_version, registry_asset)
    }

    /// Create or replace the scorer committee (admin only).
    pub fn set_committee(
        ctx: Context<SetCommittee>,
        members: Vec<Pubkey>,
        threshold: u8,
    ) -> Result<()> {
        instructions::committee::set_handler(ctx, members, threshold)
    }

    /// A committee member votes on an agent's score; the median is written
    /// once the threshold is reached.
    pub fn committee_vote(
        ctx: Context<CommitteeVote>,
        score: u8,
        inputs_hash: [u8; 32],
        model_version: u16,
        registry_asset: Pubkey,
    ) -> Result<()> {
        instructions::committee::vote_handler(ctx, score, inputs_hash, model_version, registry_asset)
    }

    /// Freeze (any committee member) or unfreeze (admin) a passport scored by the committee.
    pub fn committee_set_frozen(ctx: Context<CommitteeSetFrozen>, frozen: bool) -> Result<()> {
        instructions::committee::set_frozen_handler(ctx, frozen)
    }

    pub fn verify_trust(ctx: Context<VerifyTrust>, min_tier: TrustTier) -> Result<()> {
        instructions::verify_trust::handler(ctx, min_tier)
    }

    /// Set the minimum trust tier agents need to pay the signer
    pub fn set_merchant_policy(
        ctx: Context<SetMerchantPolicy>,
        min_tier: TrustTier,
    ) -> Result<()> {
        instructions::merchant_policy::set_handler(ctx, min_tier)
    }

    /// Remove the signer's merchant policy and reclaim rent
    pub fn close_merchant_policy(ctx: Context<CloseMerchantPolicy>) -> Result<()> {
        instructions::merchant_policy::close_handler(ctx)
    }

    /// Create a spending vault for one agent and one mint
    /// Owner sets a per-payment limit, a daily limit and an optional recipient allowlist
    pub fn create_vault(
        ctx: Context<CreateVault>,
        per_tx_limit: u64,
        daily_limit: u64,
        allowlist: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::vault::create_handler(ctx, per_tx_limit, daily_limit, allowlist)
    }

    /// Change a vault's limits and allowlist
    /// Owner only
    pub fn update_vault_policy(
        ctx: Context<UpdateVault>,
        per_tx_limit: u64,
        daily_limit: u64,
        allowlist: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::vault::update_policy_handler(ctx, per_tx_limit, daily_limit, allowlist)
    }

    /// Pause or resume agent payments from a vault
    /// Owner only
    pub fn set_vault_paused(ctx: Context<UpdateVault>, paused: bool) -> Result<()> {
        instructions::vault::set_paused_handler(ctx, paused)
    }

    /// Pay from a vault. Signed by the agent, enforced by the program:
    /// Checks: vault not paused, passport trusted and not frozen
    /// Checks: tier meets the recipient's merchant policy
    /// Checks: per-payment limit, daily limit, recipient allowlist
    /// Emits: VaultPayment event
    pub fn vault_pay(ctx: Context<VaultPay>, amount: u64) -> Result<()> {
        instructions::vault::pay_handler(ctx, amount)
    }

    /// Withdraw tokens from a vault back to the owner
    /// Owner only
    pub fn vault_withdraw(ctx: Context<VaultWithdraw>, amount: u64) -> Result<()> {
        instructions::vault::withdraw_handler(ctx, amount)
    }

    /// Return the remaining balance to the owner and close the vault
    /// Owner only
    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        instructions::vault::close_handler(ctx)
    }

    /// Process a SOL payment with trust-gate check
    /// Checks: passport must be scored by the protocol scorer
    /// Checks: passport must not be frozen
    /// Checks: trust_tier must meet required_tier and the recipient's merchant policy
    /// Checks: amount must not exceed tier limit
    /// Updates: tx_count += 1, success_count += 1
    /// Emits: PaymentProcessed event
    pub fn process_payment_sol(
        ctx: Context<ProcessPaymentSol>,
        required_tier: TrustTier,
        amount: u64,
    ) -> Result<()> {
        instructions::process_payment_sol::handler(ctx, required_tier, amount)
    }

    /// Process an SPL token payment with trust-gate check
    /// Same logic as process_payment_sol but uses token program CPI
    pub fn process_payment_spl(
        ctx: Context<ProcessPaymentSpl>,
        required_tier: TrustTier,
        amount: u64,
    ) -> Result<()> {
        instructions::process_payment_spl::handler(ctx, required_tier, amount)
    }

    /// Freeze a passport — blocks all transactions
    /// Authority only
    /// Emits: PassportFrozen event
    pub fn freeze_passport(ctx: Context<FreezePassport>) -> Result<()> {
        instructions::freeze_passport::freeze_handler(ctx)
    }

    /// Unfreeze a passport — re-enables transactions
    /// Authority only
    /// Emits: PassportUnfrozen event
    pub fn unfreeze_passport(ctx: Context<FreezePassport>) -> Result<()> {
        instructions::freeze_passport::unfreeze_handler(ctx)
    }

    /// Migrate an existing passport to the new account layout
    /// Sets default values for new fields (success_count, created_at)
    /// Authority only — idempotent (safe to call multiple times)
    pub fn migrate_passport(ctx: Context<MigratePassport>) -> Result<()> {
        instructions::migrate_passport::handler(ctx)
    }

    /// Close a passport and reclaim rent to authority
    /// Authority only
    pub fn close_passport(ctx: Context<ClosePassport>) -> Result<()> {
        instructions::close_passport::handler(ctx)
    }
}
