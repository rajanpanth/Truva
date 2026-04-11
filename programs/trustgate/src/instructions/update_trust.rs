use anchor_lang::prelude::*;
use crate::errors::TrustGateError;
use crate::state::passport::{AgentPassport, TrustTier, TrustUpdated};

#[derive(Accounts)]
pub struct UpdateTrust<'info> {
    #[account(
        mut,
        seeds = [b"passport", passport.agent_pubkey.as_ref()],
        bump = passport.bump,
        has_one = authority @ TrustGateError::UnauthorizedAgent,
    )]
    pub passport: Account<'info, AgentPassport>,

    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateTrust>,
    new_score: u8,
) -> Result<()> {
    require!(new_score <= 100, TrustGateError::InvalidTrustScore);

    let passport = &mut ctx.accounts.passport;

    require!(!passport.is_frozen, TrustGateError::PassportFrozen);

    let old_score = passport.trust_score;
    let old_tier = passport.trust_tier as u8;
    let new_tier = TrustTier::from_score(new_score);
    let timestamp = Clock::get()?.unix_timestamp;

    passport.trust_score = new_score;
    passport.trust_tier = new_tier;
    passport.last_updated = timestamp;

    emit!(TrustUpdated {
        agent: passport.agent_pubkey,
        old_score,
        new_score,
        old_tier,
        new_tier: new_tier as u8,
        timestamp,
    });

    Ok(())
}
