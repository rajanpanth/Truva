use anchor_lang::prelude::*;
use crate::errors::TrustGateError;
use crate::state::passport::{AgentPassport, PassportFrozen, PassportUnfrozen};

#[derive(Accounts)]
pub struct FreezePassport<'info> {
    #[account(
        mut,
        seeds = [b"passport", passport.agent_pubkey.as_ref()],
        bump = passport.bump,
        has_one = authority @ TrustGateError::UnauthorizedAgent,
    )]
    pub passport: Account<'info, AgentPassport>,

    pub authority: Signer<'info>,
}

pub fn freeze_handler(ctx: Context<FreezePassport>) -> Result<()> {
    let passport = &mut ctx.accounts.passport;
    let timestamp = Clock::get()?.unix_timestamp;

    passport.is_frozen = true;
    passport.last_updated = timestamp;

    emit!(PassportFrozen {
        agent: passport.agent_pubkey,
        authority: ctx.accounts.authority.key(),
        timestamp,
    });

    Ok(())
}

pub fn unfreeze_handler(ctx: Context<FreezePassport>) -> Result<()> {
    let passport = &mut ctx.accounts.passport;
    let timestamp = Clock::get()?.unix_timestamp;

    passport.is_frozen = false;
    passport.last_updated = timestamp;

    emit!(PassportUnfrozen {
        agent: passport.agent_pubkey,
        authority: ctx.accounts.authority.key(),
        timestamp,
    });

    Ok(())
}
