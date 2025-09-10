# Tuplaus Game Project

This project is a full-stack implementation of the Finnish card game "Tuplaus". It includes a NestJS GraphQL backend, a React frontend (also available as a Web Component), and a PostgreSQL database managed with Docker.

## Project Structure

- `/tuplaus-backend`: NestJS + GraphQL + Prisma backend
- `/tuplaus-frontend`: React + Vite + TypeScript frontend (builds a Web Component)
- `docker-compose.yml`: PostgreSQL database

## Local Run (Quick Start)

1. Start database:
   ```bash
   docker compose up -d
   ```
2. Backend:
   ```bash
   cd tuplaus-backend
   npm install
   npm run start:dev
   # GraphQL at http://localhost:4000/graphql
   ```
3. Frontend (dev):
   ```bash
   cd tuplaus-frontend
   npm install
   npm run dev
   # App at http://localhost:5173
   ```

## Tests

- Backend e2e:
  ```bash
  cd tuplaus-backend
  npm run test:e2e
  ```
- Frontend unit:
  ```bash
  cd tuplaus-frontend
  npm run test
  ```

---

## API Documentation

GraphQL endpoint (local): `http://localhost:4000/graphql`

### Schema (core types)

```graphql
# Inputs
input PlayRoundInput {
  playerId: String!
  bet: Float!
  choice: String! # "small" | "large"
}

# Objects
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

# Queries
extend type Query {
  player(id: String!): Player
}

# Mutations
extend type Mutation {
  createPlayer(id: String!): Player!
  playRound(playRoundInput: PlayRoundInput!): GameRound!
  cashOut(playerId: String!): Player!
}
```

### Example requests

Create player:
```bash
curl -X POST http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "mutation($id:String!){ createPlayer(id:$id){ id balance activeWinnings } }",
    "variables": { "id": "demo-player" }
  }'
```

Play a round (small):
```bash
curl -X POST http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "mutation($i:PlayRoundInput!){ playRound(playRoundInput:$i){ drawnCard didWin winnings newBalance } }",
    "variables": { "i": { "playerId":"demo-player", "bet":10, "choice":"small" } }
  }'
```

Cash out:
```bash
curl -X POST http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "mutation($id:String!){ cashOut(playerId:$id){ id balance activeWinnings } }",
    "variables": { "id": "demo-player" }
  }'
```

Notes:
- Choice values: `small` (1–6) or `large` (8–13). Card 7 always loses.
- On loss: bet deducted, `activeWinnings` reset to 0. On win: `activeWinnings += bet*2`.
- Cash out moves `activeWinnings` into `balance` and resets `activeWinnings` to 0.

---

## Web Component Usage

Build the widget:
```bash
cd tuplaus-frontend
npm run build
npm run preview   # serves dist at http://localhost:4173
```

Embed in any page (UMD build):
```html
<script src="http://localhost:4173/tuplaus-widget.umd.js"></script>
<tuplaus-widget
  player-id="demo-player"
  api-url="http://localhost:4000/graphql">
</tuplaus-widget>
```

Attributes:
- `player-id` (required): player identifier to play as
- `api-url` (required): GraphQL endpoint URL
- `allow-origins` (optional): comma-separated list of origins allowed to render this widget. If provided and the host origin is not present, the widget refuses to mount.

### Quick test of `test.html`

Terminal A (serve widget build):
```bash
cd tuplaus-frontend
npm run build && npm run preview
```

Terminal B (serve demo page at repo root):
```bash
cd ..
npx serve -l 8080
```
Then open `http://localhost:8080/test.html`.

Local demo page:
- A ready-made `test.html` is included at repo root. Run `npm run preview` (frontend) and then `npx serve -l 8080` (repo root), then open `http://localhost:8080/test.html`.
- The demo lets you change `player-id` and `api-url` dynamically. It will pre-create the player before remounting the widget to avoid "not found" errors.

Deployment notes:
- Host the built JS file (UMD or ES) on a static server/CDN and include it via `<script>` on any site that should embed the widget.
- If you want to restrict where the widget can be used from the client side, set `allow-origins="https://example.com, https://demo.com"` on the tag.
- On the server side (backend), enforce CORS to only allow expected origins (see below).

---

## CORS / Origin controls

### Backend (NestJS)
CORS is enabled in `main.ts`. To restrict allowed origins, replace `app.enableCors()` with a whitelist:
```ts
app.enableCors({
  origin: [
    'http://localhost:8080',
    'https://your-host-site.com'
  ],
  credentials: false,
});
```

### Frontend Web Component
The widget supports an optional `allow-origins` attribute. If present, it compares `window.location.origin` against the comma-separated list:
```html
<tuplaus-widget
  player-id="demo-player"
  api-url="https://api.example.com/graphql"
  allow-origins="https://host1.example.com, https://host2.example.com">
</tuplaus-widget>
```
If the current origin isn’t listed, the widget shows a short warning and refuses to render.

---

## Notes
- Database migrations are managed via Prisma. Run `npx prisma migrate dev` in `/tuplaus-backend` to evolve schema locally.
- Rounds are logged in the `GameRound` table for auditability.
- See `test/app.e2e-spec.ts` in the backend for examples of forced outcomes and DB assertions.
