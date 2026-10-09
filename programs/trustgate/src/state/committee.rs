use anchor_lang::prelude::*;
use crate::errors::TruvaError;

/// Maximum number of scorers on the committee
pub const MAX_COMMITTEE: usize = 5;

/// A set of independent scorers that must agree before a score is written
/// (singleton PDA, seeds = ["committee"]).
///
/// The committee takes over scoring when the admin sets `config.scorer` to
/// this PDA's address. From then on no single key can sign as the scorer:
/// scores only change through `committee_vote`.
#[account]
pub struct ScorerCommittee {
    /// Committee members; the first `member_count` entries are used
    pub members: [Pubkey; MAX_COMMITTEE],   // 32 * 5 bytes
    /// Number of used entries in `members`
    pub member_count: u8,                   // 1 byte
    /// Votes needed to write a score
    pub threshold: u8,                      // 1 byte
    /// Increases every time the membership changes; open votes from an
    /// earlier epoch are discarded
    pub epoch: u32,                         // 4 bytes
    /// Bump seed for the PDA
    pub bump: u8,                           // 1 byte
}

impl ScorerCommittee {
    pub const SEED: &'static [u8] = b"committee";

    pub const LEN: usize = 8    // discriminator
        + 32 * MAX_COMMITTEE // members
        + 1    // member_count
        + 1    // threshold
        + 4    // epoch
        + 1;   // bump

    /// Position of `key` on the committee.
    pub fn index_of(&self, key: &Pubkey) -> Result<usize> {
        self.members[..self.member_count as usize]
            .iter()
            .position(|m| m == key)
            .ok_or_else(|| error!(TruvaError::NotCommitteeMember))
    }
}

/// Votes collected for one agent's next score
/// (PDA, seeds = ["proposal", agent]).
///
/// The first vote of a round fixes the inputs hash, model version and
/// registry link; later votes must match them, so scorers can only agree on
/// a score computed from the same published inputs.
#[account]
pub struct ScoreProposal {
    /// The agent being scored
    pub agent: Pubkey,                      // 32 bytes
    /// Increases every time a score is written
    pub round: u32,                         // 4 bytes
    /// Committee epoch the open votes were cast in
    pub epoch: u32,                         // 4 bytes
    /// SHA-256 of the canonical scoring inputs for this round
    pub inputs_hash: [u8; 32],              // 32 bytes
    /// Scoring model version for this round
    pub model_version: u16,                 // 2 bytes
    /// Solana Agent Registry entry for this round
    pub registry_asset: Pubkey,             // 32 bytes
    /// Bit i is set once committee member i has voted this round
    pub voted: u8,                          // 1 byte
    /// Score voted by each committee member
    pub scores: [u8; MAX_COMMITTEE],        // 5 bytes
    /// Bump seed for the PDA
    pub bump: u8,                           // 1 byte
}

impl ScoreProposal {
    pub const SEED: &'static [u8] = b"proposal";

    pub const LEN: usize = 8    // discriminator
        + 32   // agent
        + 4    // round
        + 4    // epoch
        + 32   // inputs_hash
        + 2    // model_version
        + 32   // registry_asset
        + 1    // voted
        + MAX_COMMITTEE // scores
        + 1;   // bump

    pub fn vote_count(&self) -> u8 {
        self.voted.count_ones() as u8
    }

    /// Median of the votes cast this round (the lower one when even).
    pub fn median(&self) -> u8 {
        let mut cast = [0u8; MAX_COMMITTEE];
        let mut n = 0;
        for i in 0..MAX_COMMITTEE {
            if self.voted & (1 << i) != 0 {
                cast[n] = self.scores[i];
                n += 1;
            }
        }
        let cast = &mut cast[..n];
        cast.sort_unstable();
        cast[(n - 1) / 2]
    }
}

// ── Events ──

#[event]
pub struct CommitteeUpdated {
    pub member_count: u8,
    pub threshold: u8,
    pub timestamp: i64,
}

#[event]
pub struct ScoreVoteCast {
    pub agent: Pubkey,
    pub member: Pubkey,
    pub round: u32,
    pub score: u8,
    pub votes: u8,
    pub threshold: u8,
    pub timestamp: i64,
}
