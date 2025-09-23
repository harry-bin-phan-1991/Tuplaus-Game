# Tuplaus Game

A full-stack implementation of the Finnish "Tuplaus" (Double Up) card game.

-   **Backend**: NestJS, GraphQL, Prisma, PostgreSQL (running in Docker)
-   **Frontend**: React, TypeScript, Vite, SCSS (can be run standalone or embedded in an iframe)

The project is architected for clarity, testability, and adherence to best practices, including comprehensive unit and E2E tests for both frontend and backend.

***

## 1) Architecture Overview

The project is a monorepo containing two main packages: `tuplaus-backend` and `tuplaus-frontend`.

### Frontend (`tuplaus-frontend`)

A modern React application built with Vite.

-   **UI**: Built with React, TypeScript, and SCSS for styling. The UI is fully responsive and includes fluid animations for all game state transitions.
-   **State Management**: Zustand is used for lightweight global state management.
-   **Data Fetching**: TanStack Query handles GraphQL requests, caching, and state synchronization.
-   **Testing**: Unit tests are written with Vitest and React Testing Library. End-to-end tests use Cypress with network mocking for deterministic results.
-   **Structure**: Follows a feature-first architecture (`/features`, `/shared`) with path aliases (`@/`) for clean imports.
-   **Embedding**: The application is designed to be embedded into any host page using an `<iframe>`. Configuration is passed via URL query parameters.

### Backend (`tuplaus-backend`)

A robust GraphQL API built with NestJS.

-   **API**: GraphQL endpoint for all game actions.
-   **ORM**: Prisma connects to a PostgreSQL database for data persistence.
-   **Game Logic**: Core game rules, player balance, and win/loss calculations are handled in the `GameService`.
-   **Security**: Uses Node.js's `crypto` module for cryptographically secure random number generation (CSPRNG) to ensure fair card draws.
-   **Testing**: Unit tests for services and E2E tests for the GraphQL API are written with Jest.

### Database

-   **Engine**: PostgreSQL, managed via Docker Compose.
-   **Schema**: A simple `Player` model stores user ID, balance, and active winnings. Migrations are managed by Prisma.
-   **See "Database Design" section for a detailed schema breakdown.**

***

## 2) How to run (quick start) + also embed testing

Priority: run backend + DB with Docker; run frontend normally.

### Prerequisites

-   Node.js (v18+ recommended)
-   Docker Desktop
-   `yarn` or `npm`

### Step 1: Start Backend & Database (Docker)

This is the recommended way to run the backend services.

```bash
# From the project root directory
docker compose up -d --build
```

-   This command will:
    1.  Build the backend Docker image.
    2.  Start a PostgreSQL container.
    3.  Start the backend container.
    4.  Run Prisma database migrations automatically on startup.
-   **Backend GraphQL API will be available at:** `http://localhost:4000/graphql`
-   **Database will be available at:** `localhost:5432`

### Step 2: Start Frontend

```bash
# From the project root, open a new terminal
cd tuplaus-frontend
yarn install
yarn dev
```

-   **The frontend development server will be running at:** `http://localhost:5173`

### Step 3: Test the Iframe Embedding

To see the game embedded in a host page:

1.  **Build and Preview the Frontend:**
    The iframe needs to load the *production build* of the frontend.

    ```bash
    # In the tuplaus-frontend directory
    yarn build
    yarn preview
    ```

    This will serve the built frontend app at `http://localhost:4173`.

2.  **Serve the Host Page:**
    Open another new terminal.

    ```bash
    # From the project root directory
    npx serve -l 8080
    ```

3.  **Open in Browser:**
    -   Navigate to `http://localhost:8080/test.html`.
    -   You should see the game running inside an iframe.
    -   Use the controls on the page to reload the iframe with different `playerId` values.

***

## 3) Project Deep Dive

### Frontend Architecture

-   **Path Alias**: `@/` is configured to point to `tuplaus-frontend/src`.
-   **Folder Structure**:
    -   `src/features/game`: Contains all logic, UI, and state related to the core game feature.
        -   `api/`: GraphQL queries, mutations, and TypeScript types.
        -   `model/`: Zustand store (`gameStore.ts`).
        -   `ui/`: React components (`Game`, `GameHeader`, etc.) and SCSS styles.
    -   `src/shared`: Reusable code across features.
        -   `api/`: The `graphqlRequest` helper function.
        -   `styles/`: Global styles and design tokens (`tokens.scss`).
        -   `ui/`: Common components like `ErrorBoundary` and `Logo`.
