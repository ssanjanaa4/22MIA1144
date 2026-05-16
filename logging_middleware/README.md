# Logging Middleware (TypeScript)

Simple reusable logging middleware and client for sending logs to an evaluation API. Designed for learning and small backend projects.

Setup

1. Copy `.env.example` to `.env` and set `BASE_URL`, `AUTH_USER`, `AUTH_PASS`.
2. Install dependencies and build:

```bash
cd logging_middleware
npm install
npm run build
```

Usage

Import the `Log` function and call it from your server code:

```ts
import { Log } from './dist';

// Example usage inside an async function
async function example() {
	await Log('backend', 'error', 'service', 'Database connection failed');
}

example().catch(err => { /* handle error */ });
```

This library validates inputs, fetches a bearer token from `/evaluation-service/auth`, and POSTs the log to `/evaluation-service/logs`.
