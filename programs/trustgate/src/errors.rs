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

    #[msg("Signer is not a member of the scorer committee")]
    NotCommitteeMember,

    #[msg("Committee needs 1 to 5 distinct members and a threshold between 1 and the member count")]
    InvalidCommittee,

    #[msg("This member already voted in the current round")]
    AlreadyVoted,

    #[msg("Vote does not match the inputs hash, model version or registry link of this round")]
    ProvenanceMismatch,

    #[msg("The scorer committee is not the protocol scorer")]
    CommitteeNotActive,
}
