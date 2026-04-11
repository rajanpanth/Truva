use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::TrustGateError;
use crate::state::passport::{AgentPassport, TrustTier, PaymentProcessed};

#[derive(Accounts)]
pub struct ProcessSplPayment<'info> {
    #[account(
        mut,
        seeds = [b"passport", agent.key().as_ref()],
        bump = passport.bump,
    )]
    pub passport: Account<'info, AgentPassport>,

    /// The agent initiating the payment
    #[account(mut)]
    pub agent: Signer<'info>,

    /// Agent's token account (source)
    #[account(
        mut,
        constraint = agent_token.owner == agent.key() @ TrustGateError::InsufficientTrust,
    )]
    pub agent_token: Account<'info, TokenAccount>,

    /// Recipient's token account (destination)
    #[account(mut)]
    pub recipient_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<ProcessSplPayment>,
    required_tier: TrustTier,
    amount: u64,
) -> Result<()> {
    let passport = &mut ctx.accounts.passport;

    // Block frozen passports
    require!(!passport.is_frozen, TrustGateError::PassportFrozen);

    // Trust tier gate
    require!(
        passport.trust_tier >= required_tier,
        TrustGateError::InsufficientTrust
    );

    // Enforce tier-based amount limits (token base units)
    let max_amount: u64 = match passport.trust_tier {
        TrustTier::Bronze => 5_000_000_000,
        TrustTier::Silver => 100_000_000_000,
        TrustTier::Gold => 1_000_000_000_000,
    };

    require!(
        amount <= max_amount,
        TrustGateError::AmountExceedsTierLimit
    );

    // Execute SPL token transfer
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.agent_token.to_account_info(),
            to: ctx.accounts.recipient_token.to_account_info(),
            authority: ctx.accounts.agent.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    // Increment transaction count
    let timestamp = Clock::get()?.unix_timestamp;
    passport.transaction_count = passport.transaction_count.saturating_add(1);
    passport.last_updated = timestamp;

    emit!(PaymentProcessed {
        agent: ctx.accounts.agent.key(),
        recipient: ctx.accounts.recipient_token.key(),
        amount,
        trust_tier: passport.trust_tier as u8,
        transaction_count: passport.transaction_count,
        timestamp,
    });

    Ok(())
}
