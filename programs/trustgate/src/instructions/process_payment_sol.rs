use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::errors::TruvaError;
use crate::state::config::ProtocolConfig;
use crate::state::merchant::MerchantPolicy;
use crate::state::passport::{AgentPassport, TrustTier, PaymentProcessed};

#[derive(Accounts)]
pub struct ProcessPaymentSol<'info> {
    #[account(
        seeds = [ProtocolConfig::SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

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

    /// Minimum tier set by the recipient. Empty if the recipient never set one.
    /// CHECK: Address is verified by seeds; contents are read in the handler
    #[account(
        seeds = [MerchantPolicy::SEED, recipient.key().as_ref()],
        bump,
    )]
    pub merchant_policy: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<ProcessPaymentSol>,
    required_tier: TrustTier,
    amount: u64,
) -> Result<()> {
    // Trust tier gate: the recipient's policy applies even if the caller asks for less
    let required_tier = required_tier
        .max(MerchantPolicy::required_tier(&ctx.accounts.merchant_policy)?);

    let passport = &mut ctx.accounts.passport;
    passport.assert_trusted(&ctx.accounts.config, required_tier)?;

    // Enforce tier-based amount limits (in lamports)
    // Bronze: 5 SOL, Silver: 100 SOL, Gold: unlimited
    let max_amount: u64 = match passport.trust_tier {
        TrustTier::Bronze => 5_000_000_000,       // 5 SOL
        TrustTier::Silver => 100_000_000_000,      // 100 SOL
        TrustTier::Gold => u64::MAX,               // unlimited
    };

    require!(
        amount <= max_amount,
        TruvaError::ExceedsTierLimit
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

    // Update transaction counts
    let timestamp = Clock::get()?.unix_timestamp;
    passport.record_payment(timestamp)?;

    emit!(PaymentProcessed {
        agent: ctx.accounts.agent.key(),
        recipient: ctx.accounts.recipient.key(),
        amount,
        trust_tier: passport.trust_tier as u8,
        tx_count: passport.tx_count,
        timestamp,
    });

    Ok(())
}
