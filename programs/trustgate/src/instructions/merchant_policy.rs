use anchor_lang::prelude::*;
use crate::errors::TruvaError;
use crate::state::merchant::{MerchantPolicy, MerchantPolicySet};
use crate::state::passport::TrustTier;

#[derive(Accounts)]
pub struct SetMerchantPolicy<'info> {
    #[account(
        init_if_needed,
        payer = merchant,
        space = MerchantPolicy::LEN,
        seeds = [MerchantPolicy::SEED, merchant.key().as_ref()],
        bump
    )]
    pub policy: Account<'info, MerchantPolicy>,

    /// The recipient setting its own minimum tier
    #[account(mut)]
    pub merchant: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn set_handler(ctx: Context<SetMerchantPolicy>, min_tier: TrustTier) -> Result<()> {
    let policy = &mut ctx.accounts.policy;
    policy.merchant = ctx.accounts.merchant.key();
    policy.min_tier = min_tier;
    policy.bump = ctx.bumps.policy;

    emit!(MerchantPolicySet {
        merchant: policy.merchant,
        min_tier: min_tier as u8,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CloseMerchantPolicy<'info> {
    #[account(
        mut,
        close = merchant,
        seeds = [MerchantPolicy::SEED, merchant.key().as_ref()],
        bump = policy.bump,
        has_one = merchant @ TruvaError::Unauthorized,
    )]
    pub policy: Account<'info, MerchantPolicy>,

    #[account(mut)]
    pub merchant: Signer<'info>,
}

pub fn close_handler(_ctx: Context<CloseMerchantPolicy>) -> Result<()> {
    Ok(())
}
