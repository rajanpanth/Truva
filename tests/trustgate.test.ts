import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
} from "@solana/spl-token";
import { expect } from "chai";

const BPF_LOADER_UPGRADEABLE = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

describe("TrustGate", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let program: Program;
  // Provider wallet: the program's upgrade authority, becomes config admin
  let admin: Keypair;
  // Protocol scorer: the only key whose scores the gate accepts
  let scorer: Keypair;
  let agentBronze: Keypair;
  let agentGold: Keypair;
  let recipient: Keypair;
  let configPda: PublicKey;
  let programDataPda: PublicKey;

  const passportPda = (agent: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("passport"), agent.toBuffer()],
      program.programId
    )[0];

  const merchantPda = (merchant: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchant.toBuffer()],
      program.programId
    )[0];

  const vaultPda = (owner: PublicKey, agent: PublicKey, mint: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer(), agent.toBuffer(), mint.toBuffer()],
      program.programId
    )[0];

  const tierOf = (passport: any) => Object.keys(passport.trustTier as object)[0];

  async function airdrop(to: PublicKey, sol = 1) {
    const sig = await provider.connection.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);
  }

  async function expectError(promise: Promise<unknown>, code: string) {
    try {
      await promise;
    } catch (err: any) {
      expect(err.toString()).to.include(code);
      return;
    }
    expect.fail(`Should have thrown ${code}`);
  }

  /** Create a passport (paid by the provider wallet) and optionally score it. */
  async function createPassport(agent: PublicKey, score?: number, tier?: object) {
    await program.methods
      .initializePassport()
      .accounts({
        config: configPda,
        passport: passportPda(agent),
        agent,
        payer: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    if (score !== undefined) {
      await setScore(agent, score, tier!);
    }
  }

  async function setScore(agent: PublicKey, score: number, tier: object) {
    await program.methods
      .updateTrustTier(score, tier)
      .accounts({ passport: passportPda(agent), authority: scorer.publicKey })
      .signers([scorer])
      .rpc();
  }

  function paySol(agent: Keypair, to: PublicKey, requiredTier: object, lamports: number) {
    return program.methods
      .processPaymentSol(requiredTier, new anchor.BN(lamports))
      .accounts({
        config: configPda,
        passport: passportPda(agent.publicKey),
        agent: agent.publicKey,
        recipient: to,
        merchantPolicy: merchantPda(to),
        systemProgram: SystemProgram.programId,
      })
      .signers([agent])
      .rpc();
  }

  before(async () => {
    program = anchor.workspace.Trustgate as Program;
    admin = (provider.wallet as anchor.Wallet).payer;
    scorer = Keypair.generate();
    agentBronze = Keypair.generate();
    agentGold = Keypair.generate();
    recipient = Keypair.generate();

    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
    [programDataPda] = PublicKey.findProgramAddressSync(
      [program.programId.toBuffer()],
      BPF_LOADER_UPGRADEABLE
    );

    await airdrop(scorer.publicKey);
  });

  // ── initialize_config / update_config ──

  describe("config", () => {
    it("rejects config creation by a non-upgrade-authority", async () => {
      const attacker = Keypair.generate();
      await airdrop(attacker.publicKey);

      await expectError(
        program.methods
          .initializeConfig(attacker.publicKey)
          .accounts({
            config: configPda,
            admin: attacker.publicKey,
            program: program.programId,
            programData: programDataPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([attacker])
          .rpc(),
        "InvalidProgramData"
      );
    });

    it("creates the config when signed by the upgrade authority", async () => {
      await program.methods
        .initializeConfig(scorer.publicKey)
        .accounts({
          config: configPda,
          admin: admin.publicKey,
          program: program.programId,
          programData: programDataPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await (program.account as any).protocolConfig.fetch(configPda);
      expect(config.admin.toBase58()).to.equal(admin.publicKey.toBase58());
      expect(config.scorer.toBase58()).to.equal(scorer.publicKey.toBase58());
    });

    it("rejects config update from non-admin", async () => {
      await expectError(
        program.methods
          .updateConfig(null, scorer.publicKey)
          .accounts({ config: configPda, admin: scorer.publicKey })
          .signers([scorer])
          .rpc(),
        "Unauthorized"
      );
    });
  });

  // ── initialize_passport ──

  describe("initialize_passport", () => {
    it("initializes a passport correctly", async () => {
      await createPassport(agentBronze.publicKey);

      const passport = await (program.account as any).agentPassport.fetch(
        passportPda(agentBronze.publicKey)
      );
      expect(passport.trustScore).to.equal(0);
      expect(passport.agent.toBase58()).to.equal(
        agentBronze.publicKey.toBase58()
      );
      expect(passport.txCount.toNumber()).to.equal(0);
      expect(passport.successCount.toNumber()).to.equal(0);
      expect(passport.frozen).to.equal(false);
    });

    it("starts agent at Bronze tier with score 0", async () => {
      const passport = await (program.account as any).agentPassport.fetch(
        passportPda(agentBronze.publicKey)
      );
      expect(passport.trustScore).to.equal(0);
      expect(tierOf(passport)).to.equal("bronze");
    });

    it("sets the protocol scorer as authority, not the payer", async () => {
      const selfServe = Keypair.generate();
      await airdrop(selfServe.publicKey);
      const pda = passportPda(selfServe.publicKey);

      // The agent creates and pays for its own passport
      await program.methods
        .initializePassport()
        .accounts({
          config: configPda,
          passport: pda,
          agent: selfServe.publicKey,
          payer: selfServe.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([selfServe])
        .rpc();

      const passport = await (program.account as any).agentPassport.fetch(pda);
      expect(passport.authority.toBase58()).to.equal(scorer.publicKey.toBase58());

      // ...but cannot score itself
      await expectError(
        program.methods
          .updateTrustTier(100, { gold: {} })
          .accounts({ passport: pda, authority: selfServe.publicKey })
          .signers([selfServe])
          .rpc(),
        "Unauthorized"
      );
    });
  });

  // ── update_trust_tier ──

  describe("update_trust_tier", () => {
    it("updates trust tier when called by authority", async () => {
      await setScore(agentBronze.publicKey, 75, { silver: {} });

      const passport = await (program.account as any).agentPassport.fetch(
        passportPda(agentBronze.publicKey)
      );
      expect(passport.trustScore).to.equal(75);
      expect(tierOf(passport)).to.equal("silver");
    });

    it("stores the tier it is given, independent of the score", async () => {
      // Off-chain scoring can hold an agent at Silver despite a high score
      await setScore(agentBronze.publicKey, 85, { silver: {} });

      const passport = await (program.account as any).agentPassport.fetch(
        passportPda(agentBronze.publicKey)
      );
      expect(passport.trustScore).to.equal(85);
      expect(tierOf(passport)).to.equal("silver");
    });

    it("rejects scores above 100", async () => {
      await expectError(
        setScore(agentBronze.publicKey, 101, { gold: {} }),
        "InvalidTrustScore"
      );
    });

    it("rejects tier update from non-authority", async () => {
      const fakeAuth = Keypair.generate();
      await airdrop(fakeAuth.publicKey);

      await expectError(
        program.methods
          .updateTrustTier(90, { gold: {} })
          .accounts({
            passport: passportPda(agentBronze.publicKey),
            authority: fakeAuth.publicKey,
          })
          .signers([fakeAuth])
          .rpc(),
        "Unauthorized"
      );
    });
  });

  // ── freeze_passport / unfreeze_passport ──

  describe("freeze_passport / unfreeze_passport", () => {
    it("freezes passport correctly", async () => {
      const agent = Keypair.generate();
      await createPassport(agent.publicKey);

      await program.methods
        .freezePassport()
        .accounts({ passport: passportPda(agent.publicKey), authority: scorer.publicKey })
        .signers([scorer])
        .rpc();

      const passport = await (program.account as any).agentPassport.fetch(
        passportPda(agent.publicKey)
      );
      expect(passport.frozen).to.equal(true);
    });

    it("unfreezes passport correctly", async () => {
      const agent = Keypair.generate();
      await createPassport(agent.publicKey);

      await program.methods
        .freezePassport()
        .accounts({ passport: passportPda(agent.publicKey), authority: scorer.publicKey })
        .signers([scorer])
        .rpc();

      await program.methods
        .unfreezePassport()
        .accounts({ passport: passportPda(agent.publicKey), authority: scorer.publicKey })
        .signers([scorer])
        .rpc();

      const passport = await (program.account as any).agentPassport.fetch(
        passportPda(agent.publicKey)
      );
      expect(passport.frozen).to.equal(false);
    });
  });

  // ── verify_trust ──

  describe("verify_trust", () => {
    const verify = (agent: PublicKey, minTier: object) =>
      program.methods
        .verifyTrust(minTier)
        .accounts({ config: configPda, passport: passportPda(agent) });

    it("passes when the tier is met and returns score and tier", async () => {
      // agentBronze is Silver with score 85 at this point
      const result = await verify(agentBronze.publicKey, { silver: {} }).simulate();
      const returnLog = result.raw.find((log: string) =>
        log.startsWith(`Program return: ${program.programId.toBase58()}`)
      );
      expect(returnLog, "return data log").to.exist;
      const data = Buffer.from(returnLog!.split(" ").pop()!, "base64");
      expect([...data]).to.deep.equal([85, 1]);
    });

    it("fails when the tier is insufficient", async () => {
      await expectError(
        verify(agentBronze.publicKey, { gold: {} }).rpc(),
        "InsufficientTrustTier"
      );
    });

    it("fails when the passport is frozen", async () => {
      const agent = Keypair.generate();
      await createPassport(agent.publicKey, 90, { gold: {} });
      await program.methods
        .freezePassport()
        .accounts({ passport: passportPda(agent.publicKey), authority: scorer.publicKey })
        .signers([scorer])
        .rpc();

      await expectError(verify(agent.publicKey, { bronze: {} }).rpc(), "PassportFrozen");
    });

    it("rejects passports not scored by the current scorer until adopted", async () => {
      const agent = Keypair.generate();
      await createPassport(agent.publicKey, 90, { gold: {} });
      await verify(agent.publicKey, { gold: {} }).rpc();

      // Rotate the scorer: scores from the old key are no longer accepted
      const newScorer = Keypair.generate();
      await airdrop(newScorer.publicKey);
      await program.methods
        .updateConfig(null, newScorer.publicKey)
        .accounts({ config: configPda, admin: admin.publicKey })
        .rpc();

      try {
        await expectError(
          verify(agent.publicKey, { bronze: {} }).rpc(),
          "UntrustedAuthority"
        );

        // Only the current scorer can adopt
        await expectError(
          program.methods
            .adoptPassport(90, { gold: {} })
            .accounts({
              config: configPda,
              passport: passportPda(agent.publicKey),
              scorer: scorer.publicKey,
            })
            .signers([scorer])
            .rpc(),
          "Unauthorized"
        );

        await program.methods
          .adoptPassport(60, { silver: {} })
          .accounts({
            config: configPda,
            passport: passportPda(agent.publicKey),
            scorer: newScorer.publicKey,
          })
          .signers([newScorer])
          .rpc();

        await verify(agent.publicKey, { silver: {} }).rpc();
        const passport = await (program.account as any).agentPassport.fetch(
          passportPda(agent.publicKey)
        );
        expect(passport.authority.toBase58()).to.equal(newScorer.publicKey.toBase58());
        expect(passport.trustScore).to.equal(60);
      } finally {
        // Restore the original scorer for the remaining tests
        await program.methods
          .updateConfig(null, scorer.publicKey)
          .accounts({ config: configPda, admin: admin.publicKey })
          .rpc();
      }
    });
  });

  // ── process_payment_sol ──

  describe("process_payment_sol", () => {
    before(async () => {
      await createPassport(agentGold.publicKey, 92, { gold: {} });
      await setScore(agentBronze.publicKey, 35, { bronze: {} });
      await airdrop(agentGold.publicKey, 2);
      await airdrop(agentBronze.publicKey, 2);
    });

    it("blocks payment when agent is frozen", async () => {
      const agent = Keypair.generate();
      await createPassport(agent.publicKey);
      await program.methods
        .freezePassport()
        .accounts({ passport: passportPda(agent.publicKey), authority: scorer.publicKey })
        .signers([scorer])
        .rpc();
      await airdrop(agent.publicKey);

      await expectError(
        paySol(agent, recipient.publicKey, { bronze: {} }, 0.01 * LAMPORTS_PER_SOL),
        "PassportFrozen"
      );
    });

    it("blocks payment when tier is insufficient", async () => {
      await expectError(
        paySol(agentBronze, recipient.publicKey, { gold: {} }, 0.05 * LAMPORTS_PER_SOL),
        "InsufficientTrust"
      );
    });

    it("processes SOL payment for Gold tier agent", async () => {
      const recipientBefore = await provider.connection.getBalance(
        recipient.publicKey
      );
      const paymentAmount = 0.05 * LAMPORTS_PER_SOL;

      await paySol(agentGold, recipient.publicKey, { gold: {} }, paymentAmount);

      const recipientAfter = await provider.connection.getBalance(
        recipient.publicKey
      );
      expect(recipientAfter - recipientBefore).to.equal(paymentAmount);

      const passport = await (program.account as any).agentPassport.fetch(
        passportPda(agentGold.publicKey)
      );
      expect(passport.txCount.toNumber()).to.equal(1);
      expect(passport.successCount.toNumber()).to.equal(1);
    });

    it("rejects payment exceeding Bronze tier limit", async () => {
      // Bronze limit is 5 SOL — try 6 SOL
      await expectError(
        paySol(agentBronze, recipient.publicKey, { bronze: {} }, 6 * LAMPORTS_PER_SOL),
        "ExceedsTierLimit"
      );
    });

    it("allows payment within Silver tier limit", async () => {
      await setScore(agentBronze.publicKey, 65, { silver: {} });

      await paySol(agentBronze, recipient.publicKey, { silver: {} }, 0.01 * LAMPORTS_PER_SOL);

      const passport = await (program.account as any).agentPassport.fetch(
        passportPda(agentBronze.publicKey)
      );
      expect(passport.txCount.toNumber()).to.be.greaterThan(0);
    });
  });

  // ── merchant policy ──

  describe("merchant policy", () => {
    let merchant: Keypair;

    before(async () => {
      merchant = Keypair.generate();
      await airdrop(merchant.publicKey);
    });

    it("lets a recipient require Gold, which the paying agent cannot lower", async () => {
      await program.methods
        .setMerchantPolicy({ gold: {} })
        .accounts({
          policy: merchantPda(merchant.publicKey),
          merchant: merchant.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc();

      // agentBronze is Silver here and asks for Bronze only
      await expectError(
        paySol(agentBronze, merchant.publicKey, { bronze: {} }, 0.01 * LAMPORTS_PER_SOL),
        "InsufficientTrustTier"
      );

      await paySol(agentGold, merchant.publicKey, { bronze: {} }, 0.01 * LAMPORTS_PER_SOL);
    });

    it("rejects a substituted merchant policy account", async () => {
      // Pass another (empty) recipient's policy PDA to dodge the Gold requirement
      await expectError(
        program.methods
          .processPaymentSol({ bronze: {} }, new anchor.BN(0.01 * LAMPORTS_PER_SOL))
          .accounts({
            config: configPda,
            passport: passportPda(agentBronze.publicKey),
            agent: agentBronze.publicKey,
            recipient: merchant.publicKey,
            merchantPolicy: merchantPda(recipient.publicKey),
            systemProgram: SystemProgram.programId,
          })
          .signers([agentBronze])
          .rpc(),
        "ConstraintSeeds"
      );
    });

    it("can be updated and closed by the recipient", async () => {
      await program.methods
        .setMerchantPolicy({ silver: {} })
        .accounts({
          policy: merchantPda(merchant.publicKey),
          merchant: merchant.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc();
      await paySol(agentBronze, merchant.publicKey, { bronze: {} }, 0.01 * LAMPORTS_PER_SOL);

      await setScore(agentBronze.publicKey, 35, { bronze: {} });
      await expectError(
        paySol(agentBronze, merchant.publicKey, { bronze: {} }, 0.01 * LAMPORTS_PER_SOL),
        "InsufficientTrustTier"
      );

      await program.methods
        .closeMerchantPolicy()
        .accounts({
          policy: merchantPda(merchant.publicKey),
          merchant: merchant.publicKey,
        })
        .signers([merchant])
        .rpc();
      await paySol(agentBronze, merchant.publicKey, { bronze: {} }, 0.01 * LAMPORTS_PER_SOL);
    });
  });

  // ── process_payment_spl ──

  describe("process_payment_spl", () => {
    it("processes SPL payment for Gold tier agent", async () => {
      const mint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
      const agentToken = await getOrCreateAssociatedTokenAccount(
        provider.connection, admin, mint, agentGold.publicKey
      );
      const recipientToken = await getOrCreateAssociatedTokenAccount(
        provider.connection, admin, mint, recipient.publicKey
      );
      await mintTo(provider.connection, admin, mint, agentToken.address, admin, 1_000_000);

      await program.methods
        .processPaymentSpl({ gold: {} }, new anchor.BN(250_000))
        .accounts({
          config: configPda,
          passport: passportPda(agentGold.publicKey),
          agent: agentGold.publicKey,
          agentToken: agentToken.address,
          recipientToken: recipientToken.address,
          merchantPolicy: merchantPda(recipient.publicKey),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([agentGold])
        .rpc();

      const after = await getAccount(provider.connection, recipientToken.address);
      expect(Number(after.amount)).to.equal(250_000);
    });
  });

  // ── agent vault ──

  describe("agent vault", () => {
    const UNIT = 1_000_000; // 6 decimals
    let owner: Keypair;
    let agent: Keypair;
    let shop: Keypair;
    let stranger: Keypair;
    let mint: PublicKey;
    let vault: PublicKey;
    let vaultToken: PublicKey;
    let ownerToken: PublicKey;
    let shopToken: PublicKey;
    let strangerToken: PublicKey;

    const pay = (amount: number, toToken: PublicKey, toOwner: PublicKey, signer = agent) =>
      program.methods
        .vaultPay(new anchor.BN(amount))
        .accounts({
          config: configPda,
          passport: passportPda(signer.publicKey),
          vault,
          vaultToken,
          recipientToken: toToken,
          merchantPolicy: merchantPda(toOwner),
          mint,
          agent: signer.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([signer])
        .rpc();

    const balance = async (token: PublicKey) =>
      Number((await getAccount(provider.connection, token)).amount);

    before(async () => {
      owner = Keypair.generate();
      agent = Keypair.generate();
      shop = Keypair.generate();
      stranger = Keypair.generate();
      await airdrop(owner.publicKey, 2);
      await airdrop(agent.publicKey);
      await airdrop(shop.publicKey);

      mint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
      ownerToken = (
        await getOrCreateAssociatedTokenAccount(provider.connection, admin, mint, owner.publicKey)
      ).address;
      shopToken = (
        await getOrCreateAssociatedTokenAccount(provider.connection, admin, mint, shop.publicKey)
      ).address;
      strangerToken = (
        await getOrCreateAssociatedTokenAccount(provider.connection, admin, mint, stranger.publicKey)
      ).address;
      await mintTo(provider.connection, admin, mint, ownerToken, admin, 100 * UNIT);

      vault = vaultPda(owner.publicKey, agent.publicKey, mint);
      vaultToken = getAssociatedTokenAddressSync(mint, vault, true);

      await createPassport(agent.publicKey, 60, { silver: {} });
    });

    it("rejects limits where per-payment exceeds daily", async () => {
      await expectError(
        program.methods
          .createVault(new anchor.BN(30 * UNIT), new anchor.BN(25 * UNIT), [])
          .accounts({
            vault,
            vaultToken,
            agent: agent.publicKey,
            mint,
            owner: owner.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc(),
        "InvalidLimits"
      );
    });

    it("creates a vault with limits and an allowlist", async () => {
      await program.methods
        .createVault(new anchor.BN(10 * UNIT), new anchor.BN(25 * UNIT), [shop.publicKey])
        .accounts({
          vault,
          vaultToken,
          agent: agent.publicKey,
          mint,
          owner: owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const state = await (program.account as any).agentVault.fetch(vault);
      expect(state.owner.toBase58()).to.equal(owner.publicKey.toBase58());
      expect(state.agent.toBase58()).to.equal(agent.publicKey.toBase58());
      expect(state.perTxLimit.toNumber()).to.equal(10 * UNIT);
      expect(state.dailyLimit.toNumber()).to.equal(25 * UNIT);
      expect(state.allowlistLen).to.equal(1);
      expect(state.paused).to.equal(false);

      // Fund with a normal token transfer
      await transfer(provider.connection, owner, ownerToken, vaultToken, owner, 60 * UNIT);
      expect(await balance(vaultToken)).to.equal(60 * UNIT);
    });

    it("lets the agent pay within the limits", async () => {
      await pay(5 * UNIT, shopToken, shop.publicKey);

      expect(await balance(shopToken)).to.equal(5 * UNIT);
      expect(await balance(vaultToken)).to.equal(55 * UNIT);

      const state = await (program.account as any).agentVault.fetch(vault);
      expect(state.spentInWindow.toNumber()).to.equal(5 * UNIT);
      expect(state.totalSpent.toNumber()).to.equal(5 * UNIT);

      const passport = await (program.account as any).agentPassport.fetch(
        passportPda(agent.publicKey)
      );
      expect(passport.txCount.toNumber()).to.equal(1);
    });

    it("blocks a payment above the per-payment limit", async () => {
      await expectError(pay(11 * UNIT, shopToken, shop.publicKey), "ExceedsPerTxLimit");
    });

    it("blocks a zero payment", async () => {
      await expectError(pay(0, shopToken, shop.publicKey), "InvalidAmount");
    });

    it("blocks a recipient that is not on the allowlist", async () => {
      await expectError(
        pay(1 * UNIT, strangerToken, stranger.publicKey),
        "RecipientNotAllowed"
      );
    });

    it("blocks payments once the daily limit is reached", async () => {
      await pay(10 * UNIT, shopToken, shop.publicKey);
      await pay(10 * UNIT, shopToken, shop.publicKey); // 25 of 25 spent

      await expectError(pay(1, shopToken, shop.publicKey), "ExceedsDailyLimit");
      expect(await balance(shopToken)).to.equal(25 * UNIT);
    });

    it("lets the owner raise limits and clear the allowlist", async () => {
      await expectError(
        program.methods
          .updateVaultPolicy(
            new anchor.BN(10 * UNIT),
            new anchor.BN(50 * UNIT),
            Array.from({ length: 9 }, () => Keypair.generate().publicKey)
          )
          .accounts({ vault, owner: owner.publicKey })
          .signers([owner])
          .rpc(),
        "AllowlistTooLong"
      );

      await program.methods
        .updateVaultPolicy(new anchor.BN(10 * UNIT), new anchor.BN(50 * UNIT), [])
        .accounts({ vault, owner: owner.publicKey })
        .signers([owner])
        .rpc();

      await pay(2 * UNIT, strangerToken, stranger.publicKey);
      expect(await balance(strangerToken)).to.equal(2 * UNIT);
    });

    it("does not let the agent change the policy", async () => {
      await expectError(
        program.methods
          .updateVaultPolicy(new anchor.BN(60 * UNIT), new anchor.BN(60 * UNIT), [])
          .accounts({ vault, owner: agent.publicKey })
          .signers([agent])
          .rpc(),
        "Unauthorized"
      );
    });

    it("blocks payments while the owner has paused the vault", async () => {
      await program.methods
        .setVaultPaused(true)
        .accounts({ vault, owner: owner.publicKey })
        .signers([owner])
        .rpc();

      await expectError(pay(1 * UNIT, shopToken, shop.publicKey), "VaultPaused");

      await program.methods
        .setVaultPaused(false)
        .accounts({ vault, owner: owner.publicKey })
        .signers([owner])
        .rpc();
      await pay(1 * UNIT, shopToken, shop.publicKey);
    });

    it("blocks payments while the scorer has frozen the agent", async () => {
      await program.methods
        .freezePassport()
        .accounts({ passport: passportPda(agent.publicKey), authority: scorer.publicKey })
        .signers([scorer])
        .rpc();

      await expectError(pay(1 * UNIT, shopToken, shop.publicKey), "PassportFrozen");

      await program.methods
        .unfreezePassport()
        .accounts({ passport: passportPda(agent.publicKey), authority: scorer.publicKey })
        .signers([scorer])
        .rpc();
    });

    it("enforces the recipient's merchant policy", async () => {
      await program.methods
        .setMerchantPolicy({ gold: {} })
        .accounts({
          policy: merchantPda(shop.publicKey),
          merchant: shop.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([shop])
        .rpc();

      // Agent is Silver
      await expectError(pay(1 * UNIT, shopToken, shop.publicKey), "InsufficientTrustTier");

      await setScore(agent.publicKey, 90, { gold: {} });
      await pay(1 * UNIT, shopToken, shop.publicKey);
    });

    it("does not let another agent spend from the vault", async () => {
      // agentGold has a valid Gold passport but is not this vault's agent
      await expectError(
        pay(1 * UNIT, shopToken, shop.publicKey, agentGold),
        "ConstraintSeeds"
      );
    });

    it("does not let the agent withdraw", async () => {
      const agentToken = (
        await getOrCreateAssociatedTokenAccount(provider.connection, admin, mint, agent.publicKey)
      ).address;

      await expectError(
        program.methods
          .vaultWithdraw(new anchor.BN(1 * UNIT))
          .accounts({
            vault,
            vaultToken,
            ownerToken: agentToken,
            mint,
            owner: agent.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([agent])
          .rpc(),
        "ConstraintSeeds"
      );
    });

    it("lets the owner withdraw", async () => {
      const before = await balance(ownerToken);

      await program.methods
        .vaultWithdraw(new anchor.BN(10 * UNIT))
        .accounts({
          vault,
          vaultToken,
          ownerToken,
          mint,
          owner: owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc();

      expect((await balance(ownerToken)) - before).to.equal(10 * UNIT);
    });

    it("returns the remaining balance when the owner closes the vault", async () => {
      const ownerBefore = await balance(ownerToken);
      const remaining = await balance(vaultToken);
      expect(remaining).to.be.greaterThan(0);

      await program.methods
        .closeVault()
        .accounts({
          vault,
          vaultToken,
          ownerToken,
          mint,
          owner: owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc();

      expect((await balance(ownerToken)) - ownerBefore).to.equal(remaining);
      expect(await provider.connection.getAccountInfo(vault)).to.equal(null);
      expect(await provider.connection.getAccountInfo(vaultToken)).to.equal(null);
    });
  });

  // ── close_passport ──

  describe("close_passport", () => {
    it("closes passport and reclaims rent", async () => {
      const agent = Keypair.generate();
      await createPassport(agent.publicKey);

      const balanceBefore = await provider.connection.getBalance(scorer.publicKey);

      await program.methods
        .closePassport()
        .accounts({ passport: passportPda(agent.publicKey), authority: scorer.publicKey })
        .signers([scorer])
        .rpc();

      const balanceAfter = await provider.connection.getBalance(scorer.publicKey);

      // Authority should have received rent back (minus tx fee)
      expect(balanceAfter).to.be.greaterThan(balanceBefore - 10000);

      // Account should no longer exist
      try {
        await (program.account as any).agentPassport.fetch(passportPda(agent.publicKey));
        expect.fail("Account should be closed");
      } catch (err: any) {
        expect(err.toString()).to.include("Account does not exist");
      }
    });
  });
});
