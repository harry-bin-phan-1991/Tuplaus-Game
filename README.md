***

# Tuplaus Game

A simple, fast “higher-lower” card game:
- You bet Small (1–6) or Large (8–13). Card 7 always loses.
- Win: winnings increase; choose to Double (continue) or Cash Out (bank it).

The project has:
- Backend: NestJS + GraphQL + Prisma (Dockerized).
- Frontend: React + Vite with a beautiful, animated table and an embeddable Web Component.

## 1) Introduction – how the game and project work
- The client calls `getOrCreatePlayer(id)` on start, then fetches the player.
- When you click Small/Large, the client runs `playRound(playRoundInput)` and animates the draw.
- On win, you can Double (play with winnings) or Cash Out (move winnings to balance).
- You can run the frontend as a SPA or embed it as `<tuplaus-widget>`.

What’s where:
```
/tuplaus-backend     # NestJS + GraphQL + Prisma
/tuplaus-frontend    # React + Vite (SPA + widget build)
docker-compose.yml   # Postgres + backend (compose)
```

## 2) How to run (quick start)

Priority: run backend + DB with Docker; run frontend normally.

Prerequisites
- Docker Desktop
- Node 18+ (tested with Node 22)
- Yarn 1.x (or npm)
- Ports: 4000 (backend), 5173 (frontend dev), 4173 (frontend preview), 5432 (Postgres)

Quick Start (backend+DB via Docker, frontend dev)
```bash
# 1) Start backend + DB in Docker (runs migrations automatically)
docker compose up -d --build
# Backend: http://localhost:4000/graphql

# 2) Start frontend normally
cd tuplaus-frontend
yarn
yarn dev
# Frontend: http://localhost:5173
```
If migrations fail or you need to re-apply:
```bash
docker compose exec backend npx prisma migrate deploy
```

Alternative: run backend locally (optional)
```bash
cd tuplaus-backend
npm install
npx prisma migrate deploy
npm run start:dev
# GraphQL: http://localhost:4000/graphql
```

Database connection:
```
- DATABASE_URL="postgresql://postgres:password123@localhost:5432/tuplaus_db?schema=public"
- database name : tuplaus_db
- database user : postgres
- password: password123
- host: localhost
- port : 5432
```

Troubleshooting
- Ports busy: free 4000/5173/5432 or change them.
- Reset Docker stack: `docker compose down -v && docker compose up -d --build`.
- First Cypress run downloads a binary; let it complete.

### Embed testing (test.html)
```bash
# Terminal 1 (build and preview the widget)
cd tuplaus-frontend
yarn build
yarn preview   # http://localhost:4173

# Terminal 2 (serve the demo page from repo root)
npx serve -l 8080

# Open http://localhost:8080/test.html
# Adjust player-id and api-url to point to your backend
```

## 3) Architecture – frontend, backend, database

Frontend (tuplaus-frontend)
- Features: get-or-create flow, animated dealing/shuffle/draw, bet input, win/lose transitions, cash out, responsive layout.
- Technologies: React + Vite, Zustand (state), React Query (data), Radix UI, SCSS with design tokens.
- Animations: CSS-driven states (REVEALING → COVERING → GATHERING → SHUFFLING → SPREADING → READY → DRAWING → RESULT) with timed transitions.
- Tests: Vitest unit tests; Cypress e2e with deterministic network intercepts.
- Structure (feature-first):
```
src/
  features/
    game/
      api/    # GraphQL queries and types
      model/  # zustand store
      ui/     # Game UI components and styles
  shared/
    api/      # graphqlRequest helper
    styles/   # design tokens
    ui/       # shared UI (Logo, ErrorBoundary)
```
- Imports use alias `@` → `src`.

Backend (tuplaus-backend)
- Stack: NestJS + GraphQL + Prisma.
- APIs (purpose):
  - `getOrCreatePlayer(id: String!): Player!` – idempotent create-or-load.
  - `playRound(playRoundInput: PlayRoundInput!): GameRound!` – compute outcome, update winnings/balance.
  - `cashOut(playerId: String!): Player!` – move `activeWinnings` → `balance`.
  - `player(id: String!): Player` – fetch player snapshot.
