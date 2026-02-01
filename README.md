# trenchws-launchpad

A decentralized token launchpad built on Solana, powered by Meteora's Dynamic Bonding Curve (DBC) protocol. Users can create, discover, and trade tokens with automatic graduation to Meteora's AMM when the bonding curve threshold is reached.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
  - [Coin Creation](#coin-creation)
  - [Trading](#trading)
  - [Migration / Graduation](#migration--graduation)
  - [Rewards](#rewards)
- [Real-Time Data](#real-time-data)
- [Authentication](#authentication)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)

---

## Overview

trenchws-launchpad is a full-stack Web3 application that enables permissionless token creation with automatic bonding curve mechanics. Tokens launch on a Dynamic Bonding Curve and, once a migration threshold is hit, automatically graduate to a full Meteora CPAMM liquidity pool for open market trading.

The platform aggregates real-time market data via Jupiter's WebSocket stream, provides TradingView-powered charts, and supports cross-chain bridging through LI.FI.

---

## Features

- **Token Creation** — Launch new SPL tokens with a bonding curve in a single transaction. Configure name, symbol, logo, description, socials, and creator royalties.
- **Explore & Discover** — Browse tokens by category: Top Performers, New Coins, About to Graduate, and Graduated. Filter by launchpad, liquidity, and holder count.
- **Trading** — Buy and sell tokens on the bonding curve or post-graduation AMM. Quotes sourced from Jupiter's Ultra API with configurable slippage.
- **Real-Time Updates** — Live price, transaction, holder, and liquidity data streamed over WebSocket.
- **TradingView Charts** — Full charting library integration with multiple timeframes and indicators.
- **Rewards** — Creators and tagged wallets earn fees from their tokens. Claimable via embedded or external wallet.
- **Cross-Chain Bridge** — Bridge assets from other chains to Solana via the LI.FI widget.
- **Send Tokens** — Native SOL and SPL token transfers with balance validation.
- **User Profiles** — Twitter-linked profiles showing created coins, trading history, and positions.
- **Open Graph Images** — Dynamic OG image generation for tokens, profiles, and pages.

---

## Tech Stack

### Frontend
| Category | Technology |
|---|---|
| Framework | Next.js 15 (Pages Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 3, MUI 7, Radix UI |
| State | Jotai (atomic), TanStack React Query (server state) |
| Tables | TanStack React Table + Virtual |
| Charts | TradingView Charting Library, Recharts |
| Animation | Framer Motion |
| Forms | TanStack React Form, Zod validation |

### Blockchain & DeFi
| Category | Technology |
|---|---|
| Chain | Solana (Mainnet) |
| RPC | Helius |
| Token Standard | SPL Token |
| Bonding Curve | Meteora Dynamic Bonding Curve SDK |
| AMM | Meteora CPAMM SDK |
| Swap Routing | Jupiter Protocol (Ultra API) |
| Anchor | Coral Anchor 0.31 |
| MEV Protection | Jito |

### Backend & Infrastructure
| Category | Technology |
|---|---|
| Database | PostgreSQL |
| Cache | Upstash Redis, ioredis |
| Auth | Privy (OAuth + Wallet) |
| Storage | AWS S3, IPFS |
| Monitoring | Sentry |
| Analytics | Vercel Analytics |
| Hosting | Vercel (Serverless) |
| Bridge | LI.FI Protocol |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  Next.js Pages ─ React 19 ─ Tailwind ─ Jotai   │
│                                                  │
│  Contexts:                                       │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │UserProv. │ │DataStream│ │ ExploreProv.  │   │
│  │(Auth/    │ │(WebSocket│ │ (Filters/     │   │
│  │ Wallet)  │ │ Stream)  │ │  Tabs/Search) │   │
│  └──────────┘ └──────────┘ └───────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │TradeProv.│ │SolPrice  │ │ TokenChart    │   │
│  │(Swap UI) │ │Provider  │ │ Provider      │   │
│  └──────────┘ └──────────┘ └───────────────┘   │
└───────────────────┬─────────────────────────────┘
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
┌──────────────────┐  ┌───────────────────┐
│  API Routes      │  │  WebSocket Stream  │
│  (Next.js API)   │  │  (Jupiter Trench)  │
│                  │  │                    │
│  /api/create-coin│  │  wss://trench-     │
│  /api/trade      │  │  stream.jup.ag/ws  │
│  /api/rewards    │  │                    │
│  /api/swap       │  │  Subscriptions:    │
│  /api/positions  │  │  - recent coins    │
│  /api/auth       │  │  - pool updates    │
│  /api/token      │  │  - transactions    │
└───────┬──────────┘  └───────────────────┘
        │
        ▼
┌───────────────────────────────────────────┐
│              Services Layer                │
│                                            │
│  Coin Creation ─ Trade Confirm ─ Rewards  │
│  Cache Warmup ─ Top Coins ─ Fee Calc     │
│  Transaction Builder ─ Auth Interceptor   │
└───────┬───────────┬───────────┬───────────┘
        │           │           │
        ▼           ▼           ▼
┌────────────┐ ┌─────────┐ ┌─────────────┐
│ PostgreSQL │ │ Upstash │ │   Solana     │
│            │ │ Redis   │ │  (Helius)    │
│ Users      │ │         │ │              │
│ Coins      │ │ Quotes  │ │ DBC Pools    │
│ Positions  │ │ Top     │ │ CPAMM Pools  │
│ Configs    │ │ Coins   │ │ SPL Tokens   │
│ Claims     │ │ Cache   │ │ Transactions │
└────────────┘ └─────────┘ └─────────────┘
```

---

## How It Works

### Coin Creation

1. User fills out a form with token name, symbol, logo, description, and social links.
2. Input is validated with Zod schemas. Logo is uploaded to AWS S3.
3. The backend creates an SPL mint keypair and builds a Meteora DBC pool configuration:
   - **Supply**: 1 billion tokens
   - **Migration threshold**: 83 Solana
   - **Supply on migration**: 20%
   - **Dynamic fees**: 0.2%–1.2%
   - **Creator royalties**: 0–5% (user-configurable)
   - **Platform royalties**: 0.6%
   - **Creation fee**: 0.024 SOL
4. A DBC pool is created on-chain via the Meteora SDK.
5. Token metadata is stored on IPFS. Coin data is persisted to PostgreSQL.
6. The frontend polls a status endpoint until creation is confirmed.

### Trading

1. User selects a token and enters a buy or sell amount.
2. A swap quote is fetched from the Jupiter Ultra API.
3. The transaction is simulated, and the user signs it via their connected wallet (Privy).
4. After on-chain execution, the backend verifies the transaction signature, validates the signer and token address, and logs the trade to PostgreSQL.

### Migration / Graduation

When a token's bonding curve accumulates enough liquidity (83% quote threshold), Meteora automatically migrates the pool:

1. The DBC pool becomes read-only.
2. A new CPAMM pool is created on Meteora with the accumulated liquidity.
3. Creator and platform royalties are distributed.
4. The frontend detects the migration event via WebSocket and updates the UI to show "Graduated" status.
5. All subsequent trading happens on the Meteora CPAMM.

### Rewards

- **Creator rewards**: Token creators earn royalties from trades on their bonding curve.
- **Tagged wallet rewards**: Early supporters of specific tokens earn a share of fees.
- Rewards accumulate on-chain and are claimable via the `/rewards` page.
- Claims are executed as Solana transactions, logged to the `claimed_fees` table.

---

## Real-Time Data

The platform connects to Jupiter's Trench WebSocket stream at `wss://trench-stream.jup.ag/ws` and subscribes to:

| Channel | Data |
|---|---|
| `subscribe:recent` | Newly created coins across enabled launchpads |
| `subscribe:pool` | Price, liquidity, and holder updates for specific pools |
| `subscribe:txns` | Live buy/sell transactions for a token |

The connection auto-reconnects with a 2.5-second delay and resubscribes to all active streams on reconnection.

---

## Authentication

Authentication is handled by [Privy](https://privy.io), supporting two login methods:

- **Twitter/X OAuth** — Links a Twitter identity to the account.
- **Wallet Connect** — Connect Phantom, Solflare, or use Privy's embedded wallet.

On login, the backend verifies the Privy session, creates or updates the user in PostgreSQL, and returns the session. API routes are protected by a Privy auth interceptor that validates the session token on each request.

---

## Database Schema

### Users
| Column | Description |
|---|---|
| `privy_user_id` | Primary key (from Privy) |
| `privy_wallet_address` | Solana wallet address |
| `twitter_username` | Linked Twitter handle |
| `twitter_display_name` | Display name |
| `twitter_image_url` | Profile picture URL |
| `coins_created` | Number of tokens created |
| `coins_graduated` | Number of tokens graduated |

### Coins
| Column | Description |
|---|---|
| `coin_address` | Primary key (token mint address) |
| `coin_name` / `coin_symbol` | Token identity |
| `creator_privy_user_id` | Foreign key to users |
| `coin_fee_rate` | Creator royalty percentage |
| `metadata_uri` | IPFS/S3 metadata URL |
| `is_graduated` | Whether the token has migrated |

### Positions (Trade History)
| Column | Description |
|---|---|
| `wallet_address` | Trader wallet |
| `token_address` | Token traded |
| `transaction_signature` | On-chain transaction ID |
| `sol_amount` / `token_amount` | Trade amounts |
| `is_buy` | Trade direction |

### Configs
| Column | Description |
|---|---|
| `token_address` | Token mint |
| `config_address` | DBC config address |
| `pool_address` | DBC pool address |

### Claimed Fees
| Column | Description |
|---|---|
| `wallet_address` | Claimer |
| `token_address` | Token |
| `amount` | SOL claimed |
| `transaction_signature` | Claim tx |


## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (or Upstash account)
- Solana RPC endpoint (Helius recommended)
- Privy account
- AWS S3 bucket (for image uploads)

## Project Structure

```
src/
├── components/
│   ├── Explore/              # Token discovery grid, filters, tabs
│   ├── TokenCard/            # Token card components with mini charts
│   ├── TokenChart/           # TradingView chart integration
│   ├── TokenHeader/          # Token detail page header & metrics
│   ├── TokenTable/           # Transaction history & holders tables
│   ├── TradeForm/            # Buy/sell trading interface
│   ├── SendFlow/             # Token transfer flow
│   ├── ReceiveFlow/          # Receive tokens (QR code)
│   ├── Rewards/              # Creator rewards table
│   ├── Leaderboard/          # Top traders leaderboard
│   ├── LiFiWidget/           # Cross-chain bridge widget
│   ├── SearchBar/            # Global token search
│   ├── AuthOverlay/          # Authentication gate
│   ├── FirstTimeUserFlow/    # Onboarding wizard
│   ├── PrivateKeyFlow/       # Private key export
│   └── ui/                   # Shared UI primitives
├── contexts/                 # React context providers
├── hooks/                    # Custom React hooks
├── icons/                    # SVG icon components
├── lib/
│   ├── database/             # PostgreSQL query modules
│   ├── services/
│   │   ├── coin-creation/    # Token creation pipeline
│   │   └── external-wallet/  # Transaction builders
│   ├── swap/                 # Jupiter swap client
│   ├── auth/                 # Privy auth interceptor
│   ├── format/               # Number & date formatting
│   ├── utils/                # Shared utilities
│   └── validations/          # Zod schemas
├── pages/
│   ├── api/                  # Serverless API routes
│   ├── coin/[tokenId].tsx    # Token detail page
│   ├── profile/[username].tsx# User profile page
│   ├── launch.tsx            # Coin creation page
│   ├── rewards.tsx           # Rewards claiming page
│   ├── bridge.tsx            # Cross-chain bridge page
│   └── index.tsx             # Home / Explore page
├── styles/
│   └── globals.css           # Global styles & Tailwind imports
└── types/                    # Shared TypeScript types
```
