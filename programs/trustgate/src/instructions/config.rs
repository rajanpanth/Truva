use anchor_lang::prelude::*;
use crate::errors::TruvaError;
use crate::program::Trustgate;
use crate::state::config::{ConfigUpdated, ProtocolConfig};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = ProtocolConfig::LEN,
        seeds = [ProtocolConfig::SEED],
        bump
    )]
    pub config: Account<'info, ProtocolConfig>,

    /// Must be the program's upgrade authority, so the config cannot be front-run
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        constraint = program.programdata_address()? == Some(program_data.key()) @ TruvaError::InvalidProgramData,
    )]
    pub program: Program<'info, Trustgate>,

    #[account(
        constraint = program_data.upgrade_authority_address == Some(admin.key()) @ TruvaError::InvalidProgramData,
    )]
    pub program_data: Account<'info, ProgramData>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_handler(ctx: Context<InitializeConfig>, scorer: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.scorer = scorer;
    config.bump = ctx.bumps.config;

    emit!(ConfigUpdated {
        admin: config.admin,
        scorer: config.scorer,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [ProtocolConfig::SEED],
        bump = config.bump,
        has_one = admin @ TruvaError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,

    pub admin: Signer<'info>,
}

pub fn update_handler(
    ctx: Context<UpdateConfig>,
    new_admin: Option<Pubkey>,
    new_scorer: Option<Pubkey>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    if let Some(admin) = new_admin {
        config.admin = admin;
    }
    if let Some(scorer) = new_scorer {
        config.scorer = scorer;
    }

    emit!(ConfigUpdated {
        admin: config.admin,
        scorer: config.scorer,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
