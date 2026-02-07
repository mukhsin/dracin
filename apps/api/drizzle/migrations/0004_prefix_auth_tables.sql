ALTER TABLE IF EXISTS accounts RENAME TO auth_accounts;
ALTER TABLE IF EXISTS sessions RENAME TO auth_sessions;
ALTER TABLE IF EXISTS verifications RENAME TO auth_verifications;

ALTER INDEX IF EXISTS accounts_user_idx RENAME TO auth_accounts_user_idx;
ALTER INDEX IF EXISTS accounts_provider_idx RENAME TO auth_accounts_provider_idx;
ALTER INDEX IF EXISTS sessions_user_idx RENAME TO auth_sessions_user_idx;
ALTER INDEX IF EXISTS sessions_token_idx RENAME TO auth_sessions_token_idx;
ALTER INDEX IF EXISTS verifications_identifier_idx RENAME TO auth_verifications_identifier_idx;
