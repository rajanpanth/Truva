import { TruvaButton, TruvaStatusPill } from '@/components/ui/truva';
import { CodeBlock } from '@/components/ui/truva/CodeBlock';
import { Book, Shield, Zap, Globe, Terminal } from 'lucide-react';

const apiEndpoints = [
  { method: 'GET',  path: '/api/agents',               desc: 'List all registered agents (supports ?tier= filter)', auth: 'API_KEY' },
  { method: 'GET',  path: '/api/agents/:pubkey',        desc: 'Full agent profile with stats',                       auth: 'API_KEY' },
  { method: 'POST', path: '/api/agents/register',       desc: 'Register new agent, triggers score backfill',         auth: 'API_KEY + SIGNATURE' },
  { method: 'GET',  path: '/api/agents/:pubkey/score',  desc: 'Current trust score and tier',                        auth: 'API_KEY' },
  { method: 'GET',  path: '/api/agents/:pubkey/history','desc': 'Score history over time',                           auth: 'API_KEY' },
  { method: 'GET',  path: '/api/agents/:pubkey/txs',    desc: 'Transaction history (paginated)',                     auth: 'API_KEY' },
  { method: 'POST', path: '/api/agents/:pubkey/attest', desc: 'Submit validator attestation',                        auth: 'VALIDATOR_KEY' },
  { method: 'POST', path: '/api/agents/:pubkey/zkproof','desc': 'Submit ZK proof record',                            auth: 'VALIDATOR_KEY' },
  { method: 'GET',  path: '/api/stats',                 desc: 'Aggregate stats — total agents, avg score, tiers',   auth: 'NONE' },
  { method: 'GET',  path: '/health',                    desc: 'Server health — DB and Redis status',                 auth: 'NONE' },
];

const methodColors: Record<string, string> = {
  GET: 'var(--accent-green)',
  POST: 'var(--blue)',
  PUT: 'var(--amber)',
  DELETE: 'var(--red)',
};

export default function SDKDocsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold">SDK_DOCUMENTATION</h1>
          <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">TRUVA PROTOCOL SDK · VERSION 0.1.0 · TYPESCRIPT</p>
        </div>
        <div className="flex items-center gap-2">
          <TruvaStatusPill variant="verified" />
          <span className="text-[12px] uppercase tracking-[2px] text-[var(--text-muted)]">LAST_UPDATED: 2026-04-29</span>
        </div>
      </div>

      {/* Quick Start */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Terminal size={16} className="text-[var(--accent-green)]" />
          <h2 className="text-[14px] font-bold">QUICK_START</h2>
        </div>

        <div className="mb-4">
          <div className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-2">1. INSTALL_PACKAGE</div>
          <CodeBlock code="npm install @truva-protocol/sdk" language="bash" />
        </div>

        <div className="mb-4">
          <div className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-2">2. GATE_A_PAYMENT</div>
          <CodeBlock
            language="typescript"
            code={`import { TruvaSDK, TruvaError } from 'truva-sdk';
import { PublicKey } from '@solana/web3.js';

const truva = new TruvaSDK({
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  apiUrl: process.env.TRUVA_API_URL,
});

// Gate a payment \u2014 throws TruvaError if insufficient tier
try {
  await truva.requireTrustTier('Gold', agentPubkey);
  // ✅ Safe to proceed
} catch (err) {
  if (err instanceof TruvaError) {
    console.log(err.currentTier); // 'Bronze'
    console.log(err.requiredTier); // 'Gold'
  }
}`}
          />
        </div>

        <div>
          <div className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-2">3. READ_TRUST_SCORE</div>
          <CodeBlock
            language="typescript"
            code={`// Read trust score directly from on-chain PDA
const score = await truva.getAgentScore(agentPubkey);

console.log(score.tier);       // 'Gold'
console.log(score.score);      // 87
console.log(score.frozen);     // false

// Check eligibility for a specific amount (in lamports)
const eligible = await truva.isEligible(
  agentPubkey, 'Silver', 50_000_000_000
);
console.log(eligible); // true`}
          />
        </div>
      </div>

      {/* API Reference */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Book size={16} className="text-[var(--accent-green)]" />
          <h2 className="text-[14px] font-bold">API_REFERENCE</h2>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              {['METHOD', 'ENDPOINT', 'DESCRIPTION', 'AUTH'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[13px] uppercase tracking-[2px] text-[var(--text-muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apiEndpoints.map((ep, i) => (
              <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]">
                <td className="px-4 py-2.5">
                  <span className="text-[13px] font-bold px-2 py-0.5 rounded-[2px] border" style={{ color: methodColors[ep.method], borderColor: methodColors[ep.method], backgroundColor: `${methodColors[ep.method]}10` }}>
                    {ep.method}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[12px] text-[var(--accent-green)] font-mono">{ep.path}</td>
                <td className="px-4 py-2.5 text-[12px] text-[var(--text-secondary)]">{ep.desc}</td>
                <td className="px-4 py-2.5 text-[13px] text-[var(--text-muted)]">{ep.auth}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Shield size={20} />, title: 'TRUSTGATE_SDK', desc: 'Real-time transaction validation with configurable risk thresholds and ZK-proof integration.' },
          { icon: <Zap size={20} />, title: 'AGENT_FRAMEWORK', desc: 'Register, manage, and monitor autonomous agents with built-in tier progression and staking.' },
          { icon: <Globe size={20} />, title: 'REPUTATION_API', desc: 'Query global trust scores, validator attestations, and cross-chain reputation data.' },
        ].map((f) => (
          <div key={f.title} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5 hover:border-[var(--border-active)] transition-colors">
            <div className="text-[var(--accent-green)] mb-3">{f.icon}</div>
            <h3 className="text-[12px] font-bold mb-2">{f.title}</h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
            <TruvaButton variant="ghost" className="mt-3 text-[12px] w-full">VIEW_DOCUMENTATION</TruvaButton>
          </div>
        ))}
      </div>
    </div>
  );
}
