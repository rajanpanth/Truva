use anchor_lang::prelude::*;
use crate::errors::TruvaError;
use crate::state::committee::{
    CommitteeUpdated, ScoreProposal, ScoreVoteCast, ScorerCommittee, MAX_COMMITTEE,
};
use crate::state::config::ProtocolConfig;
use crate::state::passport::{AgentPassport, PassportFrozen, PassportUnfrozen, TrustTier};
use crate::state::score::{ScoreAttested, ScoreRecord};

// ── set_committee ──

/// Create or replace the scorer committee. Signed by the protocol admin.
/// The committee only starts scoring once the admin also points
/// `config.scorer` at the committee PDA with `update_config`.
#[derive(Accounts)]
pub struct SetCommittee<'info> {
    #[account(
        seeds = [ProtocolConfig::SEED],
        bump = config.bump,
        has_one = admin @ TruvaError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        init_if_needed,
        payer = admin,
        space = ScorerCommittee::LEN,
        seeds = [ScorerCommittee::SEED],
        bump
    )]
    pub committee: Account<'info, ScorerCommittee>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn set_handler(ctx: Context<SetCommittee>, members: Vec<Pubkey>, threshold: u8) -> Result<()> {
    let count = members.len();
    require!(count >= 1 && count <= MAX_COMMITTEE, TruvaError::InvalidCommittee);
    require!(
        threshold >= 1 && threshold as usize <= count,
        TruvaError::InvalidCommittee
    );
    for (i, member) in members.iter().enumerate() {
        require!(!members[..i].contains(member), TruvaError::InvalidCommittee);
    }

    let committee = &mut ctx.accounts.committee;
    committee.members = [Pubkey::default(); MAX_COMMITTEE];
    committee.members[..count].copy_from_slice(&members);
    committee.member_count = count as u8;
    committee.threshold = threshold;
    // Votes cast under the previous membership no longer count
    committee.epoch = committee.epoch.wrapping_add(1);
    committee.bump = ctx.bumps.committee;

    emit!(CommitteeUpdated {
        member_count: committee.member_count,
        threshold,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// ── committee_vote ──

/// A committee member votes on an agent's score. When `threshold` members
/// have voted on the same inputs, the median score is written to the passport.
#[derive(Accounts)]
pub struct CommitteeVote<'info> {
    #[account(
        seeds = [ProtocolConfig::SEED],
        bump = config.bump,
    )]
    pub config: Box<Account<'info, ProtocolConfig>>,

    #[account(
        seeds = [ScorerCommittee::SEED],
        bump = committee.bump,
    )]
    pub committee: Box<Account<'info, ScorerCommittee>>,

    #[account(
        mut,
        seeds = [b"passport", passport.agent.as_ref()],
        bump = passport.bump,
    )]
    pub passport: Box<Account<'info, AgentPassport>>,

    #[account(
        init_if_needed,
        payer = member,
        space = ScoreProposal::LEN,
        seeds = [ScoreProposal::SEED, passport.agent.as_ref()],
        bump
    )]
    pub proposal: Box<Account<'info, ScoreProposal>>,

    #[account(
        init_if_needed,
        payer = member,
        space = ScoreRecord::LEN,
        seeds = [ScoreRecord::SEED, passport.agent.as_ref()],
        bump
    )]
    pub score_record: Box<Account<'info, ScoreRecord>>,

    #[account(mut)]
    pub member: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn vote_handler(
    ctx: Context<CommitteeVote>,
    score: u8,
    inputs_hash: [u8; 32],
    model_version: u16,
    registry_asset: Pubkey,
) -> Result<()> {
    let committee = &ctx.accounts.committee;
    let committee_key = committee.key();
    require_keys_eq!(
        ctx.accounts.config.scorer,
        committee_key,
        TruvaError::CommitteeNotActive
    );
    let index = committee.index_of(&ctx.accounts.member.key())?;
    require!(score <= 100, TruvaError::InvalidTrustScore);
    require!(!ctx.accounts.passport.frozen, TruvaError::PassportFrozen);

    let timestamp = Clock::get()?.unix_timestamp;
    let agent = ctx.accounts.passport.agent;

    let proposal = &mut ctx.accounts.proposal;
    proposal.agent = agent;
    proposal.bump = ctx.bumps.proposal;
    if proposal.epoch != committee.epoch {
        proposal.epoch = committee.epoch;
        proposal.voted = 0;
    }

    if proposal.voted == 0 {
        // First vote of the round fixes what is being voted on
        proposal.inputs_hash = inputs_hash;
        proposal.model_version = model_version;
        proposal.registry_asset = registry_asset;
    } else {
        require!(
            proposal.inputs_hash == inputs_hash
                && proposal.model_version == model_version
                && proposal.registry_asset == registry_asset,
            TruvaError::ProvenanceMismatch
        );
    }

    let bit = 1u8 << index;
    require!(proposal.voted & bit == 0, TruvaError::AlreadyVoted);
    proposal.voted |= bit;
    proposal.scores[index] = score;

    let votes = proposal.vote_count();
    emit!(ScoreVoteCast {
        agent,
        member: ctx.accounts.member.key(),
        round: proposal.round,
        score,
        votes,
        threshold: committee.threshold,
        timestamp,
    });

    // The record account exists from the first vote on; it only carries a
    // score once the threshold is reached.
    let record = &mut ctx.accounts.score_record;
    record.agent = agent;
    record.bump = ctx.bumps.score_record;

    if votes >= committee.threshold {
        let final_score = proposal.median();
        let tier = TrustTier::from_score(final_score);

        let passport = &mut ctx.accounts.passport;
        passport.trust_score = final_score;
        passport.trust_tier = tier;
        // Brings passports created under an earlier scorer under the committee
        passport.authority = committee_key;
        passport.updated_at = timestamp;

        record.registry_asset = registry_asset;
        record.inputs_hash = inputs_hash;
        record.model_version = model_version;
        record.score = final_score;
        record.votes = votes;
        record.scorer = committee_key;
        record.scored_at = timestamp;

        proposal.voted = 0;
        proposal.round = proposal.round.wrapping_add(1);

        emit!(ScoreAttested {
            agent,
            scorer: committee_key,
            score: final_score,
            trust_tier: tier as u8,
            votes,
            model_version,
            inputs_hash,
            registry_asset,
            timestamp,
        });
    }

    Ok(())
}

