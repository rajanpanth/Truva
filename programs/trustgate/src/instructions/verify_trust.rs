use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::set_return_data;
use crate::state::config::ProtocolConfig;
use crate::state::passport::{AgentPassport, TrustTier};

/// Read-only trust check for other programs to call by CPI.
/// Fails unless the agent's passport is scored by the protocol scorer,
/// not frozen, and at or above `min_tier`.
#[derive(Accounts)]
pub struct VerifyTrust<'info> {
    #[account(
        seeds = [ProtocolConfig::SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        seeds = [b"passport", passport.agent.as_ref()],
        bump = passport.bump,
    )]
    pub passport: Account<'info, AgentPassport>,
}

pub fn handler(ctx: Context<VerifyTrust>, min_tier: TrustTier) -> Result<()> {
    let passport = &ctx.accounts.passport;
    passport.assert_trusted(&ctx.accounts.config, min_tier)?;

    // Return data: [trust_score, trust_tier]
    set_return_data(&[passport.trust_score, passport.trust_tier as u8]);

    Ok(())
}
