***

# Tuplaus Game

Finnish card game thing. NestJS backend with GraphQL, React frontend that can also spit out a web component.

## What's where
```
/tuplaus-backend     # NestJS + GraphQL + Prisma + usual suspects
/tuplaus-frontend    # React + Vite (SPA + widget build) + more stuff
docker-compose.yml   # Just Postgres for now
```

## Getting it running

Database first:
```bash
docker compose up -d
```

Backend:
```bash
cd tuplaus-backend
npm install
npx prisma migrate deploy
npm run start:dev
# GraphQL playground: http://localhost:4000/graphql
```

Frontend:
```bash
cd tuplaus-frontend  
npm install
npm run dev
# http://localhost:5173
```

### Or just run backend + DB in Docker
```bash
docker compose up -d --build
# Backend: http://localhost:4000/graphql
# DB: localhost:5432 (postgres/password123, db name: tuplaus_db)
```
Then run frontend normally and point it at `http://localhost:4000/graphql`. 

For the demo page stuff, serve `test.html` from repo root while backend runs in Docker.

## Tests

```bash
# backend e2e (actually hits the DB)
cd tuplaus-backend && npm run test:e2e

# frontend unit tests  
cd tuplaus-frontend && npm run test
```

## GraphQL stuff

Hit: `http://localhost:4000/graphql`

### Schema bits

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

### What you can call

```graphql  
# Creates player if missing, returns existing if found
getOrCreatePlayer(id: String!): Player!

# Play a round
playRound(playRoundInput: PlayRoundInput!): GameRound!

# Move winnings to balance
cashOut(playerId: String!): Player!

# Just get player info
player(id: String!): Player
```

### curl examples (if you're into that)

Make a player:
```bash
curl -X POST http://localhost:4000/graphql -H 'Content-Type: application/json' \
-d '{"query":"mutation($id:String!){getOrCreatePlayer(id:$id){id balance activeWinnings}}","variables":{"id":"test-player"}}'
```

Play:
```bash  
curl -X POST http://localhost:4000/graphql -H 'Content-Type: application/json' \
-d '{"query":"mutation($i:PlayRoundInput!){playRound(playRoundInput:$i){drawnCard didWin winnings newBalance}}","variables":{"i":{"playerId":"test-player","bet":10,"choice":"small"}}}'
```

Cash out:
```bash
curl -X POST http://localhost:4000/graphql -H 'Content-Type: application/json' \
-d '{"query":"mutation($id:String!){cashOut(playerId:$id){id balance activeWinnings}}","variables":{"id":"test-player"}}'
```

### How the game works
- `choice: "small"` = bet on cards 1-6  
- `choice: "large"` = bet on cards 8-13  
- Card 7 = you lose, always
- Win: your winnings double (`activeWinnings += bet*2`)
- Lose: bet gets subtracted, winnings reset to 0
- `cashOut()` moves your winnings into your actual balance

## Database stuff

If you're running Docker Postgres:

```bash
export DATABASE_URL="postgresql://postgres:password123@localhost:5432/tuplaus_db?schema=public"
cd tuplaus-backend
npx prisma migrate deploy  
npm run start:dev
```

When you change the schema: `npx prisma migrate dev`

## Frontend

React app. Can run as normal SPA or build into `<tuplaus-widget>` for embedding.

- State management: zustand (because Redux is overkill)
- Data fetching: react-query + basic GraphQL helper
- Dev mode: `src/main.tsx`  
- Widget mode: reads DOM attributes

### How a game works
1. App calls `getOrCreatePlayer` when it starts
2. Loads player data, runs some fancy entrance animations if you have money
3. You pick Small or Large. If you have winnings, that's your bet. Otherwise uses whatever you typed in.
4. Calls `playRound`, server decides if you won
5. Frontend animates the card draw + shows result
6. If you win: you can Double (keep playing with winnings) or Cash Out (take the money)

### Animation flow
Goes through these states: `IDLE → CLEANUP → REVEALING → COVERING → GATHERING → SHUFFLING → SPREADING → READY → DRAWING → RESULT`

Each state triggers CSS animations. Timing handled with `setTimeout` chains because that's how we roll.

## Web Component

Build the widget:
```bash
cd tuplaus-frontend
npm run build
npm run preview  # serves at localhost:4173
```

Drop it anywhere:
```html
<script src="http://localhost:4173/tuplaus-widget.umd.js"></script>
<tuplaus-widget 
  player-id="demo-player"
  api-url="http://localhost:4000/graphql">
</tuplaus-widget>
```

You can add `allow-origins="site1.com,site2.com"` if you want to block certain hosts.

### Testing the widget

Terminal 1:
```bash
cd tuplaus-frontend && npm run build && npm run preview
```

Terminal 2 (from repo root):  
```bash  
npx serve -l 8080
```

Go to `http://localhost:8080/test.html` - lets you mess with player IDs and API URLs.

## CORS stuff

Backend (if you want to lock it down):
```ts
app.enableCors({
  origin: ['http://localhost:8080', 'https://yoursite.com'],
  credentials: false,
});
```

The widget checks `allow-origins` if you set it.

## Random notes

- Prisma handles all the DB migration stuff
- Every round gets logged to DB (for debugging/audit)
- E2E tests can force specific card outcomes 
- New players get balance=1000, activeWinnings=0

## Docker setup

Run backend + DB together:
```bash
docker compose up -d --build
# Backend: http://localhost:4000/graphql
# DB: localhost:5432 (postgres/password123/tuplaus_db)
```

Backend container connects to postgres container by service name. On startup it runs `prisma migrate deploy` then boots NestJS.

Check logs:
```bash
docker compose logs -f backend
```

Nuke everything and start over:
```bash
docker compose down -v && docker compose up -d --build
```

## Migrations

Local dev (make a new migration):
```bash
cd tuplaus-backend
# Edit prisma/schema.prisma first, then:
npx prisma migrate dev --name whatever_you_changed
```

Just apply existing migrations:
```bash
cd tuplaus-backend
npx prisma migrate deploy
```

Docker version:
```bash
# Backend runs migrate deploy on startup anyway
docker compose up -d --build

# Or run it manually if needed
docker compose exec backend npx prisma migrate deploy
```

Reset everything (careful, this deletes data):
```bash
# Local
cd tuplaus-backend && npx prisma migrate reset

# Docker  
docker compose down -v && docker compose up -d --build
```

***