// ── committee_set_frozen ──

/// Kill switch under a committee: any single member can freeze a passport
/// immediately; only the protocol admin can lift the freeze.
#[derive(Accounts)]
pub struct CommitteeSetFrozen<'info> {
    #[account(
        seeds = [ProtocolConfig::SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        seeds = [ScorerCommittee::SEED],
        bump = committee.bump,
    )]
    pub committee: Account<'info, ScorerCommittee>,

    #[account(
        mut,
        seeds = [b"passport", passport.agent.as_ref()],
        bump = passport.bump,
    )]
    pub passport: Account<'info, AgentPassport>,

    pub signer: Signer<'info>,
}

pub fn set_frozen_handler(ctx: Context<CommitteeSetFrozen>, frozen: bool) -> Result<()> {
    let committee_key = ctx.accounts.committee.key();
    require_keys_eq!(
        ctx.accounts.config.scorer,
        committee_key,
        TruvaError::CommitteeNotActive
    );
    require_keys_eq!(
        ctx.accounts.passport.authority,
        committee_key,
        TruvaError::UntrustedAuthority
    );

    let signer = ctx.accounts.signer.key();
    if frozen {
        ctx.accounts.committee.index_of(&signer)?;
    } else {
        require_keys_eq!(signer, ctx.accounts.config.admin, TruvaError::Unauthorized);
    }

    let timestamp = Clock::get()?.unix_timestamp;
    let passport = &mut ctx.accounts.passport;
    passport.frozen = frozen;
    passport.updated_at = timestamp;

    if frozen {
        emit!(PassportFrozen { agent: passport.agent, authority: signer, timestamp });
    } else {
        emit!(PassportUnfrozen { agent: passport.agent, authority: signer, timestamp });
    }

    Ok(())
}
