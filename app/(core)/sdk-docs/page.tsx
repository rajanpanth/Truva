import { TruvaButton, TruvaStatusPill } from '@/components/ui/truva';
import { CodeBlock } from '@/components/ui/truva/CodeBlock';
import { Book, Code, Shield, Zap, Globe, Terminal } from 'lucide-react';

const apiEndpoints = [
  { method: 'GET', path: '/api/v1/agents', desc: 'List all registered agents', auth: 'API_KEY' },
  { method: 'GET', path: '/api/v1/agents/:id', desc: 'Get agent passport by ID', auth: 'API_KEY' },
  { method: 'POST', path: '/api/v1/agents/register', desc: 'Register a new agent', auth: 'API_KEY + SIGNATURE' },
  { method: 'GET', path: '/api/v1/trustgate/logs', desc: 'Stream TrustGate validation logs', auth: 'API_KEY' },
  { method: 'POST', path: '/api/v1/trustgate/validate', desc: 'Submit transaction for validation', auth: 'API_KEY + ZK_PROOF' },
  { method: 'GET', path: '/api/v1/reputation/:agentId', desc: 'Get reputation score & history', auth: 'API_KEY' },
  { method: 'POST', path: '/api/v1/reputation/attest', desc: 'Submit validator attestation', auth: 'VALIDATOR_KEY' },
  { method: 'GET', path: '/api/v1/validators/status', desc: 'Current validator node status', auth: 'NONE' },
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
          <p className="text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">TRUVA PROTOCOL SDK · VERSION 2.4.0 · TYPESCRIPT</p>
        </div>
        <div className="flex items-center gap-2">
          <TruvaStatusPill variant="verified" />
          <span className="text-[9px] uppercase tracking-[2px] text-[var(--text-muted)]">LAST_UPDATED: 2024-05-24</span>
        </div>
      </div>

      {/* Quick Start */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Terminal size={16} className="text-[var(--accent-green)]" />
          <h2 className="text-[14px] font-bold">QUICK_START</h2>
        </div>

        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-2">1. INSTALL_PACKAGE</div>
          <CodeBlock code="npm install @truva/sdk @truva/core" language="bash" />
        </div>

        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-2">2. INITIALIZE_CLIENT</div>
          <CodeBlock
            language="typescript"
            code={`import { TruvaClient } from '@truva/sdk';

const client = new TruvaClient({
  apiKey: process.env.TRUVA_API_KEY,
  network: 'mainnet',
  region: 'global',
});

// Validate a transaction
const result = await client.trustgate.validate({
  agentId: '0xAF2C...FFC2',
  txHash: '0xB5Fe01...',
  amount: 1500.00,
  currency: 'USDC',
});

console.log(result.status); // 'PASSED'
console.log(result.latency); // '12ms'`}
          />
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-2">3. REGISTER_AN_AGENT</div>
          <CodeBlock
            language="typescript"
            code={`const agent = await client.agents.register({
  name: 'ALPHA_LIQUIDITY_BOT',
  publicKey: '0x...',
  category: 'FINANCIAL_ARBITRAGE',
  capabilities: ['SWAP_EXECUTION', 'LP_MANAGEMENT'],
  stakeAmount: 50000,
});

console.log(agent.id);     // '0xNEW...ID'
console.log(agent.tier);   // 'SANDBOX_ACCESS'
console.log(agent.status); // 'PENDING_VALIDATION'`}
          />
        </div>
      </div>

      {/* API Reference */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Book size={16} className="text-[var(--accent-green)]" />
          <h2 className="text-[14px] font-bold">API_REFERENCE</h2>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              {['METHOD', 'ENDPOINT', 'DESCRIPTION', 'AUTH'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-[2px] text-[var(--text-muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apiEndpoints.map((ep, i) => (
              <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]">
                <td className="px-4 py-2.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] border" style={{ color: methodColors[ep.method], borderColor: methodColors[ep.method], backgroundColor: `${methodColors[ep.method]}10` }}>
                    {ep.method}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[12px] text-[var(--accent-green)] font-mono">{ep.path}</td>
                <td className="px-4 py-2.5 text-[12px] text-[var(--text-secondary)]">{ep.desc}</td>
                <td className="px-4 py-2.5 text-[10px] text-[var(--text-muted)]">{ep.auth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Shield size={20} />, title: 'TRUSTGATE_SDK', desc: 'Real-time transaction validation with configurable risk thresholds and ZK-proof integration.' },
          { icon: <Zap size={20} />, title: 'AGENT_FRAMEWORK', desc: 'Register, manage, and monitor autonomous agents with built-in tier progression and staking.' },
          { icon: <Globe size={20} />, title: 'REPUTATION_API', desc: 'Query global trust scores, validator attestations, and cross-chain reputation data.' },
        ].map((f) => (
          <div key={f.title} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5 hover:border-[var(--border-active)] transition-colors">
            <div className="text-[var(--accent-green)] mb-3">{f.icon}</div>
            <h3 className="text-[12px] font-bold mb-2">{f.title}</h3>
            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
            <TruvaButton variant="ghost" className="mt-3 text-[9px] w-full">VIEW_DOCUMENTATION</TruvaButton>
          </div>
        ))}
      </div>
    </div>
  );
}
