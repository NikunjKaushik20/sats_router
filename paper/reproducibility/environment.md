# Node.js Environment

## Runtime
- Node.js >= 18.0.0
- npm >= 9.0 or pnpm >= 8.0

## Key Dependencies
- `tsx` — TypeScript execution without compilation step
- `dotenv` — Environment variable loading

## Installation
```bash
npm install
```

## TypeScript Version
TypeScript 5.x (`npx tsc --version` to verify)

## No External ML Dependencies
TRACE is pure TypeScript — no Python, no ML frameworks, no GPU required.

## Environment Variables
Copy `.env.example` to `.env` (only needed for live LLM API calls, not simulations).
