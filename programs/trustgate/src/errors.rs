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
}
