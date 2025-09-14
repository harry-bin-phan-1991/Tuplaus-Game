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

Troubleshooting
- GraphQL 400 in tests: use `getOrCreatePlayer` (not `createPlayer`).
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
- Primary entity: `Player { id, balance, activeWinnings }`.
- Game rounds can be logged for audit/debug (implementation detail).

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
- GraphQL 400 in Cypress/e2e: stick to `getOrCreatePlayer`, not `createPlayer`.
- Reset Docker stack: `docker compose down -v && docker compose up -d --build`.
- Free ports 4000/5173/5432 if needed.
***

