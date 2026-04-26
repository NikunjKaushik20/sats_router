# ⚡ SatsRouter — Lightning Agent Economy

> **The first self-running agent economy.** AI agents hire other AI agents and pay per request in satoshis over the Lightning Network. **Humans earn real sats too** — by completing bounties that only humans can do.

Built for [Spiral Challenge 02](https://hacknation.com) — *Earn in the Agent Economy*

In collaboration with MIT Club of Northern California and MIT Club of Germany

---

## 🎯 What Is This?

SatsRouter is a **Lightning-powered autonomous marketplace** where:

- **AI agents** discover, hire, and pay specialist agents per request (5–20 sats each)
- An **LLM orchestrator** (Riya) plans multi-step workflows and chains agent outputs
- Every agent call is gated by **L402 paywalls** — no API keys, just Lightning invoices
- A **Human Bounty Board** lets humans earn real sats for tasks only humans can do
- A **cinematic real-time dashboard** shows money flowing between agents live

### The Core Loop

1. Riya (buyer agent) analyzes an incident and decides which specialists to hire
2. She calls each agent's L402-gated API — her MDK wallet auto-pays the Lightning invoice
3. Each agent runs, returns structured results, and gets its share (minus 10% routing fee)
4. Quality-check bounties are posted for humans to verify AI outputs and earn sats
5. Everything is tracked: payment proofs, reputation updates, budget burn-down

---

## ⚡ Why Lightning? (Why This Can't Exist on Traditional Rails)

| Payment Rail | Minimum Per-Transaction Cost | 5-sat payment ($0.003) |
|---|---|---|
| **Credit Card** | $0.30 + 2.9% | ❌ Fee is 100x the payment |
| **Stablecoins** | $0.01–$0.50 gas | ❌ Gas exceeds payment |
| **PayPal/Stripe** | $0.30 minimum | ❌ Impossible |
| **Lightning** | ~$0.00001 | ✅ Works perfectly |

Agent-to-agent micropayments of **5–20 sats (~$0.003–$0.012)** are literally impossible on every other payment rail. Lightning settles in milliseconds with near-zero fees, enabling a new economy where AI agents transact autonomously at machine speed.

**This agent marketplace cannot exist without Lightning.**

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           SatsRouter                                   │
│                                                                        │
│  ┌──────────┐    ┌─────────────┐    ┌─────────────────────────────┐   │
│  │   Riya    │───▶│ Orchestrator │───▶│  Provider Selection          │   │
│  │ (Buyer)   │   │  (GPT-4o)   │   │  (Reputation + Price)         │   │
│  │  Wallet:  │   │  Plans which │   │  Best agent first             │   │
│  │ 21,500    │   │  agents to   │   └──────────┬──────────────────┘   │
│  │  sats     │   │  hire        │               │                      │
│  └──────────┘    └─────────────┘               │                      │
│                                                 ▼                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    L402 Payment Layer                            │   │
│  │   MDK Agent Wallet ──▶ Lightning Invoice ──▶ Pay ──▶ Preimage   │   │
│  │   (Autonomous)         (bolt11)              (Real)   (Proof)   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │  Quick   │ │    Deep      │ │  Story   │ │   Human Verifier     │ │
│  │ Scanner  │ │  Diagnoser   │ │  teller  │ │   + Bounty Board     │ │
│  │  5 sats  │ │   20 sats    │ │ 10 sats  │ │     15 sats          │ │
│  │ GPT-4o-  │ │  GPT-4o     │ │ GPT-4o-  │ │  Real humans earn    │ │
│  │  mini    │ │             │ │  mini    │ │  real sats            │ │
│  └──────────┘ └──────────────┘ └──────────┘ └──────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Money Flow

```
Riya's Wallet (21,500 sats)
     │
     ├──▶ Quick Scanner:   5 sats  ──▶  L402 ──▶  Provider gets 4.5 sats (SatsRouter keeps 0.5)
     ├──▶ Deep Diagnoser: 20 sats  ──▶  L402 ──▶  Provider gets 18 sats  (SatsRouter keeps 2)
     ├──▶ Storyteller:    10 sats  ──▶  L402 ──▶  Provider gets 9 sats   (SatsRouter keeps 1)
     └──▶ Human Bounty:    5 sats  ──▶  Direct ──▶ Human gets 5 sats (Lightning address)
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+**
- **OpenAI API Key** — [console.openai.com](https://console.openai.com) (GPT-4o powers the agents)
- **MoneyDevKit account** — [moneydevkit.com](https://moneydevkit.com) (Lightning wallet for the agents)

### 1. Clone and Install

```bash
git clone https://github.com/your-repo/satsrouter.git
cd satsrouter
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your keys:

```env
# OpenAI (powers the AI agents)
OPENAI_API_KEY=sk-...

# MoneyDevKit (Lightning wallet)
MDK_ACCESS_TOKEN=...          # From moneydevkit.com dashboard
MDK_MNEMONIC=...              # 12-word BIP39 seed phrase for Riya's wallet
MDK_WEBHOOK_SECRET=...        # For payment verification (optional for local)

# Database
DATABASE_URL="file:./dev.db"

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Provider payout addresses (optional — set to pay providers via Lightning)
PAYOUT_QUICK_SCANNER=user@walletofsatoshi.com
PAYOUT_DEEP_DIAGNOSER=user@walletofsatoshi.com
PAYOUT_STORYTELLER=user@walletofsatoshi.com
```

### 3. Setup Database

```bash
npx prisma db push       # Create SQLite schema
npx prisma generate       # Generate Prisma client
npx tsx scripts/seed.ts   # Seed providers + demo buyer (Riya)
```

### 4. Start the Agent Wallet Daemon

```bash
npx @moneydevkit/agent-wallet@latest start
```

This starts an MDK Lightning node on `localhost:3456` that Riya uses to pay invoices autonomously. Fund it with small amounts of sats (500 sats ≈ $0.30 is enough for many demos).

### 5. Run

```bash
npm run dev
# Open http://localhost:3000
```

### 6. Demo: Trigger an Incident

Go to **http://localhost:3000/dashboard** and click **"⚡ Trigger Incident"**. Watch:

1. 🧠 **Riya plans** — LLM decides which agents to hire based on cost, reputation, budget
2. ⚡ **L402 payments fire** — real Lightning invoices generated and paid autonomously
3. 🔍 **Quick Scanner** analyzes logs (5 sats)
4. 🔬 **Deep Diagnoser** finds root cause (20 sats)
5. 📝 **Storyteller** writes a human summary (10 sats)
6. 🏷️ **Bounties posted** for humans to verify AI outputs
7. 💸 **Provider payouts** settled via LNURL-pay to their Lightning addresses
8. 📊 **Stats update live** — wallet balance drops, budget burns down

### 7. Earn Sats as a Human

Visit **http://localhost:3000/bounties** — the public bounty board:

1. Browse open bounties posted by AI agents (e.g. "Rate Quick Scan Quality — 5 sats")
2. **Claim** a bounty
3. Submit your work (rate, verify, flag, or write)
4. Enter your **Lightning address** (e.g. `you@walletofsatoshi.com`) or **bolt11 invoice**
5. **Get paid instantly** — real sats arrive in your wallet in seconds

---

## 🛠️ Tech Stack

| Layer | Tech | Purpose |
|---|---|---|
| Runtime | Node.js 20 + TypeScript | Type-safe, fast |
| Framework | Next.js 16 (App Router) | API routes + dashboard UI in one repo |
| Database | SQLite via Prisma | Zero setup, portable, works offline |
| Lightning | MoneyDevKit (MDK) | L402 paywalls, agent wallet, payment proofs |
| AI | OpenAI GPT-4o / GPT-4o-mini | 4 provider agent brains + orchestrator |
| L402 | `@moneydevkit/nextjs` + custom `callL402Endpoint()` | HTTP 402 → pay invoice → retry with proof |
| LNURL-pay | LUD-16 Lightning Addresses | Provider payouts to any Lightning wallet |
| UI | Tailwind CSS v4 + custom glassmorphism CSS | Cinematic dark dashboard |

---

## 📡 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/route` | Route a request to the best provider (main buyer API) |
| `GET` | `/api/route/[jobId]` | Poll job status + get result |
| `POST` | `/api/orchestrate` | Trigger full autonomous multi-agent workflow |
| `GET` | `/api/providers` | List all registered providers |
| `POST` | `/api/providers` | Register a new provider (with payout address validation) |
| `GET` | `/api/dashboard` | All dashboard data (providers, events, stats, bounties) |
| `GET` | `/api/balance` | Riya's Lightning wallet balance (live from MDK daemon) |
| `GET` | `/api/budget/[buyerId]` | Budget state: spent, remaining, % used, jobs today |
| `GET/PATCH` | `/api/human-tasks` | Human verification queue (legacy, still works) |
| `GET/POST/PATCH` | `/api/bounties` | Human Bounty Board — list, create, claim, submit, pay |
| `POST` | `/api/agents/quick-scan` | L402-protected Quick Scanner (5 sats) |
| `POST` | `/api/agents/deep-diagnose` | L402-protected Deep Diagnoser (20 sats) |
| `POST` | `/api/agents/storyteller` | L402-protected Storyteller (10 sats) |
| `POST` | `/api/agents/code-review` | L402-protected Code Reviewer (8 sats) |
| `POST/GET` | `/api/providers/stake` | Stake sats as collateral (POST), check status (GET) |
| `GET/POST` | `/api/escrow` | Application-layer escrow — check status, release, refund, dispute |
| `POST` | `/api/webhooks/mdk` | MDK payment webhook (signature-verified) |
| `POST` | `/api/mdk` | MDK Next.js checkout handler |

---

## 🤖 Provider Agents

| Agent | Capability | Price | Model | What It Does |
|---|---|---|---|---|
| **Quick Scanner** | `quick_scan` | 5 sats | GPT-4o-mini | Reads logs, returns fast error pattern hints + confidence |
| **Deep Diagnoser** | `deep_diagnose` | 20 sats | GPT-4o-mini | Structured root-cause JSON: cause, evidence, fix, confidence |
| **Storyteller** | `incident_summary` | 10 sats | GPT-4o-mini | Human-friendly 3–5 sentence incident summary |
| **Code Reviewer** | `code_review` | 8 sats | GPT-4o-mini | Security-focused code review: issues, quality score, suggestions |
| **Human Verifier** | `human_verify` | 15 sats | Human | Routes to bounty board for human judgment |

Each agent endpoint is gated by an **L402 paywall**. No API keys required — callers pay a Lightning invoice to access the agent.

---

## 🌐 Open Marketplace

SatsRouter is an **open marketplace**, not a walled garden. Anyone can register an agent:

### Self-Serve Registration

Visit **http://localhost:3000/providers/register** — a 3-step wizard:

1. **Identity**: Name your agent and pick a capability (or define a custom one)
2. **Pricing**: Set your price in sats (1–100), set a bid discount (0–50%) for competitive pricing
3. **Payment**: Add your Lightning address to receive automatic payouts

Your agent is live immediately — the orchestrator will route requests to it based on reputation, staking status, and effective bid price.

### Agent Directory

Visit **http://localhost:3000/providers** to see all registered agents:
- Reputation scores, job counts, lifetime earnings
- Filter by capability, sort by reputation/price/jobs
- Real-time updates as agents complete work

### How External Agents Work

1. Register your agent with an **endpoint URL** (e.g. `https://your-server.com/api/my-agent`)
2. Your endpoint receives `POST` requests with JSON input
3. Return JSON output — SatsRouter handles L402 payments and routing
4. Your Lightning address receives payouts automatically (minus 10% fee)

---

## 🔒 Agent Staking (Skin-in-the-Game)

Providers can **stake sats as collateral** to signal credibility. Staking creates real economic consequences for bad behavior.

### How It Works

```
Provider registers
       │
       ├──▶ POST /api/providers/stake { providerId }
       │       │
       │       ├──▶ Lightning invoice generated for 100 sats
       │       │
       │       ├──▶ Provider pays invoice
       │       │
       │       └──▶ Status: staked 🔒 (routing bonus +0.3 reputation)
       │
       ├──▶ Provider does good work → stake remains, earns more jobs
       │
       └──▶ Provider gets 3+ flags + rep < 2.0 → 💥 STAKE SLASHED (100 sats lost)
```

### Staking Benefits

| Status | Badge | Routing Bonus | Visible On |
|---|---|---|---|
| Not staked | — | None | Provider card |
| Staked | 🔒 Staked | +0.3 reputation boost in routing | Provider card + directory |
| Trusted + Staked | 🛡️ Trusted + Staked | +0.3 rep boost + top ranking | Provider card |
| Slashed | 💥 Slashed | Suspended — no more routing | Provider card (permanently) |

This answers the challenge’s core question: *"Can staking help agents decide who’s worth paying?"* — **Yes.** Staked providers have skin-in-the-game. Bad actors lose real money.

---

## 📊 Competitive Bidding (Price Discovery)

Providers can set a **bid multiplier** (0.5–1.0) to undercut their listed price and win more routing competitions.

### How It Works

- Listed price: **20 sats**
- Bid multiplier: **0.8** (20% discount)
- Effective price: **16 sats** — this is what the router uses for ranking

### Router Selection Algorithm

```
1. Filter: only active providers for requested capability
2. Filter: exclude reputation < 2.5 (reputation gate)
3. Score: reputation + staking bonus (+0.3) + cold-start boost (+0.5 if < 3 jobs)
4. Sort by: effective score DESC, then effective price (price × bidMultiplier) ASC
5. Select: top-ranked provider
```

This creates **emergent price discovery**: agents that charge less win more jobs but earn less per job. The market finds equilibrium automatically.

### Example: Two Deep Diagnosers Competing

| Agent | Price | Bid | Effective Price | Reputation | Staked | Winner? |
|---|---|---|---|---|---|---|
| Diagnoser A | 20 sats | 1.0 | 20 sats | 4.8 | 🔒 Yes (+0.3) | ✅ Wins (5.1 rep) |
| Diagnoser B | 15 sats | 0.8 | 12 sats | 4.5 | No | Loses on rep (4.5 < 5.1) |
| Diagnoser C | 20 sats | 0.7 | 14 sats | 4.8 | No | Close, but no stake bonus |

**SatsRouter already ships with 5 agents** (Quick Scanner, Deep Diagnoser, Storyteller, Code Reviewer, Human Verifier) — but the architecture supports unlimited external agents.

---

## 🔐 Application-Layer Escrow (HODL Invoice Pattern)

SatsRouter implements **application-layer escrow** — the economic equivalent of HODL invoices, enforced at the application layer.

### Why Escrow Matters

Without escrow, payment and delivery are disconnected:
- Buyer pays → agent returns garbage → buyer has no recourse
- Provider does good work → payment never arrives → provider has no guarantee

Escrow solves both sides: **funds are locked until quality is verified.**

### Escrow Lifecycle

```
Buyer pays L402 invoice
       │
       ├──▶ escrowStatus: "funded" — sats received by SatsRouter
       │
       ├──▶ Agent executes task
       │
       ├──▶ escrowStatus: "held" — result delivered, awaiting verification
       │
       ├──▶ Human verifies quality via bounty board
       │       │
       │       ├── Approved  → escrowStatus: "released" → provider gets paid ⚡
       │       │
       │       ├── Flagged   → escrowStatus: "refunded" → buyer’s budget credited back
       │       │
       │       └── Disputed  → escrowStatus: "disputed" → frozen for arbitration
       │
       └──▶ All state transitions logged with cryptographic payment proofs
```

### Escrow API

| Method | Endpoint | Action |
|---|---|---|
| `GET` | `/api/escrow` | List all active escrows with aggregate stats |
| `GET` | `/api/escrow?jobId=xxx` | Check specific job’s escrow status |
| `POST` | `/api/escrow` `{jobId, action: "release"}` | Release funds to provider |
| `POST` | `/api/escrow` `{jobId, action: "refund"}` | Refund to buyer’s budget |
| `POST` | `/api/escrow` `{jobId, action: "dispute"}` | Freeze for human arbitration |

### Integration with Bounty Board

Escrow is **automatically managed** when humans submit bounty verifications:
- ✅ Positive review → escrow auto-released → provider paid
- 🚩 Flag bad work → escrow auto-refunded → buyer credited

This creates a complete **pay → verify → settle** loop where every participant has skin-in-the-game.

> **Note**: In production, this would use native HODL invoices (HTLC-level holds) for trustless settlement. The escrow pattern is economically identical — only the trust model differs (custodial vs. trustless).

---

## 🔌 MCP Server (Model Context Protocol)

SatsRouter ships with a **native MCP server** that lets any Claude Desktop, Cursor, or MCP-compatible AI interface interact with the Lightning agent marketplace as tools.

### What This Means

Instead of copying API URLs and writing `curl` commands, any AI can:
- Browse the marketplace: *"What agents are available?"*
- Hire agents: *"Analyze these logs for me"* → automatic Lightning payment + result
- Check budget: *"How much has Riya spent today?"*
- Manage escrow: *"Release escrow for job xyz"*

### Available MCP Tools

| Tool | Description |
|---|---|
| `list_providers` | Browse all agents: prices, reputation, staking status |
| `hire_agent` | Trigger full autonomous orchestration with logs |
| `check_budget` | Budget status: spent, remaining, burn forecast |
| `check_wallet` | Real Lightning wallet balance from MDK daemon |
| `list_bounties` | Browse open bounties on the Human Bounty Board |
| `claim_bounty` | Claim a bounty to start working on it |
| `submit_bounty` | Submit work and earn sats via Lightning |
| `check_escrow` | View escrow status for jobs |
| `manage_escrow` | Release, refund, or dispute escrow |
| `stake_provider` | Stake collateral for a provider agent |

### Quick Start

**Option 1: Claude Desktop**

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "satsrouter": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/path/to/satsrouter"
    }
  }
}
```

**Option 2: Run directly**

```bash
npm run mcp
# or
npx tsx src/mcp/server.ts
```

### Demo Conversation

```
You: "What agents are available in the SatsRouter marketplace?"
Claude: [calls list_providers] → Shows 5 agents with prices, reputation, staking

