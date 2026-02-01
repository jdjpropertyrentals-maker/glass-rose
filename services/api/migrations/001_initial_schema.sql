-- Initial schema for Glass Rose (Postgres)

-- users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  salt TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  consent_flags JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- kyc_verifications
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_reference_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_verifications(user_id);

-- accounts (multiple currencies / internal credits)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  available_balance NUMERIC(18,8) NOT NULL DEFAULT 0,
  hold_balance NUMERIC(18,8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- ledger_transactions (append-only)
CREATE TABLE IF NOT EXISTS ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(18,8) NOT NULL,
  balance_before NUMERIC(18,8) NOT NULL,
  balance_after NUMERIC(18,8) NOT NULL,
  related_id UUID,
  related_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger_transactions(created_at);

-- deposits
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_charge_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC(18,8) NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  refunded BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);

-- withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  destination JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  amount NUMERIC(18,8) NOT NULL,
  currency TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  kyc_snapshot_id UUID
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);

-- games
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rtp NUMERIC(5,2) DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- game_results (immutable record of each play)
CREATE TABLE IF NOT EXISTS game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  user_id UUID REFERENCES users(id),
  server_seed_hash TEXT,
  server_seed_reveal TEXT,
  client_seed TEXT,
  nonce BIGINT,
  result_data JSONB DEFAULT '{}'::jsonb,
  payout NUMERIC(18,8) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_results_user ON game_results(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_game ON game_results(game_id);

-- audit_logs (append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  performed_by TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- sessions / devices
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  device_fingerprint TEXT,
  ip INET,
  ua TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Extensions: ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
