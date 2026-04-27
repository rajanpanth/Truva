use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::TruvaError;
use crate::state::passport::{AgentPassport, TrustTier, PaymentProcessed};

#[derive(Accounts)]
pub struct ProcessPaymentSpl<'info> {
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
        constraint = agent_token.owner == agent.key() @ TruvaError::Unauthorized,
    )]
    pub agent_token: Account<'info, TokenAccount>,

    /// Recipient's token account (destination)
    #[account(mut)]
    pub recipient_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<ProcessPaymentSpl>,
    required_tier: TrustTier,
    amount: u64,
) -> Result<()> {
    let passport = &mut ctx.accounts.passport;

    // Block frozen passports
    require!(!passport.frozen, TruvaError::PassportFrozen);

    // Trust tier gate
    require!(
        passport.trust_tier >= required_tier,
        TruvaError::InsufficientTrustTier
    );

    // Enforce tier-based amount limits (token base units)
    let max_amount: u64 = match passport.trust_tier {
        TrustTier::Bronze => 5_000_000_000,
        TrustTier::Silver => 100_000_000_000,
        TrustTier::Gold => u64::MAX,
        TrustTier::Platinum => u64::MAX,
    };

    require!(
        amount <= max_amount,
        TruvaError::ExceedsTierLimit
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

    // Update transaction counts
    let timestamp = Clock::get()?.unix_timestamp;
    passport.tx_count = passport.tx_count.checked_add(1).ok_or(TruvaError::ArithmeticOverflow)?;
    passport.success_count = passport.success_count.checked_add(1).ok_or(TruvaError::ArithmeticOverflow)?;
    passport.updated_at = timestamp;

    emit!(PaymentProcessed {
        agent: ctx.accounts.agent.key(),
        recipient: ctx.accounts.recipient_token.key(),
        amount,
        trust_tier: passport.trust_tier as u8,
        tx_count: passport.tx_count,
        timestamp,
    });

    Ok(())
}
