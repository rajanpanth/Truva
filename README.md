# TRUVA — Autonomous Agent Trust & Verification Protocol

TRUVA is a decentralized trust verification layer for autonomous AI agents operating on Solana. It enforces compliance, reputation scoring, and transaction gating through a multi-layered enforcement engine with zero-knowledge proof support.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4, CSS Variables |
| Font | JetBrains Mono (next/font) |
| Database | Supabase (PostgreSQL + Realtime) |
| Blockchain | Solana (web3.js + Wallet Adapter) |
| State | Zustand, React Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Animations | Framer Motion |
| UI | Custom Truva Design System + shadcn/ui |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
truvax/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout (font, providers)
│   ├── providers.tsx           # SolanaWallet + QueryClient providers
│   ├── globals.css             # Global styles + CSS variables + theme
│   ├── (core)/                 # Shell A — Core protocol pages
│   │   ├── layout.tsx          # Shell A layout (topbar + sidebar + statusbar)
│   │   ├── loading.tsx         # Skeleton loading state
│   │   ├── registry/           # Agent Registry with tier/type filters
│   │   ├── agent/[id]/         # Agent profile passport
│   │   ├── reputation/         # Trust reputation dashboard
│   │   ├── live-demo/          # Live enforcement demo console
│   │   ├── trustgate-logs/     # TrustGate transaction logs
│   │   ├── sdk-docs/           # Developer SDK documentation
│   │   ├── validator/          # Validator solutions page
│   │   └── register/           # Agent registration wizard
│   ├── (platform)/             # Shell B — Platform dashboard
│   │   ├── layout.tsx          # Shell B layout (sidebar + topbar with notifications/messages/profile)
│   │   ├── loading.tsx         # Skeleton loading state
│   │   └── dashboard/          # Platform dashboard overview
│   └── api/                    # API routes
│       ├── agents/             # GET/POST agents, GET agent by ID
│       ├── demo/               # Enforcement demo endpoint
│       ├── reputation/         # Reputation scoring endpoint
│       ├── transactions/       # Transaction queries + enforcement
│       └── trustgate/          # TrustGate log queries
│
├── backend/                    # Backend logic & data layer
│   ├── enforcement/            # Enforcement engine modules
│   │   ├── engine.ts           # Main enforcement orchestrator
│   │   ├── agentstandard.ts    # Agent standard compliance check
│   │   ├── chainport.ts        # Cross-chain port verification
│   │   ├── fastenforce.ts      # Fast enforcement path
│   │   ├── onchaingat.ts       # On-chain gating check
│   │   ├── reputascore.ts      # Reputation score validation
│   │   ├── riskguard.ts        # Risk guard assessment
│   │   ├── trustgate.ts        # TrustGate enforcement
│   │   ├── txauth.ts           # Transaction authorization
│   │   ├── workpay.ts          # Payment verification
│   │   └── zkproof.ts          # Zero-knowledge proof verification
│   ├── supabase/               # Supabase client configuration
│   │   ├── client.ts           # Browser client (singleton)
│   │   ├── server.ts           # Server-side client
│   │   └── types.ts            # Database type definitions
│   ├── validators/             # Zod validation schemas
│   │   ├── agentSchema.ts      # Agent query validation
│   │   ├── registerSchema.ts   # Agent registration validation
│   │   └── transactionSchema.ts# Transaction request validation
│   ├── types/                  # TypeScript type definitions
│   │   ├── agent.ts            # Agent, TrustTier types
│   │   ├── enforcement.ts      # EnforcementCheck, TransactionRequest types
│   │   ├── transaction.ts      # Transaction, ReputationEvent types
│   │   └── trustgate.ts        # TrustGateLog types
│   ├── utils/                  # Utility functions
│   │   ├── constants.ts        # Tier scores, task labels, chains
│   │   ├── formatters.ts       # Address truncation, date/amount formatting
│   │   └── trustScore.ts       # Score calculation, tier mapping
│   └── database/               # Database migrations & seed data
│       ├── migrations/         # Supabase migrations
│       └── seed.sql            # Seed data for development
│
├── components/                 # React components
│   ├── ui/truva/               # Custom Truva Design System (12 primitives)
│   │   ├── TruvaButton.tsx     # Button with primary/outlined/ghost variants
│   │   ├── TruvaCard.tsx       # Card container
│   │   ├── TruvaStatCard.tsx   # Stat display card with icon
│   │   ├── TruvaStatusPill.tsx # Status indicator (active/standby/blocked)
│   │   ├── TruvaBadge.tsx      # Tier badge (platinum/gold/silver/bronze)
│   │   ├── TruvaProgressBar.tsx# Colored progress bar
│   │   ├── TruvaPulsingDot.tsx # Animated pulsing dot
│   │   ├── TruvaInput.tsx      # Styled text input
│   │   ├── TruvaCheckTag.tsx   # Check/pass/fail tag
│   │   ├── TruvaTable.tsx      # Data table component
│   │   ├── TruvaTerminal.tsx   # Terminal-style log display
│   │   ├── CodeBlock.tsx       # Code block with copy-to-clipboard
│   │   └── index.ts            # Barrel exports
│   ├── ui/                     # shadcn/ui base components (21 primitives)
│   ├── agents/                 # Agent-specific components
│   │   ├── AgentCard.tsx       # Agent card display
│   │   ├── AgentGrid.tsx       # Agent grid layout
│   │   ├── TierBadge.tsx       # Tier badge component
│   │   ├── TrustScoreBar.tsx   # Trust score progress bar
│   │   └── RegisterWizard/     # Multi-step registration wizard
│   ├── dashboard/              # Dashboard widgets
│   │   ├── StatsCards.tsx      # Summary statistics
│   │   ├── ConnectedAgents.tsx # Connected agents list
│   │   ├── PaymentHistory.tsx  # Transaction history table
│   │   └── TrustGateLogsWidget.tsx # Recent TrustGate logs
│   ├── trustgate/              # TrustGate components
│   │   ├── LogTable.tsx        # Filterable log table
│   │   ├── LogStream.tsx       # Realtime log stream
│   │   └── LatencyChart.tsx    # Latency visualization
│   ├── layout/                 # Layout components
│   │   ├── ShellATopbar.tsx    # Core pages topbar
│   │   ├── Navbar.tsx          # Landing page navbar
│   │   ├── Sidebar.tsx         # Sidebar navigation
│   │   └── Footer.tsx          # Footer component
│   ├── demo/                   # Live demo components
│   ├── landing/                # Landing page sections
│   └── shared/                 # Shared utilities (CopyButton, LoadingSpinner, etc.)
│
├── lib/                        # Frontend libraries
│   ├── hooks/                  # React hooks
│   │   ├── useAgents.ts        # Agent data fetching
│   │   ├── useEnforcement.ts   # Enforcement API hook
│   │   ├── useRealtimeLogs.ts  # Supabase realtime subscription
│   │   ├── useTrustGateLogs.ts # TrustGate log fetching
│   │   └── useWallet.ts       # Solana wallet connection
│   ├── store/                  # Zustand stores
│   │   ├── agentStore.ts       # Agent state management
│   │   ├── demoStore.ts        # Demo state management
│   │   └── uiStore.ts          # UI state management
│   ├── solana/                 # Solana integration
│   │   ├── connection.ts       # RPC connection config
│   │   ├── pda.ts              # Program derived addresses
│   │   └── wallet.tsx          # Wallet provider component
│   └── utils.ts                # General utility (cn helper)
│
└── public/
    └── assets/logo/
        └── truva-logo.png      # TRUVA logo
