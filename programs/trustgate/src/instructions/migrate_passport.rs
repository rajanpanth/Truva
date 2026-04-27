use anchor_lang::prelude::*;
use crate::errors::TruvaError;
use crate::state::passport::{AgentPassport, TrustTier};

/// Migrate an existing passport to the new account layout.
/// Sets default values for newly added fields:
///   - success_count = tx_count (assume all past txs succeeded)
///   - created_at = updated_at (best guess)
/// Authority-gated: only the passport authority can migrate.
#[derive(Accounts)]
pub struct MigratePassport<'info> {
    #[account(
        mut,
        seeds = [b"passport", passport.agent.as_ref()],
        bump = passport.bump,
        has_one = authority @ TruvaError::Unauthorized,
        realloc = AgentPassport::LEN,
        realloc::payer = authority,
        realloc::zero = false,
    )]
    pub passport: Account<'info, AgentPassport>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<MigratePassport>) -> Result<()> {
    let passport = &mut ctx.accounts.passport;
    let timestamp = Clock::get()?.unix_timestamp;

    // Only migrate if created_at is 0 (meaning it hasn't been migrated yet)
    if passport.created_at == 0 {
        passport.success_count = passport.tx_count; // assume past txs succeeded
        passport.created_at = passport.updated_at; // best guess
        passport.updated_at = timestamp;

        msg!("Passport migrated for agent: {}", passport.agent);
    } else {
        msg!("Passport already migrated for agent: {}", passport.agent);
    }

    Ok(())
}