-   **Entry points**:
    -   `src/main.tsx`: SPA bootstrap. Renders `App` without hardcoded props so it reads configuration from URL.
    -   `src/App.tsx`: Reads `playerId` and `apiUrl` from `window.location.search` and initializes the game store.
-   **Animation Flow**: The game's visual flow is managed by a state machine (`gameState`) in the `Game` component. CSS classes are applied based on the current state, triggering transitions and keyframe animations defined in `cards.scss`. The sequence is:
    `IDLE` → `CLEANUP` → `REVEALING` → `COVERING` → `GATHERING` → `SHUFFLING` → `SPREADING` → `READY` → `DRAWING` → `RESULT`

### Iframe Embedding

The React application is embedded using a standard `<iframe>`.

**How it works:**

1.  The frontend is built as a standard Single-Page Application (SPA).
2.  The host page (`test.html`) creates an `<iframe>` element.
3.  The `src` attribute of the iframe points to the URL of the frontend app, with configuration passed as query parameters.

```html
<iframe
  src="http://localhost:4173/?playerId=demo-1&apiUrl=http://localhost:4000/graphql"
>
</iframe>
```

-   **Query parameters** (required):
    -   `playerId`: Unique identifier used by backend to load or create the player.
    -   `apiUrl`: Full GraphQL endpoint URL (e.g., `http://localhost:4000/graphql`).
-   **Demo host page**: `test.html` includes UI controls to change `playerId`/`apiUrl` and reload the iframe.
-   **Ports**: Preview server runs on `4173` (`yarn preview`). Dev server runs on `5173` (`yarn dev`). For iframe testing, use the preview server.
-   **Security note**: Backends should configure CORS appropriately for the host origin embedding the iframe.

Inside the React app, the `App.tsx` component reads `window.location.search` to get the `playerId` and `apiUrl`, initializing the game store with these values. This makes the component configurable and portable.

### Backend API (GraphQL)

-   **Endpoint**: `http://localhost:4000/graphql`
-   **Key Operations**:
    -   `getOrCreatePlayer(id: String!)`: Fetches a player by ID or creates a new one with a default balance if not found. This is an idempotent operation.
    -   `playRound(playRoundInput: PlayRoundInput!)`: Executes one round of the game.
    -   `cashOut(playerId: String!)`: Moves `activeWinnings` to the main `balance`.
    -   `player(id: String!)`: Fetches the current state of a player.

### Database Design

The database schema is defined in `tuplaus-backend/prisma/schema.prisma`.

-   **`Player` Model**: The core entity representing a game player.
    -   `id` (String, `@id`): A unique identifier for the player, provided by the client.
    -   `balance` (Decimal): The player's main currency balance.
    -   `activeWinnings` (Decimal): Winnings from the current streak that have not yet been cashed out. This is the amount that is doubled on a win.
    -   `createdAt` / `updatedAt`: Automatic timestamps.
-   **`GameRound` Model**: Logs every round played for auditing and history.
    -   `id` (String, `@id`): Unique ID for the round.
    -   `playerId` (String): Foreign key linking to the `Player`.
    -   `bet` (Decimal): The amount that was bet for the round.
    -   `choice` (String): The player's guess ("small" or "large").
    -   `drawnCard` (Int): The card value (1-13) that was drawn.
    -   `didWin` (Boolean): The outcome of the round.
    -   `winnings` (Decimal): The amount won in this specific round (0 if lost).

***

## 4) Development & Testing

### Scripts

All commands should be run from the respective package directory (`tuplaus-frontend` or `tuplaus-backend`).

**Backend:**

-   `yarn dev`: Start the NestJS server in watch mode.
-   `yarn test:unit`: Run unit tests for services.
-   `yarn test:e2e`: Run end-to-end tests against the GraphQL API (requires database).
-   `npx prisma migrate dev`: Create a new database migration.
-   `npx prisma migrate deploy`: Apply pending migrations to the database.

**Frontend:**

-   `yarn dev`: Start the Vite development server.
-   `yarn build`: Build the application for production.
-   `yarn preview`: Serve the production build locally.
-   `yarn test:unit`: Run unit tests with Vitest.
-   `yarn test:e2e`: Run Cypress E2E tests headlessly.
-   `yarn test:e2e:open`: Open the Cypress test runner UI.

