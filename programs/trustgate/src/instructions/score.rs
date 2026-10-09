use anchor_lang::prelude::*;
use crate::errors::TruvaError;
use crate::state::passport::{AgentPassport, TrustTier};
use crate::state::score::{ScoreAttested, ScoreRecord};

/// Write a score together with its provenance. Signed by the passport
/// authority (the protocol scorer). The tier is derived from the score.
#[derive(Accounts)]
pub struct AttestScore<'info> {
    #[account(
        mut,
        seeds = [b"passport", passport.agent.as_ref()],
        bump = passport.bump,
        has_one = authority @ TruvaError::Unauthorized,
    )]
    pub passport: Account<'info, AgentPassport>,

    #[account(
        init_if_needed,
        payer = authority,
        space = ScoreRecord::LEN,
        seeds = [ScoreRecord::SEED, passport.agent.as_ref()],
        bump
    )]
    pub score_record: Account<'info, ScoreRecord>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn attest_handler(
    ctx: Context<AttestScore>,
    score: u8,
    inputs_hash: [u8; 32],
    model_version: u16,
    registry_asset: Pubkey,
) -> Result<()> {
    require!(score <= 100, TruvaError::InvalidTrustScore);
    require!(!ctx.accounts.passport.frozen, TruvaError::PassportFrozen);

    let timestamp = Clock::get()?.unix_timestamp;
    let tier = TrustTier::from_score(score);

    let passport = &mut ctx.accounts.passport;
    passport.trust_score = score;
    passport.trust_tier = tier;
    passport.updated_at = timestamp;

    let record = &mut ctx.accounts.score_record;
    record.agent = passport.agent;
    record.registry_asset = registry_asset;
    record.inputs_hash = inputs_hash;
    record.model_version = model_version;
    record.score = score;
    record.votes = 1;
    record.scorer = ctx.accounts.authority.key();
    record.scored_at = timestamp;
    record.bump = ctx.bumps.score_record;

    emit!(ScoreAttested {
        agent: passport.agent,
        scorer: record.scorer,
        score,
        trust_tier: tier as u8,
        votes: 1,
        model_version,
        inputs_hash,
        registry_asset,
        timestamp,
    });

    Ok(())
}
