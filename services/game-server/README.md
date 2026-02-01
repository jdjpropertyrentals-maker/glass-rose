Game Server (Provably-Fair slot stub)

This is a minimal demo game server to demonstrate provably-fair spins.

Endpoints
- GET /v1/games
- GET /v1/games/:id/server-seed-hash
- POST /v1/games/:id/spin  - body: { user_id, stake, client_seed }

Notes
- This server stores server seeds in memory for demo only. Persist seeds and nonce counters in a secure DB in production.
- After each spin the server reveals the seed used and rotates to a new secret; clients should verify the HMAC-derived result matches the returned symbols.
- Integrate with `services/api` ledger to debit bets and credit wins atomically.