### Testing Strategy

-   **Backend Unit Tests**: `game.service.spec.ts` tests the core game logic in isolation, mocking Prisma and the `crypto` module to ensure predictable outcomes.
-   **Backend E2E Tests**: `app.e2e-spec.ts` makes live GraphQL requests to a running instance of the application connected to a test database, verifying the entire request/response flow.
-   **Frontend Unit Tests**: `Game.test.tsx` tests the main component's logic, mocking the `graphqlRequest` function to simulate API responses and verify that the UI reacts correctly. It uses fake timers to control animations.
-   **Frontend E2E Tests**: The `cypress/e2e` directory contains tests that run the entire application in a browser. `deterministic.cy.ts` uses `cy.intercept()` to mock GraphQL responses, allowing for testing specific win/loss/cashout scenarios without randomness.

***

## 5) Notes & Troubleshooting

-   **CORS**: The backend enables CORS for all origins by default. This can be configured in `tuplaus-backend/src/main.ts` for production environments.
-   **Port Conflicts**: Ensure ports `4000`, `5173`, `4173`, `

#### Iframe end-to-end: frontend ↔ backend

- **Load sequence**
  1. Host page (`test.html`) constructs the iframe `src` with query params: `http://localhost:4173/?playerId=<id>&apiUrl=http://localhost:4000/graphql`.
  2. Vite preview serves the SPA (`index.html`, JS, CSS). `src/main.tsx` bootstraps React and renders `App`.
  3. `App.tsx` parses `window.location.search` for `playerId` and `apiUrl` and calls the store `initialize(playerId, apiUrl)`.
  4. The `Game` screen uses TanStack Query to run `getOrCreatePlayer(id)` first, then queries `player(id)` to render the initial state and starts the entrance animations.

- **Play round (frontend → backend → frontend)**
  - UI decides `currentBet` (uses `activeWinnings` if present; otherwise the input bet).
  - Sends GraphQL: `playRound(playRoundInput: { playerId, bet, choice })`.
  - Backend (`GameService.playRound`):
    - Uses CSPRNG (`crypto.randomInt(1, 14)`) to draw a fair card.
    - Computes outcome and updates `Player` in Postgres via Prisma.
    - Logs a `GameRound` record (optional, useful for audit/analytics).
    - Returns `{ drawnCard, didWin, winnings, newBalance }`.
  - Frontend animates travel + flip, updates UI, then refetches `player(id)` to sync `balance` and `activeWinnings`.

- **Cash out**
  - Sends GraphQL: `cashOut(playerId)`.
  - Backend moves `activeWinnings → balance` and returns the updated `Player`.
  - Frontend refetches `player(id)` and resets the game state.

- **Persistence model**
  - `Player.id` comes from the iframe URL (`playerId`).
  - `getOrCreatePlayer` is idempotent: returns the existing row or creates a new player with a starting balance.

- **CORS and origins**
  - During preview: The SPA is served from `http://localhost:4173`. GraphQL lives at `http://localhost:4000`.
  - CORS on the backend must allow the SPA origin (e.g., `http://localhost:4173`) to permit cross-origin requests from inside the iframe.
  - The host page origin (`http://localhost:8080`) is not calling the API directly; it only embeds the iframe. So the critical CORS origin is the SPA’s origin, not the host page.

- **Configuration contract**
  - Required query params: `playerId` and `apiUrl`.
  - To change configuration dynamically, update the `src` of the iframe (the demo form in `test.html` does this by rebuilding the URL).

- **Error handling**
  - Network/CORS/GraphQL errors surface through the `ErrorBoundary` and `ErrorBanner` in the SPA.
  - Common issues:
    - Backend not running or migrations not applied → GraphQL 5xx/connection errors.
    - Wrong `apiUrl` or port busy → 4xx/connection refused.
    - CORS misconfigured (backend must allow `http://localhost:4173`).

- **Security notes**
  - If you need stronger isolation, you can add iframe `sandbox`/`allow` attributes and restrict backend CORS to exact origins.
  - The SPA reads only the two query params; it does not execute code from the host page.

- **Performance**
  - Animations are CSS-accelerated; network traffic is minimal (single GraphQL request per action + small player refetch).
  - React Query caches `player` briefly; a refetch is forced after mutations to keep the UI authoritative.