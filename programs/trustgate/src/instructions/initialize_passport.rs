use anchor_lang::prelude::*;
use crate::errors::TruvaError;
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

pub fn handler(ctx: Context<InitializePassport>) -> Result<()> {
    let timestamp = Clock::get()?.unix_timestamp;

    let passport = &mut ctx.accounts.passport;
    passport.agent = ctx.accounts.agent.key();
    passport.authority = ctx.accounts.authority.key();
    passport.trust_score = 0;
    passport.trust_tier = TrustTier::Bronze;
    passport.tx_count = 0;
    passport.success_count = 0;
    passport.frozen = false;
    passport.created_at = timestamp;
    passport.updated_at = timestamp;
    passport.bump = ctx.bumps.passport;

    emit!(PassportInitialized {
        agent: ctx.accounts.agent.key(),
        authority: ctx.accounts.authority.key(),
        trust_score: 0,
        trust_tier: TrustTier::Bronze as u8,
        timestamp,
    });

    Ok(())
}
