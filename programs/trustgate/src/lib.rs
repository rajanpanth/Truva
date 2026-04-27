use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("TRSTgateXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod trustgate {
    use super::*;

    /// Initialize a new Agent Passport PDA
    /// Creates with trust_score = 0, trust_tier = Bronze, tx_count = 0, frozen = false
    pub fn initialize_passport(ctx: Context<InitializePassport>) -> Result<()> {
        instructions::initialize_passport::handler(ctx)
    }

    /// Update an agent's trust score and tier (called by backend authority only)
    /// Validates: authority must match passport.authority
    /// Validates: score must be 0-100
    /// Emits: TrustTierUpdated event with old and new tier
    pub fn update_trust_tier(
        ctx: Context<UpdateTrustTier>,
        new_score: u8,
    ) -> Result<()> {
        instructions::update_trust_tier::handler(ctx, new_score)
    }

    /// Process a SOL payment with trust-gate check
    /// Checks: passport must not be frozen
    /// Checks: trust_tier must meet required_tier parameter
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
