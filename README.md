# Tuplaus Game Project

This project is a full-stack implementation of the Finnish card game "Tuplaus". It includes a NestJS GraphQL backend, a React frontend (built as a Web Component), and a PostgreSQL database managed with Docker.

## Project Structure

- `/tuplaus-backend`: The NestJS + GraphQL + Prisma backend application.
- `/tuplaus-frontend`: The React + Vite + TypeScript frontend application.
- `docker-compose.yml`: Defines the PostgreSQL database service.

## Step 1: Running the System Locally

### Prerequisites

- Node.js (v18 or higher recommended)
- npm
- Docker and Docker Compose

### A. Start the Database

From the root of the project, run the following command to start the PostgreSQL database in a Docker container:

```bash
docker-compose up -d
```

### B. Start the Backend

1.  **Navigate to the backend directory:**
    ```bash
    cd tuplaus-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    The backend will be available at `http://localhost:4000`. The GraphQL Playground will be at `http://localhost:4000/graphql`.
    ```bash
    npm run start:dev
    ```

### C. Start the Frontend

1.  **Navigate to the frontend directory:**
    ```bash
    cd tuplaus-frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    The frontend demo page will be available at `http://localhost:5173` (or the next available port).
    ```bash
    npm run dev
    ```

## Step 2: Running Tests

### A. Backend Tests

To run the backend end-to-end tests, navigate to the `/tuplaus-backend` directory and run:

```bash
npm run test:e2e
```

### B. Frontend Tests

To run the frontend unit tests with Vitest, navigate to the `/tuplaus-frontend` directory and run:

```bash
npm run test
```

### C. Frontend E2E Tests (Cypress)

To run the end-to-end tests with Cypress:

1.  Make sure the backend and frontend development servers are both running.
2.  Navigate to the `/tuplaus-frontend` directory.
3.  Open the Cypress test runner:
    ```bash
    npx cypress open
    ```
4.  Click on the `game.cy.js` spec to run the tests.

## Step 3: Using the Web Component

The frontend is built into a distributable web component.

1.  **Build the component:**
    From the `/tuplaus-frontend` directory, run:
    ```bash
    npm run build
    ```
    This generates the necessary files in the `/tuplaus-frontend/dist` directory.

2.  **Use in any HTML file:**
    You can now use the `<tuplaus-game>` tag in any HTML page by including the generated JavaScript file. See `tuplaus-frontend/index.html` for a usage example.
