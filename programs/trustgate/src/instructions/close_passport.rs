use anchor_lang::prelude::*;
use crate::errors::TruvaError;
use crate::state::passport::{AgentPassport, PassportClosed};

#[derive(Accounts)]
pub struct ClosePassport<'info> {
    #[account(
        mut,
        close = authority,
        seeds = [b"passport", passport.agent.as_ref()],
        bump = passport.bump,
        has_one = authority @ TruvaError::Unauthorized,
    )]
    pub passport: Account<'info, AgentPassport>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<ClosePassport>) -> Result<()> {
    let passport = &ctx.accounts.passport;
    let timestamp = Clock::get()?.unix_timestamp;

    emit!(PassportClosed {
        agent: passport.agent,
        authority: ctx.accounts.authority.key(),
        timestamp,
    });

    Ok(())
}
