import { TruvaButton, TruvaStatusPill } from '@/components/ui/truva';
import { CodeBlock } from '@/components/ui/truva/CodeBlock';
import { Book, Shield, Zap, Globe, Terminal } from 'lucide-react';

const apiEndpoints = [
  { method: 'GET', path: '/api/agents', desc: 'List all registered agents', auth: 'API_KEY' },
  { method: 'GET', path: '/api/agents/:id', desc: 'Get agent passport + score', auth: 'API_KEY' },
  { method: 'POST', path: '/api/agents', desc: 'Register a new agent', auth: 'API_KEY + SIGNATURE' },
  { method: 'GET', path: '/api/trustgate', desc: 'Stream TrustGate validation logs', auth: 'API_KEY' },
  { method: 'GET', path: '/api/reputation', desc: 'Get global reputation stats', auth: 'API_KEY' },
  { method: 'GET', path: '/api/transactions', desc: 'List verified transactions', auth: 'API_KEY' },
  { method: 'POST', path: '/api/transactions/enforce', desc: 'Submit transaction for enforcement', auth: 'API_KEY + ZK_PROOF' },
  { method: 'POST', path: '/api/waitlist', desc: 'Join the waitlist', auth: 'NONE' },
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
          <div className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-2">2. INITIALIZE_CLIENT</div>
          <CodeBlock
            language="typescript"
            code={`import { TruvaSDK, TruvaError } from 'truva-sdk';

const truva = new TruvaSDK({
  rpcUrl: 'https://api.devnet.solana.com',
  apiUrl: 'http://localhost:4000',
});

// Check agent score
const score = await truva.getAgentScore(agentPubkey);
console.log(score.tier);   // 'Gold'
console.log(score.score);  // 94
console.log(score.frozen); // false`}
          />
        </div>

        <div>
          <div className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-2">3. REGISTER_AN_AGENT</div>
          <CodeBlock
            language="typescript"
            code={`// Gate a payment by trust tier
try {
  await truva.requireTrustTier('Gold', agentPubkey);
  // ✅ Agent meets Gold tier — proceed
} catch (err) {
  if (err instanceof TruvaError) {
    console.error(err.message); // 'Agent tier Bronze < required Gold'
  }
}

// Register a new agent
await truva.register(agentPubkey);

// Get full profile
const profile = await truva.getAgentProfile(agentPubkey);
console.log(profile.tier);   // 'Bronze'
console.log(profile.score);  // 42`}
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