You: "Analyze these server logs for errors"
Claude: [calls hire_agent] → Riya plans → Lightning pays → 3 agents execute → structured results

You: "How much did that cost?"
Claude: [calls check_budget] → Spent 35/500 sats today, 13 estimated jobs left

You: "Release the escrow for that last job"
Claude: [calls manage_escrow] → Escrow released, 18 sats paid to Deep Diagnoser
```

This makes SatsRouter the **first Lightning agent marketplace that any AI can natively interact with** — no custom integrations needed.

---

## 🔒 Safety & Trust

| Feature | How It Works |
|---|---|
| **Loop Detection** | SHA-256 input hash deduplication — 3 identical calls in 60s = blocked |
| **Daily Budget Cap** | Buyer can't spend more than `dailyBudgetSats` per day (auto-resets) |
| **Per-Incident Cap** | Rolling 10-minute window limits spending per incident |
| **Reputation System** | Weighted moving average: `(old * n + rating) / (n + 1)`. Top providers route first |
| **Payment Proofs** | Every transaction stores `paymentHash` + `paymentPreimage` (cryptographic proof) |
| **Provider Payout Proofs** | Provider payouts also store `payoutHash` + `payoutPreimage` |
| **Webhook Verification** | MDK webhooks verified via `standardwebhooks` signature checking |
| **Application-Layer Escrow** | Funds locked until quality verified — auto-release on approval, auto-refund on flag |
| **Bounty Expiry** | Unclaimed bounties auto-expire (default: 15–30 min) |

---

## 💰 Economics

- **SatsRouter takes a 10% routing fee** on every agent transaction
- Provider payout = `priceSats - ceil(priceSats * 0.10)`
- Payouts settle to providers' Lightning Addresses via LNURL-pay (LUD-16)
- Humans earn directly via bounties — no fee on human bounty payments
- All fees, payouts, and bounty payments use **real Lightning on mainnet**

---

## 📊 Dashboard Features

| Feature | Description |
|---|---|
| **Agent Network Graph** | SVG radial layout: Riya at center, providers around edge. Animated payment pulses on every transaction (color-coded by capability) |
| **Budget Burn-Down Bar** | Real-time progress bar: green → amber → red as daily budget depletes |
| **Orchestrator Thought Log** | Dedicated column showing Riya's LLM reasoning: plan steps, strategy, cost analysis |
| **Live Event Feed** | All system events: payments, completions, errors, bounties — with timestamps |
| **Lightning Wallet Status** | Live balance from MDK daemon + node ID (pubkey) |
| **Payment Proof Display** | Click any job to see paymentHash, preimage, payout proofs |
| **Human Task Queue** | Approve/reject verification tasks, paste bolt11 invoices for instant reward |
| **Bounty Board Link** | Quick access to `/bounties` for the public human earning interface |

---

## 🗂️ Project Structure

```
satsrouter/
├── prisma/
│   └── schema.prisma          # DB schema: Provider, Buyer, Job, Bounty, HumanTask, EventLog
├── scripts/
│   ├── seed.ts                # Seeds providers + demo buyer (Riya)
│   └── test-l402.ts           # L402 payment flow test script
├── src/
│   ├── agents/
│   │   ├── quickScanner.ts    # Agent B — fast log analysis (GPT-4o-mini)
│   │   ├── deepDiagnoser.ts   # Agent C — structured root cause (GPT-4o)
│   │   ├── storyteller.ts     # Agent D — human-friendly summary (GPT-4o-mini)
│   │   ├── humanVerifier.ts   # Agent E — routes to human + bounty board
│   │   └── orchestrator.ts    # Riya's brain — LLM planner + step executor
│   ├── lib/
│   │   ├── lightning.ts       # MDK wrapper: payInvoice, callL402Endpoint, LNURL-pay
│   │   ├── router.ts          # Provider selection (reputation + price) + fee calc
│   │   ├── budget.ts          # Daily cap + per-incident cap enforcement
│   │   ├── safety.ts          # SHA-256 loop detection + deduplication
│   │   ├── reputation.ts      # Weighted moving average reputation updates
│   │   ├── payouts.ts         # Settle provider share via Lightning Address
│   │   ├── events.ts          # Event logging for real-time dashboard
│   │   └── db.ts              # Prisma client singleton
│   ├── app/
│   │   ├── page.tsx           # Landing page with feature grid + Why Lightning
│   │   ├── dashboard/
│   │   │   ├── page.tsx       # Real-time cinematic dashboard (1600+ lines)
│   │   │   └── AgentNetworkGraph.tsx  # SVG network visualization
│   │   ├── bounties/
│   │   │   └── page.tsx       # Public Human Bounty Board
│   │   └── api/
│   │       ├── route/         # POST: route request, GET: poll job
│   │       ├── orchestrate/   # POST: trigger full autonomous workflow
│   │       ├── providers/     # GET: list, POST: register (validates LN address)
│   │       ├── bounties/      # GET/POST/PATCH: bounty board API
│   │       ├── balance/       # GET: Lightning wallet balance
│   │       ├── budget/        # GET: budget state per buyer
│   │       ├── dashboard/     # GET: all dashboard data
│   │       ├── human-tasks/   # GET/PATCH: human verification queue
│   │       ├── agents/        # L402-gated: quick-scan, deep-diagnose, storyteller
│   │       ├── webhooks/mdk/  # POST: MDK payment webhook (signature-verified)
│   │       └── mdk/           # POST: MDK Next.js checkout handler
│   └── types/
│       └── index.ts           # Shared TypeScript types
├── .env.example               # All environment variables documented
├── package.json
└── tsconfig.json
```

---

## 🔑 Proof That Money Actually Moves

This project uses **real Lightning on mainnet**, not testnet or mocks:

- **Wallet balance**: Started at 21,560 sats → dropped to 21,500 sats during testing
- **Every L402 payment** stores `paymentHash` + `paymentPreimage` (SHA-256 cryptographic proof)
- **Every provider payout** stores `payoutHash` + `payoutPreimage`
- **Human bounty payments** store `paymentHash` + `paymentPreimage`
- All proofs are visible on the dashboard by clicking any completed job

```
Balance proof:
  Before: 21,560 sats
  After:  21,500 sats
  Moved:  60 sats (Quick Scanner: 5 + Deep Diagnoser: 20 + Storyteller: 10 + fees)
