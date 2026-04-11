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
    pub fn initialize_passport(
        ctx: Context<InitializePassport>,
        trust_score: u8,
    ) -> Result<()> {
        instructions::initialize_passport::handler(ctx, trust_score)
    }

    /// Update an agent's trust score and tier (tier is computed from score)
    pub fn update_trust(
        ctx: Context<UpdateTrust>,
        new_score: u8,
    ) -> Result<()> {
        instructions::update_trust::handler(ctx, new_score)
    }

    /// Process a payment only if the agent meets the required trust tier
    pub fn process_payment_with_trust_check(
        ctx: Context<ProcessPayment>,
        required_tier: TrustTier,
        amount: u64,
    ) -> Result<()> {
        instructions::process_payment::handler(ctx, required_tier, amount)
    }

    /// Freeze a passport — blocks all transactions
    pub fn freeze_passport(ctx: Context<FreezePassport>) -> Result<()> {
        instructions::freeze_passport::freeze_handler(ctx)
    }

    /// Unfreeze a passport — re-enables transactions
    pub fn unfreeze_passport(ctx: Context<FreezePassport>) -> Result<()> {
        instructions::freeze_passport::unfreeze_handler(ctx)
    }

    /// Close a passport and reclaim rent
    pub fn close_passport(ctx: Context<ClosePassport>) -> Result<()> {
        instructions::close_passport::handler(ctx)
    }

    /// Process an SPL token payment with trust-gate check
    pub fn process_spl_payment(
        ctx: Context<ProcessSplPayment>,
        required_tier: TrustTier,
        amount: u64,
    ) -> Result<()> {
        instructions::process_spl_payment::handler(ctx, required_tier, amount)
    }
}
