use anchor_lang::prelude::*;

#[error_code]
pub enum TruvaError {
    #[msg("Agent passport is frozen")]
    PassportFrozen,

    #[msg("Insufficient trust tier for this operation")]
    InsufficientTrustTier,

    #[msg("Payment amount exceeds tier limit")]
    ExceedsTierLimit,

    #[msg("Unauthorized: caller is not the authority")]
    Unauthorized,

    #[msg("Invalid trust score: must be between 0 and 100")]
    InvalidTrustScore,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Passport authority is not the protocol scorer")]
    UntrustedAuthority,

    #[msg("Signer is not the program upgrade authority")]
    InvalidProgramData,

    #[msg("Vault is paused by its owner")]
    VaultPaused,

    #[msg("Payment amount exceeds the vault per-payment limit")]
    ExceedsPerTxLimit,

    #[msg("Payment would exceed the vault daily limit")]
    ExceedsDailyLimit,

    #[msg("Recipient is not on the vault allowlist")]
    RecipientNotAllowed,

    #[msg("Allowlist holds at most 8 recipients")]
    AllowlistTooLong,

    #[msg("Per-payment limit cannot exceed the daily limit")]
    InvalidLimits,

    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Token account mint does not match")]
    MintMismatch,
}