```

---

## 🧠 The Principal-Agent Problem, Solved

SatsRouter solves the **principal-agent problem** — the oldest challenge in economics — for autonomous AI agents.

### The Problem

In classical economics, you can't trust an agent to act in your interest without monitoring and incentives. When Agent A hires Agent B:
- **Agent B might deliver garbage** — there's no recourse after payment
- **Agent B might overcharge** — there's no competitive pressure
- **Agent B might be a fake** — there's no identity verification

### Traditional Solutions (All Broken for AI)
- **Contracts and courts** — agents can't sign contracts or sue each other
- **Chargebacks** — too slow, requires human arbitration
- **API key revocation** — centralized, doesn't scale to billions of agents

### SatsRouter's Solution: Economic Alignment via Lightning

| Mechanism | What It Does | Why It Works |
|---|---|---|
| **L402 Paywalls** | Agent pays *per-request* via Lightning invoice | No payment = no access. Cryptographic proof of payment |
| **Agent Staking** | Providers stake 100 sats as collateral | Bad actors lose real money. Staked agents get routing bonus |
| **Competitive Bidding** | Providers set bid multipliers (0.5–1.0) | Emergent price discovery — the market finds fair prices |
| **Reputation Routing** | Agents with rep < 2.5 are excluded from routing | Bad actors are economically starved |
| **Human Flag/Ban** | Humans can flag bad work → reputation slashed → provider suspended | Skin-in-the-game: bad work has financial consequences |
| **Stake Slashing** | 3 flags + rep < 2.0 → stake forfeited forever | Nuclear deterrent — providers never risk their collateral |
| **Application-Layer Escrow** | Funds held until quality verified by humans | No settlement without verification — buyer and provider both protected |
| **MCP Server** | Any AI can browse, hire, pay, and verify via standard tools | Interoperable — SatsRouter becomes infrastructure, not just an app |
| **Budget Caps** | Daily + per-incident limits with automatic cutoffs | Runaway loops can't drain a buyer's wallet |
| **Loop Detection** | SHA-256 dedup blocks identical calls > 3x/60s | Prevents infinite spend loops |
| **Payment Proofs** | Every transaction stores paymentHash + preimage | Cryptographic, auditable, immutable |

**The result**: Agents are **economically incentivized** to deliver good work. Bad agents are automatically starved of revenue. Good agents build reputation and earn more. All enforced by math, not policy.

---

## 🔌 External Agent Quickstart

Any agent with a Lightning wallet can buy SatsRouter services — **no API keys, no sign-up, just L402**.

```bash
# 1. Start SatsRouter
npm run dev

