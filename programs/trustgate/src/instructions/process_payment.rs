use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::errors::TrustGateError;
use crate::state::passport::{AgentPassport, TrustTier, PaymentProcessed};

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(
        mut,
        seeds = [b"passport", agent.key().as_ref()],
        bump = passport.bump,
    )]
    pub passport: Account<'info, AgentPassport>,

    /// The agent initiating the payment
    #[account(mut)]
    pub agent: Signer<'info>,

    /// The recipient of the payment
    /// CHECK: Recipient can be any account
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<ProcessPayment>,
    required_tier: TrustTier,
    amount: u64,
) -> Result<()> {
    let passport = &mut ctx.accounts.passport;

    // Block frozen passports
    require!(!passport.is_frozen, TrustGateError::PassportFrozen);

    // Trust tier gate: check if agent's tier meets the requirement
    require!(
        passport.trust_tier >= required_tier,
        TrustGateError::InsufficientTrust
    );

    // Enforce tier-based amount limits (in lamports)
    // Bronze: 5 SOL, Silver: 100 SOL, Gold: 1000 SOL
    let max_amount: u64 = match passport.trust_tier {
        TrustTier::Bronze => 5_000_000_000,      // 5 SOL
        TrustTier::Silver => 100_000_000_000,     // 100 SOL
        TrustTier::Gold => 1_000_000_000_000,     // 1000 SOL
    };

    require!(
        amount <= max_amount,
        TrustGateError::AmountExceedsTierLimit
    );

    // Execute SOL transfer
    let transfer_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.agent.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
        },
    );
    system_program::transfer(transfer_ctx, amount)?;

    // Increment transaction count
    let timestamp = Clock::get()?.unix_timestamp;
    passport.transaction_count = passport.transaction_count.saturating_add(1);
    passport.last_updated = timestamp;

    emit!(PaymentProcessed {
        agent: ctx.accounts.agent.key(),
        recipient: ctx.accounts.recipient.key(),
        amount,
        trust_tier: passport.trust_tier as u8,
        transaction_count: passport.transaction_count,
        timestamp,
    });

    Ok(())
}
