use anchor_lang::prelude::*;
use crate::state::config::ProtocolConfig;
use crate::state::passport::{AgentPassport, TrustTier, PassportInitialized};

#[derive(Accounts)]
pub struct InitializePassport<'info> {
    #[account(
        seeds = [ProtocolConfig::SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = payer,
        space = AgentPassport::LEN,
        seeds = [b"passport", agent.key().as_ref()],
        bump
    )]
    pub passport: Account<'info, AgentPassport>,

    /// The agent wallet this passport represents
    /// CHECK: This is the agent's public key, used only as a seed
    pub agent: UncheckedAccount<'info>,

    /// Anyone can create a passport (pays for account creation).
    /// The passport authority is always the protocol scorer, never the payer.
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializePassport>) -> Result<()> {
    let timestamp = Clock::get()?.unix_timestamp;

    let passport = &mut ctx.accounts.passport;
    passport.agent = ctx.accounts.agent.key();
    passport.authority = ctx.accounts.config.scorer;
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
        authority: ctx.accounts.config.scorer,
        trust_score: 0,
        trust_tier: TrustTier::Bronze as u8,
        timestamp,
    });

    Ok(())
}
