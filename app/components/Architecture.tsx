"use client";

const layers = [
  { num: "01", title: "Identity Layer", desc: "SAID Protocol + Solana Agent Registry. On-chain PDA with extended AgentCard metadata." },
  { num: "02", title: "Reputation Engine", desc: "Helius Webhooks + off-chain scorer. Indexes x402 & MPP transaction history → trust score." },
  { num: "03", title: "TrustGate Program", desc: "Rust / Anchor. Core payment blocking/passing logic. The gate nobody else has built.", accent: true },
  { num: "04", title: "ZK Proof Layer", desc: "AgenC + RISC Zero Groth16. Privacy-preserving task completion proofs at ~130k CUs." },
  { num: "05", title: "Cross-Chain Bridge", desc: "ERC-8004 specification. Solana ↔ Ethereum TRUVA portability." },
];

export function Architecture() {
  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {layers.map((layer) => (
          <div
            key={layer.num}
            className={`card p-6 ${
              layer.accent
                ? "!border-[#14F195]/15 bg-gradient-to-br from-[#14F195]/[0.03] to-transparent"
                : ""
            }`}
          >
            <div className="text-[13px] font-bold text-[#14F195] font-mono mb-2.5">{layer.num}</div>
            <h4 className="text-[14px] font-bold text-white mb-1.5">{layer.title}</h4>
            <p className="text-[13px] text-zinc-600 leading-relaxed">{layer.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
