use anchor_lang::prelude::*;
use crate::errors::TruvaError;
use crate::state::passport::{AgentPassport, TrustTier, TrustTierUpdated};

#[derive(Accounts)]
pub struct UpdateTrustTier<'info> {
    #[account(
        mut,
        seeds = [b"passport", passport.agent.as_ref()],
        bump = passport.bump,
        has_one = authority @ TruvaError::Unauthorized,
    )]
    pub passport: Account<'info, AgentPassport>,

    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateTrustTier>,
    new_score: u8,
) -> Result<()> {
    require!(new_score <= 100, TruvaError::InvalidTrustScore);

    let passport = &mut ctx.accounts.passport;

    require!(!passport.frozen, TruvaError::PassportFrozen);

    let old_score = passport.trust_score;
    let old_tier = passport.trust_tier as u8;
    let new_tier = TrustTier::from_score(new_score);
    let timestamp = Clock::get()?.unix_timestamp;

    passport.trust_score = new_score;
    passport.trust_tier = new_tier;
    passport.updated_at = timestamp;

    emit!(TrustTierUpdated {
        agent: passport.agent,
        old_score,
        new_score,
        old_tier,
        new_tier: new_tier as u8,
        timestamp,
    });

    Ok(())
}