- Runs migrations on container startup.

Database
- Primary entity: `Player` – one row per player.
  - `id: string` (PK): Caller-provided identifier (e.g., user id). Stable across sessions.
  - `balance: number` (decimal): Spendable account balance. Increases on cash out; decreases on lost bet.
  - `activeWinnings: number` (decimal): Unbanked winnings carried into the next round if you choose to Double. Set to 0 on loss; moved to `balance` on cash out.
  - `createdAt: datetime` (optional): Row creation timestamp.
  - `updatedAt: datetime` (optional): Last mutation timestamp.

- Optional audit table: `GameRoundLog` – immutable record of each played round. Useful for analytics/audit.
  - `id: string` (PK): Round id.
  - `playerId: string` (FK → Player.id): Who played the round.
  - `bet: number` (decimal): Bet amount used for the round (winnings if doubling, else input bet).
  - `choice: 'small' | 'large'`: Player choice for the round.
  - `drawnCard: number` (1–13): Server-drawn card.
  - `didWin: boolean`: Outcome flag.
  - `winnings: number` (decimal): Winnings produced by this round (0 if loss).
  - `newBalance: number` (decimal): Player balance after the round is applied server-side.
  - `createdAt: datetime`: When the round was persisted.

## 4) Project architecture & embed (Web Component)

Dockerization
- `docker-compose.yml` brings up Postgres and the backend; backend runs `prisma migrate deploy` on boot.
- Frontend runs locally (hot dev) or builds a UMD bundle for embedding.

Embed – why Web Component (vs iframe)
- Web Components integrate directly with the host DOM for better theming, events, and footprint.
- No iframe boundary or extra process; simpler messaging and styling.
- We provide an `allow-origins` attribute to gate usage per origin.

How the Web Component works
```html
<link rel="stylesheet" href="http://localhost:4173/tuplaus-frontend.css">
<script src="http://localhost:4173/tuplaus-widget.umd.js"></script>
<tuplaus-widget
  player-id="demo-player"
  api-url="http://localhost:4000/graphql"
  allow-origins="http://localhost:8080">
</tuplaus-widget>
```
- Attributes are read on mount; the component renders the React app inside a light-DOM container.

## 5) Scripts, testing, and references

Useful scripts
```bash
# Backend
cd tuplaus-backend
npm run start:dev                     # start locally
npx prisma migrate deploy             # apply migrations
npm run test:e2e                      # backend e2e

# Frontend
cd tuplaus-frontend
yarn dev                              # start dev server
yarn build                            # build widget UMD
yarn preview                          # preview build (http://localhost:4173)
yarn lint                             # lint
yarn test:unit                        # unit tests (Vitest)
yarn test:e2e                         # Cypress run
yarn test:e2e:open                    # Cypress GUI
```

GraphQL endpoint: `http://localhost:4000/graphql`

Schema snippets
```graphql
input PlayRoundInput {
  playerId: String!
  bet: Float!
  choice: String! # "small" or "large"
}

type GameRound {
  drawnCard: Int!
  didWin: Boolean!
  winnings: Float!
  newBalance: Float!
}

type Player {
  id: String!
  balance: Float!
  activeWinnings: Float!
}
```

curl examples
```bash
# get or create player
curl -X POST http://localhost:4000/graphql -H 'Content-Type: application/json' \
-d '{"query":"mutation($id:String!){getOrCreatePlayer(id:$id){id balance activeWinnings}}","variables":{"id":"test-player"}}'

# play a round
curl -X POST http://localhost:4000/graphql -H 'Content-Type: application/json' \
-d '{"query":"mutation($i:PlayRoundInput!){playRound(playRoundInput:$i){drawnCard didWin winnings newBalance}}","variables":{"i":{"playerId":"test-player","bet":10,"choice":"small"}}}'

# cash out
curl -X POST http://localhost:4000/graphql -H 'Content-Type: application/json' \
-d '{"query":"mutation($id:String!){cashOut(playerId:$id){id balance activeWinnings}}","variables":{"id":"test-player"}}'
```

Troubleshooting
- Reset Docker stack: `docker compose down -v && docker compose up -d --build`.
- Free ports 4000/5173/5432 if needed.
***

