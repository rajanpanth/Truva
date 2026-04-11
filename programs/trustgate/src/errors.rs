use anchor_lang::prelude::*;

#[error_code]
pub enum TrustGateError {
    #[msg("Agent is not authorized to perform this action")]
    UnauthorizedAgent,

    #[msg("Agent's trust tier is insufficient for this operation")]
    InsufficientTrust,

    #[msg("Trust score must be between 0 and 100")]
    InvalidTrustScore,

    #[msg("Insufficient funds for this payment")]
    InsufficientFunds,

    #[msg("Payment amount exceeds the maximum allowed for this trust tier")]
    AmountExceedsTierLimit,

    #[msg("Passport is frozen and cannot be modified")]
    PassportFrozen,

    #[msg("Only the passport authority can close this passport")]
    UnauthorizedClose,
}
