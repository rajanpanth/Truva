use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, TransferChecked};
use crate::errors::TruvaError;
use crate::state::config::ProtocolConfig;
use crate::state::merchant::MerchantPolicy;
use crate::state::passport::AgentPassport;
use crate::state::vault::{
    AgentVault, VaultCreated, VaultPayment, VaultPolicyUpdated, VaultWithdrawal,
};

// ── create_vault ──

#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(
        init,
        payer = owner,
        space = AgentVault::LEN,
        seeds = [AgentVault::SEED, owner.key().as_ref(), agent.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub vault: Box<Account<'info, AgentVault>>,

    /// Token account holding the vault's funds, owned by the vault PDA.
    /// Fund it with a normal token transfer.
    #[account(
        init,
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token: Box<Account<'info, TokenAccount>>,

    /// The agent key allowed to spend from this vault
    /// CHECK: Used only as a seed and stored on the vault
    pub agent: UncheckedAccount<'info>,

    pub mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn create_handler(
    ctx: Context<CreateVault>,
    per_tx_limit: u64,
    daily_limit: u64,
    allowlist: Vec<Pubkey>,
) -> Result<()> {
    let timestamp = Clock::get()?.unix_timestamp;
    let vault_key = ctx.accounts.vault.key();

    let vault = &mut ctx.accounts.vault;
    vault.owner = ctx.accounts.owner.key();
    vault.agent = ctx.accounts.agent.key();
    vault.mint = ctx.accounts.mint.key();
    vault.spent_in_window = 0;
    vault.window_start = timestamp;
    vault.total_spent = 0;
    vault.paused = false;
    vault.bump = ctx.bumps.vault;
    vault.set_policy(per_tx_limit, daily_limit, &allowlist)?;

    emit!(VaultCreated {
        vault: vault_key,
        owner: vault.owner,
        agent: vault.agent,
        mint: vault.mint,
        per_tx_limit,
        daily_limit,
        timestamp,
    });

    Ok(())
}

// ── update_vault_policy / set_vault_paused ──

#[derive(Accounts)]
pub struct UpdateVault<'info> {
    #[account(
        mut,
        seeds = [AgentVault::SEED, vault.owner.as_ref(), vault.agent.as_ref(), vault.mint.as_ref()],
        bump = vault.bump,
        has_one = owner @ TruvaError::Unauthorized,
    )]
    pub vault: Box<Account<'info, AgentVault>>,

    pub owner: Signer<'info>,
}

pub fn update_policy_handler(
    ctx: Context<UpdateVault>,
    per_tx_limit: u64,
    daily_limit: u64,
    allowlist: Vec<Pubkey>,
) -> Result<()> {
    let vault_key = ctx.accounts.vault.key();
    let vault = &mut ctx.accounts.vault;
    vault.set_policy(per_tx_limit, daily_limit, &allowlist)?;

    emit!(VaultPolicyUpdated {
        vault: vault_key,
        per_tx_limit: vault.per_tx_limit,
        daily_limit: vault.daily_limit,
        allowlist_len: vault.allowlist_len,
        paused: vault.paused,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

pub fn set_paused_handler(ctx: Context<UpdateVault>, paused: bool) -> Result<()> {
    let vault_key = ctx.accounts.vault.key();
    let vault = &mut ctx.accounts.vault;
    vault.paused = paused;

    emit!(VaultPolicyUpdated {
        vault: vault_key,
        per_tx_limit: vault.per_tx_limit,
        daily_limit: vault.daily_limit,
        allowlist_len: vault.allowlist_len,
        paused,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// ── vault_pay ──

#[derive(Accounts)]
pub struct VaultPay<'info> {
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
    pub passport: Box<Account<'info, AgentPassport>>,

    #[account(
        mut,
        seeds = [AgentVault::SEED, vault.owner.as_ref(), agent.key().as_ref(), mint.key().as_ref()],
        bump = vault.bump,
        has_one = agent @ TruvaError::Unauthorized,
        has_one = mint @ TruvaError::MintMismatch,
    )]
    pub vault: Box<Account<'info, AgentVault>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token: Box<Account<'info, TokenAccount>>,

    /// Recipient's token account (destination)
    #[account(
        mut,
        constraint = recipient_token.mint == mint.key() @ TruvaError::MintMismatch,
    )]
    pub recipient_token: Box<Account<'info, TokenAccount>>,

    /// Minimum tier set by the recipient. Empty if the recipient never set one.
    /// CHECK: Address is verified by seeds; contents are read in the handler
    #[account(
        seeds = [MerchantPolicy::SEED, recipient_token.owner.as_ref()],
        bump,
    )]
    pub merchant_policy: UncheckedAccount<'info>,

    pub mint: Box<Account<'info, Mint>>,

    /// The agent initiating the payment
    pub agent: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn pay_handler(ctx: Context<VaultPay>, amount: u64) -> Result<()> {
    let timestamp = Clock::get()?.unix_timestamp;
    let recipient = ctx.accounts.recipient_token.owner;

    // Owner kill switch
    require!(!ctx.accounts.vault.paused, TruvaError::VaultPaused);

    // Trust gate: tier is set by the recipient, not by the paying agent
    let required_tier = MerchantPolicy::required_tier(&ctx.accounts.merchant_policy)?;
    ctx.accounts
        .passport
        .assert_trusted(&ctx.accounts.config, required_tier)?;

    // Owner's spending limits
    require!(
        ctx.accounts.vault.is_allowed(&recipient),
        TruvaError::RecipientNotAllowed
    );
    ctx.accounts.vault.record_spend(amount, timestamp)?;

    // Execute SPL token transfer, signed by the vault PDA
    let vault = &ctx.accounts.vault;
    let signer_seeds: &[&[&[u8]]] = &[&[
        AgentVault::SEED,
        vault.owner.as_ref(),
        vault.agent.as_ref(),
        vault.mint.as_ref(),
        &[vault.bump],
    ]];
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.vault_token.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient_token.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer_checked(transfer_ctx, amount, ctx.accounts.mint.decimals)?;

    ctx.accounts.passport.record_payment(timestamp)?;

    emit!(VaultPayment {
        vault: ctx.accounts.vault.key(),
        agent: ctx.accounts.agent.key(),
        recipient,
        mint: ctx.accounts.mint.key(),
        amount,
        spent_in_window: ctx.accounts.vault.spent_in_window,
        trust_tier: ctx.accounts.passport.trust_tier as u8,
        timestamp,
    });

    Ok(())
}