```

## Pages Overview

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Hero section, live TX feed, agent preview, tier breakdown, registration form |
| `/registry` | Agent Registry | Filterable grid of registered agents with tier/type/search filters |
| `/agent/[id]` | Agent Passport | Individual agent profile with stats, terminal logs, compliance checks |
| `/reputation` | Reputation | Trust score dashboard with animated hotspots and terminal feed |
| `/live-demo` | Live Demo | Interactive enforcement engine demo with phase tracker |
| `/trustgate-logs` | TrustGate Logs | Real-time transaction log viewer with filtering |
| `/sdk-docs` | SDK Docs | Developer documentation with code examples |
| `/validator` | Validator | Validator solutions overview |
| `/register` | Register Agent | Multi-step agent registration wizard |
| `/dashboard` | Dashboard | Platform overview with stats, connected agents, payment history |

## Enforcement Engine

The enforcement engine (`backend/enforcement/`) runs 11 sequential checks on every transaction:

1. **AgentStandard** — Agent identity & registration validation
2. **ChainPort** — Cross-chain bridge verification
3. **FastEnforce** — Quick enforcement pre-checks
4. **OnChainGat** — On-chain gating rules
5. **ReputaScore** — Reputation score threshold check
6. **RiskGuard** — Risk assessment & anomaly detection
7. **TrustGate** — Trust gate compliance verification
8. **TxAuth** — Transaction authorization validation
9. **WorkPay** — Payment & stake verification
10. **ZKProof** — Zero-knowledge proof verification
11. **Engine** — Orchestrates all checks, returns `pass` / `block` / `flag`

## Design System

The custom Truva design system uses:
- **Dark terminal aesthetic** — Black backgrounds (#000), green accents (#00ff88)
- **Monospace typography** — JetBrains Mono throughout
- **CSS Variables** — All colors defined in `:root` for consistency
- **Tier colors** — Platinum (#a78bfa), Gold (#fbbf24), Silver (#94a3b8), Bronze (#f97316)
- **12 custom primitives** — TruvaButton, TruvaCard, TruvaStatCard, TruvaStatusPill, TruvaBadge, TruvaProgressBar, TruvaPulsingDot, TruvaInput, TruvaCheckTag, TruvaTable, TruvaTerminal, CodeBlock

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service role key (server-side only)
```

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

## License

Private — All rights reserved.
