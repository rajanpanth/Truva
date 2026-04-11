import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";

describe("TrustGate", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let program: Program;
  let authority: Keypair;
  let agentBronze: Keypair;
  let agentGold: Keypair;
  let recipient: Keypair;

  before(async () => {
    program = anchor.workspace.Trustgate as Program;
    authority = (provider.wallet as anchor.Wallet).payer;
    agentBronze = Keypair.generate();
    agentGold = Keypair.generate();
    recipient = Keypair.generate();
  });

  describe("initialize_passport", () => {
    it("creates a Bronze passport (score auto-computes tier)", async () => {
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agentBronze.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initializePassport(35)
        .accounts({
          passport: passportPda,
          agent: agentBronze.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const passport = await program.account.agentPassport.fetch(passportPda);
      expect(passport.trustScore).to.equal(35);
      expect(passport.agentPubkey.toBase58()).to.equal(
        agentBronze.publicKey.toBase58()
      );
      // Tier is computed from score: 35 → Bronze
      expect(Object.keys(passport.trustTier as object)[0]).to.equal("bronze");
      expect(passport.transactionCount).to.equal(0);
      expect(passport.isFrozen).to.equal(false);
    });

    it("creates a Gold passport (score 92 → Gold tier)", async () => {
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agentGold.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initializePassport(92)
        .accounts({
          passport: passportPda,
          agent: agentGold.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const passport = await program.account.agentPassport.fetch(passportPda);
      expect(passport.trustScore).to.equal(92);
      // Score 92 → Gold
      expect(Object.keys(passport.trustTier as object)[0]).to.equal("gold");
    });

    it("score 50 → Silver tier", async () => {
      const agent = Keypair.generate();
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agent.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initializePassport(50)
        .accounts({
          passport: passportPda,
          agent: agent.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const passport = await program.account.agentPassport.fetch(passportPda);
      expect(passport.trustScore).to.equal(50);
      expect(Object.keys(passport.trustTier as object)[0]).to.equal("silver");
    });

    it("score 80 → Gold tier (boundary)", async () => {
      const agent = Keypair.generate();
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agent.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initializePassport(80)
        .accounts({
          passport: passportPda,
          agent: agent.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const passport = await program.account.agentPassport.fetch(passportPda);
      expect(Object.keys(passport.trustTier as object)[0]).to.equal("gold");
    });

    it("rejects invalid trust score > 100", async () => {
      const badAgent = Keypair.generate();
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), badAgent.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .initializePassport(150)
          .accounts({
            passport: passportPda,
            agent: badAgent.publicKey,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("InvalidTrustScore");
      }
    });
  });

  describe("update_trust", () => {
    it("updates trust score and auto-computes tier", async () => {
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agentBronze.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .updateTrust(75)
        .accounts({
          passport: passportPda,
          authority: authority.publicKey,
        })
        .rpc();

      const passport = await program.account.agentPassport.fetch(passportPda);
      expect(passport.trustScore).to.equal(75);
      // 75 → Silver
      expect(Object.keys(passport.trustTier as object)[0]).to.equal("silver");
    });

    it("rejects update on frozen passport", async () => {
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agentBronze.publicKey.toBuffer()],
        program.programId
      );

      // Freeze first
      await program.methods
        .freezePassport()
        .accounts({
          passport: passportPda,
          authority: authority.publicKey,
        })
        .rpc();

      try {
        await program.methods
          .updateTrust(90)
          .accounts({
            passport: passportPda,
            authority: authority.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown PassportFrozen");
      } catch (err: any) {
        expect(err.toString()).to.include("PassportFrozen");
      }

      // Unfreeze for subsequent tests
      await program.methods
        .unfreezePassport()
        .accounts({
          passport: passportPda,
          authority: authority.publicKey,
        })
        .rpc();

      // Reset score back to Bronze range
      await program.methods
        .updateTrust(35)
        .accounts({
          passport: passportPda,
          authority: authority.publicKey,
        })
        .rpc();
    });
  });

  describe("freeze_passport / unfreeze_passport", () => {
    it("freezes and unfreezes a passport", async () => {
      const agent = Keypair.generate();
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agent.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initializePassport(60)
        .accounts({
          passport: passportPda,
          agent: agent.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Freeze
      await program.methods
        .freezePassport()
        .accounts({
          passport: passportPda,
          authority: authority.publicKey,
        })
        .rpc();

      let passport = await program.account.agentPassport.fetch(passportPda);
      expect(passport.isFrozen).to.equal(true);

      // Unfreeze
      await program.methods
        .unfreezePassport()
        .accounts({
          passport: passportPda,
          authority: authority.publicKey,
        })
        .rpc();

      passport = await program.account.agentPassport.fetch(passportPda);
      expect(passport.isFrozen).to.equal(false);
    });
  });

  describe("close_passport", () => {
    it("closes a passport and reclaims rent", async () => {
      const agent = Keypair.generate();
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agent.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initializePassport(40)
        .accounts({
          passport: passportPda,
          agent: agent.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const balanceBefore = await provider.connection.getBalance(
        authority.publicKey
      );

      await program.methods
        .closePassport()
        .accounts({
          passport: passportPda,
          authority: authority.publicKey,
        })
        .rpc();

      const balanceAfter = await provider.connection.getBalance(
        authority.publicKey
      );

      // Authority should have received rent back (minus tx fee)
      expect(balanceAfter).to.be.greaterThan(balanceBefore - 10000);

      // Account should no longer exist
      try {
        await program.account.agentPassport.fetch(passportPda);
        expect.fail("Account should be closed");
      } catch (err: any) {
        expect(err.toString()).to.include("Account does not exist");
      }
    });
  });

  describe("process_payment_with_trust_check", () => {
    before(async () => {
      const sig1 = await provider.connection.requestAirdrop(
        agentGold.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig1);

      // Reset agentBronze back to Bronze
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agentBronze.publicKey.toBuffer()],
        program.programId
      );
      await program.methods
        .updateTrust(35)
        .accounts({
          passport: passportPda,
          authority: authority.publicKey,
        })
        .rpc();

      const sig2 = await provider.connection.requestAirdrop(
        agentBronze.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig2);
    });

    it("allows Gold agent through Gold gate", async () => {
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agentGold.publicKey.toBuffer()],
        program.programId
      );

      const recipientBefore = await provider.connection.getBalance(
        recipient.publicKey
      );

      const paymentAmount = 0.05 * LAMPORTS_PER_SOL;

      await program.methods
        .processPaymentWithTrustCheck(
          { gold: {} },
          new anchor.BN(paymentAmount)
        )
        .accounts({
          passport: passportPda,
          agent: agentGold.publicKey,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agentGold])
        .rpc();

      const recipientAfter = await provider.connection.getBalance(
        recipient.publicKey
      );

      expect(recipientAfter - recipientBefore).to.equal(paymentAmount);

      const passport = await program.account.agentPassport.fetch(passportPda);
      expect(passport.transactionCount).to.equal(1);
    });

    it("blocks Bronze agent from Gold gate", async () => {
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agentBronze.publicKey.toBuffer()],
        program.programId
      );

      const paymentAmount = 0.05 * LAMPORTS_PER_SOL;

      try {
        await program.methods
          .processPaymentWithTrustCheck(
            { gold: {} },
            new anchor.BN(paymentAmount)
          )
          .accounts({
            passport: passportPda,
            agent: agentBronze.publicKey,
            recipient: recipient.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([agentBronze])
          .rpc();
        expect.fail("Should have thrown InsufficientTrust");
      } catch (err: any) {
        expect(err.toString()).to.include("InsufficientTrust");
      }
    });

    it("allows Bronze agent through Bronze gate", async () => {
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agentBronze.publicKey.toBuffer()],
        program.programId
      );

      const paymentAmount = 0.01 * LAMPORTS_PER_SOL;

      await program.methods
        .processPaymentWithTrustCheck(
          { bronze: {} },
          new anchor.BN(paymentAmount)
        )
        .accounts({
          passport: passportPda,
          agent: agentBronze.publicKey,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agentBronze])
        .rpc();

      const passport = await program.account.agentPassport.fetch(passportPda);
      expect(passport.transactionCount).to.equal(1);
    });

    it("blocks frozen agent from making payments", async () => {
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agentBronze.publicKey.toBuffer()],
        program.programId
      );

      // Freeze the agent
      await program.methods
        .freezePassport()
        .accounts({
          passport: passportPda,
          authority: authority.publicKey,
        })
        .rpc();

      const paymentAmount = 0.01 * LAMPORTS_PER_SOL;

      try {
        await program.methods
          .processPaymentWithTrustCheck(
            { bronze: {} },
            new anchor.BN(paymentAmount)
          )
          .accounts({
            passport: passportPda,
            agent: agentBronze.publicKey,
            recipient: recipient.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([agentBronze])
          .rpc();
        expect.fail("Should have thrown PassportFrozen");
      } catch (err: any) {
        expect(err.toString()).to.include("PassportFrozen");
      }

      // Unfreeze for cleanup
      await program.methods
        .unfreezePassport()
        .accounts({
          passport: passportPda,
          authority: authority.publicKey,
        })
        .rpc();
    });

    it("blocks payment that exceeds tier limit", async () => {
      const [passportPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("passport"), agentBronze.publicKey.toBuffer()],
        program.programId
      );

      // Bronze limit is 5 SOL — try 6 SOL
      const paymentAmount = 6 * LAMPORTS_PER_SOL;

      try {
        await program.methods
          .processPaymentWithTrustCheck(
            { bronze: {} },
            new anchor.BN(paymentAmount)
          )
          .accounts({
            passport: passportPda,
            agent: agentBronze.publicKey,
            recipient: recipient.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([agentBronze])
          .rpc();
        expect.fail("Should have thrown AmountExceedsTierLimit");
      } catch (err: any) {
        expect(err.toString()).to.include("AmountExceedsTierLimit");
      }
    });
  });
});