// ── vault_withdraw ──

#[derive(Accounts)]
pub struct VaultWithdraw<'info> {
    #[account(
        seeds = [AgentVault::SEED, owner.key().as_ref(), vault.agent.as_ref(), mint.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ TruvaError::Unauthorized,
        has_one = mint @ TruvaError::MintMismatch,
    )]
    pub vault: Box<Account<'info, AgentVault>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token: Box<Account<'info, TokenAccount>>,

    /// Owner's token account (destination)
    #[account(
        mut,
        constraint = owner_token.owner == owner.key() @ TruvaError::Unauthorized,
        constraint = owner_token.mint == mint.key() @ TruvaError::MintMismatch,
    )]
    pub owner_token: Box<Account<'info, TokenAccount>>,

    pub mint: Box<Account<'info, Mint>>,

    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn withdraw_handler(ctx: Context<VaultWithdraw>, amount: u64) -> Result<()> {
    require!(amount > 0, TruvaError::InvalidAmount);

    let vault = &ctx.accounts.vault;
    let signer_seeds: &[&[&[u8]]] = &[&[
        AgentVault::SEED,
        vault.owner.as_ref(),
        vault.agent.as_ref(),
        vault.mint.as_ref(),
        &[vault.bump],
    ]];
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.vault_token.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.owner_token.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer_checked(transfer_ctx, amount, ctx.accounts.mint.decimals)?;

    emit!(VaultWithdrawal {
        vault: ctx.accounts.vault.key(),
        owner: ctx.accounts.owner.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// ── close_vault ──

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(
        mut,
        close = owner,
        seeds = [AgentVault::SEED, owner.key().as_ref(), vault.agent.as_ref(), mint.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ TruvaError::Unauthorized,
        has_one = mint @ TruvaError::MintMismatch,
    )]
    pub vault: Box<Account<'info, AgentVault>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token: Box<Account<'info, TokenAccount>>,

    /// Owner's token account, receives any remaining balance
    #[account(
        mut,
        constraint = owner_token.owner == owner.key() @ TruvaError::Unauthorized,
        constraint = owner_token.mint == mint.key() @ TruvaError::MintMismatch,
    )]
    pub owner_token: Box<Account<'info, TokenAccount>>,

    pub mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn close_handler(ctx: Context<CloseVault>) -> Result<()> {
    let vault = &ctx.accounts.vault;
    let signer_seeds: &[&[&[u8]]] = &[&[
        AgentVault::SEED,
        vault.owner.as_ref(),
        vault.agent.as_ref(),
        vault.mint.as_ref(),
        &[vault.bump],
    ]];

    // Return any remaining balance to the owner
    let remaining = ctx.accounts.vault_token.amount;
    if remaining > 0 {
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.vault_token.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.owner_token.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer_checked(transfer_ctx, remaining, ctx.accounts.mint.decimals)?;
    }

    // Close the token account and reclaim its rent
    let close_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.vault_token.to_account_info(),
            destination: ctx.accounts.owner.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        },
        signer_seeds,
    );
    token::close_account(close_ctx)?;

    Ok(())
}
