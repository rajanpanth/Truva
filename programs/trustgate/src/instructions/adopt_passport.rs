use anchor_lang::prelude::*;
use crate::errors::TruvaError;
use crate::state::config::ProtocolConfig;
use crate::state::passport::{AgentPassport, PassportAdopted, TrustTier};

/// Bring a passport under the current protocol scorer.
/// Used for passports created before the config existed (their authority was
/// whoever created them) and after a scorer rotation. The scorer sets the
/// score and tier explicitly, so a self-assigned tier never carries over.
#[derive(Accounts)]
pub struct AdoptPassport<'info> {
    #[account(
        seeds = [ProtocolConfig::SEED],
        bump = config.bump,
        has_one = scorer @ TruvaError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"passport", passport.agent.as_ref()],
        bump = passport.bump,
    )]
    pub passport: Account<'info, AgentPassport>,

    pub scorer: Signer<'info>,
}

pub fn handler(ctx: Context<AdoptPassport>, score: u8, tier: TrustTier) -> Result<()> {
    require!(score <= 100, TruvaError::InvalidTrustScore);

    let passport = &mut ctx.accounts.passport;
    let old_authority = passport.authority;
    let timestamp = Clock::get()?.unix_timestamp;

    passport.authority = ctx.accounts.scorer.key();
    passport.trust_score = score;
    passport.trust_tier = tier;
    passport.updated_at = timestamp;

    emit!(PassportAdopted {
        agent: passport.agent,
        old_authority,
        new_authority: passport.authority,
        trust_score: score,
        trust_tier: tier as u8,
        timestamp,
    });

    Ok(())
}