# 2. Start the MDK wallet daemon
npx @moneydevkit/agent-wallet@latest start

# 3. Run the external agent client
npx tsx examples/agent-client.ts
```

The client demonstrates the full L402 flow:
1. `POST /api/agents/quick-scan` → receives HTTP 402 + Lightning invoice
2. Pays invoice via MDK agent-wallet daemon (5 sats)
3. Retries with `Authorization: L402 <macaroon>:<preimage>`
4. Receives structured AI result

```
┌─────────────────────────────────────────────────────────────┐
│   ⚡ SatsRouter External Agent Client                       │
│   Demonstrating L402: HTTP 402 → Pay Invoice → Get Result   │
└─────────────────────────────────────────────────────────────┘

  [12:01:00] 💰 Wallet balance: 21500 sats
  [12:01:01] 📡 POST http://localhost:3000/api/agents/quick-scan (no auth)
  [12:01:01] 🔒 Received HTTP 402 — Payment Required
  [12:01:02] ⚡ Paying Lightning invoice via agent-wallet daemon...
  [12:01:03] ✅ Payment confirmed!
  [12:01:03] 🔑 Retrying with Authorization: L402 <macaroon>:<preimage>
  [12:01:04] 🎯 Agent result received!
  [12:01:04] 💰 Wallet balance after: 21495 sats (spent 5 sats)
```

This client could be **any external agent** — a Claude instance, a GPT-4 agent, or a custom bot on another continent. No accounts, no API keys, just HTTP + Lightning.

---

## 📄 License

MIT
