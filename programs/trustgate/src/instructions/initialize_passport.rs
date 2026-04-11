use anchor_lang::prelude::*;
use crate::errors::TrustGateError;
use crate::state::passport::{AgentPassport, TrustTier, PassportInitialized};

#[derive(Accounts)]
pub struct InitializePassport<'info> {
    #[account(
        init,
        payer = authority,
        space = AgentPassport::LEN,
        seeds = [b"passport", agent.key().as_ref()],
        bump
    )]
    pub passport: Account<'info, AgentPassport>,

    /// The agent wallet this passport represents
    /// CHECK: This is the agent's public key, used only as a seed
    pub agent: UncheckedAccount<'info>,

    /// The authority creating this passport (pays for account creation)
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializePassport>,
    trust_score: u8,
) -> Result<()> {
    require!(trust_score <= 100, TrustGateError::InvalidTrustScore);

    let timestamp = Clock::get()?.unix_timestamp;
    let tier = TrustTier::from_score(trust_score);

    let passport = &mut ctx.accounts.passport;
    passport.agent_pubkey = ctx.accounts.agent.key();
    passport.trust_score = trust_score;
    passport.trust_tier = tier;
    passport.transaction_count = 0;
    passport.authority = ctx.accounts.authority.key();
    passport.last_updated = timestamp;
    passport.is_frozen = false;
    passport.bump = ctx.bumps.passport;

    emit!(PassportInitialized {
        agent: ctx.accounts.agent.key(),
        authority: ctx.accounts.authority.key(),
        trust_score,
        trust_tier: tier as u8,
        timestamp,
    });

    Ok(())
}
