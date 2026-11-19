# Endpoint aktif — milestone arus kas

Total 39 method/path di /api/v1. GET / metadata tidak dihitung. Seluruh route keuangan memerlukan JWT; akses per role/owner mengikuti RANCANGAN.md.

| Method | Path |
|---|---|
| POST | `/api/v1/auth/register` |
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/refresh` |
| GET | `/api/v1/auth/refresh` |
| POST | `/api/v1/auth/logout` |
| GET | `/api/v1/auth/me` |
| GET | `/api/v1/auth/profile` |
| GET | `/api/v1/transactions/summary` |
| GET | `/api/v1/dashboard/summary` |
| GET | `/api/v1/transactions` |
| POST | `/api/v1/transactions` |
| GET | `/api/v1/transactions/:id/conversion` |
| GET | `/api/v1/categories/:id/transactions` |
| GET | `/api/v1/transactions/:id` |
| PUT | `/api/v1/transactions/:id` |
| PATCH | `/api/v1/transactions/:id` |
| DELETE | `/api/v1/transactions/:id` |
| GET | `/api/v1/users` |
| POST | `/api/v1/users` |
| GET | `/api/v1/users/:id/transactions` |
| GET | `/api/v1/users/:id/budgets` |
| GET | `/api/v1/users/:id/subscription-status` |
| GET | `/api/v1/users/:id` |
| PUT | `/api/v1/users/:id` |
| PATCH | `/api/v1/users/:id` |
| DELETE | `/api/v1/users/:id` |
| GET | `/api/v1/categories` |
| POST | `/api/v1/categories` |
| GET | `/api/v1/categories/:id` |
| PUT | `/api/v1/categories/:id` |
| PATCH | `/api/v1/categories/:id` |
| DELETE | `/api/v1/categories/:id` |
| GET | `/api/v1/budgets` |
| POST | `/api/v1/budgets` |
| GET | `/api/v1/budgets/:id/summary` |
| GET | `/api/v1/budgets/:id` |
| PUT | `/api/v1/budgets/:id` |
| PATCH | `/api/v1/budgets/:id` |
| DELETE | `/api/v1/budgets/:id` |

## Wallet dan AI — SOA-20261118-09

| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/token-wallet` | JWT |
| GET | `/api/v1/token-ledger` | JWT |
| POST | `/api/v1/ai/api-key` | JWT |
| POST | `/api/v1/ai/analyze` | JWT + API key owner + Idempotency-Key |
| GET | `/api/v1/ai/usages` | JWT + API key owner |
| GET | `/api/v1/ai/usage-summary` | JWT + API key owner |
| GET | `/api/v1/ai/wallet` | JWT + API key owner |
| GET | `/api/v1/ai/ledger` | JWT + API key owner |
| POST | `/api/v1/admin/ai/reconcile-expired` | JWT admin |
