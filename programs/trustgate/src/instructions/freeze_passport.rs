use anchor_lang::prelude::*;
use crate::errors::TruvaError;
use crate::state::passport::{AgentPassport, PassportFrozen, PassportUnfrozen};

#[derive(Accounts)]
pub struct FreezePassport<'info> {
    #[account(
        mut,
        seeds = [b"passport", passport.agent.as_ref()],
        bump = passport.bump,
        has_one = authority @ TruvaError::Unauthorized,
    )]
    pub passport: Account<'info, AgentPassport>,

    pub authority: Signer<'info>,
}

pub fn freeze_handler(ctx: Context<FreezePassport>) -> Result<()> {
    let passport = &mut ctx.accounts.passport;
    let timestamp = Clock::get()?.unix_timestamp;

    passport.frozen = true;
    passport.updated_at = timestamp;

    emit!(PassportFrozen {
        agent: passport.agent,
        authority: ctx.accounts.authority.key(),
        timestamp,
    });

    Ok(())
}

pub fn unfreeze_handler(ctx: Context<FreezePassport>) -> Result<()> {
    let passport = &mut ctx.accounts.passport;
    let timestamp = Clock::get()?.unix_timestamp;

    passport.frozen = false;
    passport.updated_at = timestamp;

    emit!(PassportUnfrozen {
        agent: passport.agent,
        authority: ctx.accounts.authority.key(),
        timestamp,
    });

    Ok(())
}
