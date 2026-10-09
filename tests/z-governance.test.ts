import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transferChecked,
} from "@solana/spl-token";
import { expect } from "chai";
import { createHash } from "crypto";
import {
  TruvaClient,
  attestScoreIx,
  closeVaultIx,
  committeeSetFrozenIx,
  committeeVoteIx,
  createVaultIx,
  deriveAssociatedTokenAddress,
  deriveCommitteePDA,
  deriveVaultPDA,
  initializePassportIx,
  setCommitteeIx,
  vaultPayIx,
  vaultWithdrawIx,
} from "../sdk/src";

const BPF_LOADER_UPGRADEABLE = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

/**
 * Score provenance, the scorer committee, and Token-2022 vaults.
 *
 * Named to run after the other suites: trustgate.test.ts expects to create the
 * protocol config itself.
 */
describe("governance and token-2022", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  // Sends and reads share one commitment, so a read right after a send sees its effect
  const connection = new Connection(provider.connection.rpcEndpoint, "confirmed");
  const truva = new TruvaClient(connection);

  const UNIT = 1_000_000;
  const hash = (text: string) => Uint8Array.from(createHash("sha256").update(text).digest());

  let program: Program;
  let admin: Keypair;
  let scorer: Keypair;
  let configPda: PublicKey;

  async function airdrop(to: PublicKey, sol = 1) {
    const sig = await connection.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
  }

  const send = (ix: TransactionInstruction, ...signers: Keypair[]) =>
    sendAndConfirmTransaction(connection, new Transaction().add(ix), signers);

  async function expectError(promise: Promise<unknown>, name: string) {
    try {
      await promise;
    } catch (err: any) {
      const text = `${err.message ?? ""} ${(err.logs ?? []).join(" ")}`;
      expect(text).to.include(name);
      return;
    }
    expect.fail(`Should have failed with ${name}`);
  }

  async function setScorer(scorerKey: PublicKey) {
    await program.methods
      .updateConfig(null, scorerKey)
      .accounts({ config: configPda, admin: admin.publicKey })
      .rpc({ commitment: "confirmed" });
  }

  async function newAgent(): Promise<Keypair> {
    const agent = Keypair.generate();
    await airdrop(agent.publicKey);
    await send(initializePassportIx(agent.publicKey, agent.publicKey), agent);
    return agent;
  }

  before(async () => {
    program = anchor.workspace.Trustgate as Program;
    admin = (provider.wallet as anchor.Wallet).payer;
    scorer = Keypair.generate();
    await airdrop(scorer.publicKey);

    [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
    if (await connection.getAccountInfo(configPda)) {
      await setScorer(scorer.publicKey);
    } else {
      const [programData] = PublicKey.findProgramAddressSync(
        [program.programId.toBuffer()],
        BPF_LOADER_UPGRADEABLE
      );
      await program.methods
        .initializeConfig(scorer.publicKey)
        .accounts({
          config: configPda,
          admin: admin.publicKey,
          program: program.programId,
          programData,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
    }
  });

  // ── attest_score ──

  describe("score provenance", () => {
    let agent: Keypair;
    const registryAsset = Keypair.generate().publicKey;

    before(async () => {
      agent = await newAgent();
    });

    it("has no record before a score is attested", async () => {
      expect(await truva.getScoreRecord(agent.publicKey)).to.equal(null);
    });

    it("writes the score, derives the tier and records where the score came from", async () => {
      const inputsHash = hash("inputs-v1");
      await send(
        attestScoreIx(agent.publicKey, scorer.publicKey, {
          score: 85,
          inputsHash,
          modelVersion: 3,
          registryAsset,
        }),
        scorer
      );

      const passport = await truva.getAgentScore(agent.publicKey);
      expect(passport.score).to.equal(85);
      expect(passport.tier).to.equal("Gold");
      expect(passport.trusted).to.equal(true);

      const record = await truva.getScoreRecord(agent.publicKey);
      expect(record!.score).to.equal(85);
      expect(record!.votes).to.equal(1);
      expect(record!.modelVersion).to.equal(3);
      expect(Buffer.from(record!.inputsHash).equals(Buffer.from(inputsHash))).to.equal(true);
      expect(record!.registryAsset!.toBase58()).to.equal(registryAsset.toBase58());
      expect(record!.scorer.toBase58()).to.equal(scorer.publicKey.toBase58());
      expect(record!.scoredAt).to.be.greaterThan(0);
    });

    it("overwrites the record on the next score and allows an unlinked agent", async () => {
      await send(
        attestScoreIx(agent.publicKey, scorer.publicKey, {
          score: 40,
          inputsHash: hash("inputs-v2"),
          modelVersion: 4,
        }),
        scorer
      );
      const record = await truva.getScoreRecord(agent.publicKey);
      expect(record!.score).to.equal(40);
      expect(record!.modelVersion).to.equal(4);
      expect(record!.registryAsset).to.equal(null);
      expect((await truva.getAgentScore(agent.publicKey)).tier).to.equal("Bronze");
    });

    it("rejects a signer that is not the scorer", async () => {
      const stranger = Keypair.generate();
      await airdrop(stranger.publicKey);
      await expectError(
        send(
          attestScoreIx(agent.publicKey, stranger.publicKey, {
            score: 100,
            inputsHash: hash("x"),
            modelVersion: 1,
          }),
          stranger
        ),
        "Unauthorized"
      );
    });
  });

  // ── Token-2022 vault ──

  describe("token-2022 vault", () => {
    let owner: Keypair;
    let agent: Keypair;
    let seller: Keypair;
    let mint: PublicKey;
    let ownerToken: PublicKey;
    let sellerToken: PublicKey;
    let vault: PublicKey;
    let vaultToken: PublicKey;

    const T22 = TOKEN_2022_PROGRAM_ID;
    const balance = async (token: PublicKey) =>
      Number((await getAccount(connection, token, undefined, T22)).amount);

    before(async () => {
      owner = Keypair.generate();
      seller = Keypair.generate();
      await airdrop(owner.publicKey, 2);
      agent = await newAgent();
      await send(
        attestScoreIx(agent.publicKey, scorer.publicKey, {
          score: 60,
          inputsHash: hash("t22"),
          modelVersion: 1,
        }),
        scorer
      );

      mint = await createMint(connection, owner, owner.publicKey, null, 6, undefined, undefined, T22);
      ownerToken = (
        await getOrCreateAssociatedTokenAccount(connection, owner, mint, owner.publicKey, false, undefined, undefined, T22)
      ).address;
      sellerToken = (
        await getOrCreateAssociatedTokenAccount(connection, owner, mint, seller.publicKey, false, undefined, undefined, T22)
      ).address;
      await mintTo(connection, owner, mint, ownerToken, owner, 100 * UNIT, [], undefined, T22);

      [vault] = deriveVaultPDA(owner.publicKey, agent.publicKey, mint);
      vaultToken = deriveAssociatedTokenAddress(mint, vault, T22);
    });

    it("creates and funds a vault for a Token-2022 mint", async () => {
      await send(
        createVaultIx(
          owner.publicKey,
          agent.publicKey,
          mint,
          { perTxLimit: 2 * UNIT, dailyLimit: 3 * UNIT, allowlist: [seller.publicKey] },
          undefined,
          T22
        ),
        owner
      );
      await transferChecked(connection, owner, ownerToken, mint, vaultToken, owner, 10 * UNIT, 6, [], undefined, T22);

      const state = await truva.getVault(owner.publicKey, agent.publicKey, mint);
      expect(Number(state!.balance)).to.equal(10 * UNIT);
    });

    it("pays from the vault and still enforces the limits", async () => {
      await send(vaultPayIx(owner.publicKey, agent.publicKey, mint, seller.publicKey, 2 * UNIT, undefined, T22), agent);
      expect(await balance(sellerToken)).to.equal(2 * UNIT);
      expect(await balance(vaultToken)).to.equal(8 * UNIT);

      await expectError(
        send(vaultPayIx(owner.publicKey, agent.publicKey, mint, seller.publicKey, 3 * UNIT, undefined, T22), agent),
        "ExceedsPerTxLimit"
      );
      await expectError(
        send(vaultPayIx(owner.publicKey, agent.publicKey, mint, seller.publicKey, 2 * UNIT, undefined, T22), agent),
        "ExceedsDailyLimit"
      );
    });

    it("rejects the classic token program for a Token-2022 mint", async () => {
      await expectError(
        send(vaultPayIx(owner.publicKey, agent.publicKey, mint, seller.publicKey, 1 * UNIT), agent),
        "Error"
      );
      expect(await balance(sellerToken)).to.equal(2 * UNIT);
    });

    it("lets the owner withdraw and close", async () => {
      await send(vaultWithdrawIx(owner.publicKey, agent.publicKey, mint, 3 * UNIT, undefined, T22), owner);
      expect(await balance(vaultToken)).to.equal(5 * UNIT);

      await send(closeVaultIx(owner.publicKey, agent.publicKey, mint, undefined, T22), owner);
      expect(await connection.getAccountInfo(vault)).to.equal(null);
      expect(await connection.getAccountInfo(vaultToken)).to.equal(null);
      expect(await balance(ownerToken)).to.equal(98 * UNIT);
    });
  });

  // ── Scorer committee ──

  describe("scorer committee", () => {
    const members = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
    const [committeePda] = deriveCommitteePDA();
    let agent: Keypair;

    const vote = (member: Keypair, score: number, inputs = "round-1", modelVersion = 7) =>
      send(
        committeeVoteIx(agent.publicKey, member.publicKey, {
          score,
          inputsHash: hash(inputs),
          modelVersion,
        }),
        member
      );

    before(async () => {
      await Promise.all(members.map((m) => airdrop(m.publicKey)));
      // Created while a single key is still the scorer
      agent = await newAgent();
    });

    it("rejects an invalid committee and a non-admin", async () => {
      const keys = members.map((m) => m.publicKey);
      await expectError(send(setCommitteeIxUnchecked(admin.publicKey, keys, 4), admin), "InvalidCommittee");
      await expectError(
        send(setCommitteeIxUnchecked(admin.publicKey, [keys[0], keys[0]], 1), admin),
        "InvalidCommittee"
      );
      await expectError(send(setCommitteeIx(members[0].publicKey, keys, 2), members[0]), "Unauthorized");
    });

    it("lets the admin create a 2-of-3 committee", async () => {
      await send(setCommitteeIx(admin.publicKey, members.map((m) => m.publicKey), 2), admin);
      const committee = await truva.getCommittee();
      expect(committee!.members.map((m) => m.toBase58())).to.deep.equal(
        members.map((m) => m.publicKey.toBase58())
      );
      expect(committee!.threshold).to.equal(2);
      expect(committee!.active).to.equal(false);
    });

    it("does not count votes until the committee is the protocol scorer", async () => {
      await expectError(vote(members[0], 70), "CommitteeNotActive");
    });

    it("takes over scoring when the admin points the scorer at the committee", async () => {
      await setScorer(committeePda);
      expect((await truva.getCommittee())!.active).to.equal(true);
      // The agent's passport was created under the old scorer, so the gate no longer trusts it
      expect((await truva.getAgentScore(agent.publicKey)).trusted).to.equal(false);
    });

    it("no single key can score any more", async () => {
      // The old scorer can still write to a passport it authored, but the gate ignores the result
      await send(
        attestScoreIx(agent.publicKey, scorer.publicKey, {
          score: 100,
          inputsHash: hash("solo"),
          modelVersion: 1,
        }),
        scorer
      );
      expect((await truva.getAgentScore(agent.publicKey)).trusted).to.equal(false);
    });

    it("holds a single vote without changing the score", async () => {
      await vote(members[0], 90);
      const passport = await truva.getAgentScore(agent.publicKey);
      expect(passport.trusted).to.equal(false);
      expect(passport.score).to.equal(100);
      expect((await truva.getScoreRecord(agent.publicKey))!.votes).to.equal(1);
    });

    it("rejects a second vote from the same member, a non-member, and mismatched inputs", async () => {
      await expectError(vote(members[0], 90), "AlreadyVoted");
      const stranger = Keypair.generate();
      await airdrop(stranger.publicKey);
      await expectError(vote(stranger, 90), "NotCommitteeMember");
      await expectError(vote(members[1], 90, "other-inputs"), "ProvenanceMismatch");
      await expectError(vote(members[1], 90, "round-1", 8), "ProvenanceMismatch");
    });

    it("writes the median once the threshold is reached and adopts the passport", async () => {
      await vote(members[1], 60);

      const passport = await truva.getAgentScore(agent.publicKey);
      expect(passport.score).to.equal(60); // lower median of [60, 90]
      expect(passport.tier).to.equal("Silver");
      expect(passport.trusted).to.equal(true);
      expect(passport.authority).to.equal(committeePda.toBase58());

      const record = await truva.getScoreRecord(agent.publicKey);
      expect(record!.votes).to.equal(2);
      expect(record!.score).to.equal(60);
      expect(record!.modelVersion).to.equal(7);
      expect(record!.scorer.toBase58()).to.equal(committeePda.toBase58());
    });

    it("starts a fresh round afterwards", async () => {
      await vote(members[2], 82, "round-2");
      await vote(members[0], 88, "round-2");
      const passport = await truva.getAgentScore(agent.publicKey);
      expect(passport.score).to.equal(82);
      expect(passport.tier).to.equal("Gold");
    });

    it("discards open votes when the membership changes", async () => {
      await vote(members[0], 10, "round-3");
      await send(setCommitteeIx(admin.publicKey, members.map((m) => m.publicKey), 2), admin);
      // members[0] can vote again: the earlier vote belonged to the previous epoch
      await vote(members[0], 95, "round-3b");
      expect((await truva.getAgentScore(agent.publicKey)).score).to.equal(82);
      await vote(members[1], 91, "round-3b");
      expect((await truva.getAgentScore(agent.publicKey)).score).to.equal(91);
    });

    it("any member can freeze; only the admin can unfreeze", async () => {
      const stranger = Keypair.generate();
      await airdrop(stranger.publicKey);
      await expectError(
        send(committeeSetFrozenIx(agent.publicKey, stranger.publicKey, true), stranger),
        "NotCommitteeMember"
      );

      await send(committeeSetFrozenIx(agent.publicKey, members[2].publicKey, true), members[2]);
      expect((await truva.getAgentScore(agent.publicKey)).frozen).to.equal(true);
      await expectError(vote(members[0], 50, "frozen"), "PassportFrozen");

      await expectError(
        send(committeeSetFrozenIx(agent.publicKey, members[2].publicKey, false), members[2]),
        "Unauthorized"
      );
      await send(committeeSetFrozenIx(agent.publicKey, admin.publicKey, false), admin);
      expect((await truva.getAgentScore(agent.publicKey)).frozen).to.equal(false);
    });

    after(async () => {
      // Hand scoring back to a single key so later suites can set their own scorer
      await setScorer(scorer.publicKey);
    });
  });
});

/** `setCommitteeIx` without the client-side checks, to reach the program's own validation. */
function setCommitteeIxUnchecked(admin: PublicKey, members: PublicKey[], threshold: number) {
  const valid = setCommitteeIx(admin, [admin], 1);
  const len = Buffer.alloc(4);
  len.writeUInt32LE(members.length);
  return new TransactionInstruction({
    programId: valid.programId,
    keys: valid.keys,
    data: Buffer.concat([
      valid.data.subarray(0, 8),
      len,
      ...members.map((m) => m.toBuffer()),
      Buffer.from([threshold]),
    ]),
  });
}
