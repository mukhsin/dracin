> **STATUS: ✅ COMPLETED** (All tasks finished)

# Prefix Better-Auth Tables with 'auth\_'

## TL;DR

Update Better-Auth authentication tables to use 'auth\_' prefix for better organization and clarity:

- `accounts` → `auth_accounts`
- `sessions` → `auth_sessions`
- `verifications` → `auth_verifications`

**Estimated Effort:** Short
**Parallel Execution:** NO - Sequential
**Critical Path:** Schema update → Migration creation → Code verification

---

## Context

### Original Request

Better-Auth requires three tables for authentication:

1. **accounts** - Stores OAuth/account provider information
2. **sessions** - Stores user session tokens
3. **verifications** - Stores email/verification codes

Currently these tables don't have a prefix, making it unclear they are auth-related. Adding 'auth\_' prefix improves:

- **Organization** - All auth tables grouped together alphabetically
- **Clarity** - Immediate recognition of auth-related tables
- **Maintenance** - Easier to identify and manage auth data

---

## Work Objectives

### Core Objective

Rename all Better-Auth tables to use 'auth\_' prefix consistently.

### Concrete Deliverables

- Updated `apps/api/src/db/schema.ts` with new table names and index names
- New migration file to rename existing tables in database
- All index names updated to match new table names

### Definition of Done

- [x] Schema file updated with 'auth\_' prefixed table names
- [x] Index names updated to use 'auth\_' prefix
- [x] Migration file created for table renaming
- [x] Better-Auth configuration verified to work with new names

### Must Have

- All three auth tables renamed with 'auth\_' prefix
- All associated indexes renamed
- Migration script for existing databases

### Must NOT Have

- Changes to non-auth tables (users, dramas, episodes, watchlist, watchHistory)
- Data loss during migration
- Breaking changes to application logic

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (bun:test)
- **Automated tests**: Tests-after (verify after implementation)
- **Framework**: bun:test

### Agent-Executed QA Scenarios

**Scenario 1: Verify tables exist with correct names**

```
Tool: Bash (psql)
Preconditions: Database is running and migrations applied
Steps:
  1. Run: psql $DATABASE_URL -c "\dt auth_*"
  2. Assert: auth_accounts table exists
  3. Assert: auth_sessions table exists
  4. Assert: auth_verifications table exists
  5. Assert: Old table names (accounts, sessions, verifications) do not exist
Expected Result: Only auth-prefixed tables are present
Evidence: Terminal output showing table list
```

**Scenario 2: Verify indexes exist with correct names**

```
Tool: Bash (psql)
Preconditions: Database is running and migrations applied
Steps:
  1. Run: psql $DATABASE_URL -c "\di auth_*"
  2. Assert: auth_accounts_user_idx exists
  3. Assert: auth_accounts_provider_idx exists
  4. Assert: auth_sessions_user_idx exists
  5. Assert: auth_sessions_token_idx exists
  6. Assert: auth_verifications_identifier_idx exists
Expected Result: Only auth-prefixed indexes are present
Evidence: Terminal output showing index list
```

**Scenario 3: Test authentication flow**

```
Tool: Bash (curl)
Preconditions: API server running
Steps:
  1. POST /api/auth/sign-up/email with test user
  2. Assert: Response status is 200
  3. Assert: User created in database
  4. Assert: Session created in auth_sessions table
  5. POST /api/auth/sign-in/email with same credentials
  6. Assert: Response status is 200
  7. Assert: Set-Cookie header present
Expected Result: Authentication works with new table names
Evidence: Response outputs and database query results
```

---

## Execution Strategy

### Sequential Tasks

Task 1 depends on nothing → Task 2 depends on Task 1 → Task 3 depends on Task 2

Critical Path: Task 1 → Task 2 → Task 3

---

## TODOs

- [x] 1. Update schema.ts with 'auth\_' prefixed table names

  **What to do**:
  - Change table name from `"accounts"` to `"auth_accounts"`
  - Change table name from `"sessions"` to `"auth_sessions"`
  - Change table name from `"verifications"` to `"auth_verifications"`
  - Update all index names to use 'auth\_' prefix:
    - `accounts_user_idx` → `auth_accounts_user_idx`
    - `accounts_provider_idx` → `auth_accounts_provider_idx`
    - `sessions_user_idx` → `auth_sessions_user_idx`
    - `sessions_token_idx` → `auth_sessions_token_idx`
    - `verifications_identifier_idx` → `auth_verifications_identifier_idx`

  **Must NOT do**:
  - Change any column names
  - Modify table structure
  - Change non-auth tables

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`drizzle-orm-d1`]
  - Reason: Simple find-and-replace operation in schema file

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `apps/api/src/db/schema.ts` lines 240-317 - Better-Auth table definitions
  - Official Better-Auth docs for table structure reference

  **Acceptance Criteria**:
  - [ ] All three table names updated to use 'auth\_' prefix
  - [ ] All five index names updated to use 'auth\_' prefix
  - [ ] Schema file has no remaining references to old table names

  **Evidence to Capture**:
  - [ ] Screenshot or file diff showing changes to schema.ts

  **Commit**: YES
  - Message: `refactor(db): prefix auth tables with 'auth_'`
  - Files: `apps/api/src/db/schema.ts`

---

- [x] 2. Create migration file for renaming existing tables

  **What to do**:
  - Create new migration file in `apps/api/drizzle/migrations/`
  - Migration should rename existing tables:
    - `accounts` → `auth_accounts`
    - `sessions` → `auth_sessions`
    - `verifications` → `auth_verifications`
  - Rename indexes accordingly
  - Handle foreign key constraints properly

  **Migration SQL Structure**:

  ```sql
  -- Rename tables
  ALTER TABLE accounts RENAME TO auth_accounts;
  ALTER TABLE sessions RENAME TO auth_sessions;
  ALTER TABLE verifications RENAME TO auth_verifications;

  -- Rename indexes (PostgreSQL automatically updates some, but explicit is safer)
  ALTER INDEX accounts_user_idx RENAME TO auth_accounts_user_idx;
  ALTER INDEX accounts_provider_idx RENAME TO auth_accounts_provider_idx;
  ALTER INDEX sessions_user_idx RENAME TO auth_sessions_user_idx;
  ALTER INDEX sessions_token_idx RENAME TO auth_sessions_token_idx;
  ALTER INDEX verifications_identifier_idx RENAME TO auth_verifications_identifier_idx;
  ```

  **Must NOT do**:
  - Drop and recreate tables (would lose data)
  - Modify column definitions
  - Break foreign key relationships

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`drizzle-orm-d1`, `drizzle-kit`]
  - Reason: Requires understanding of Drizzle migrations and PostgreSQL ALTER commands

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `apps/api/drizzle/migrations/` - Existing migration files
  - Drizzle Kit documentation for migration naming conventions
  - PostgreSQL documentation for ALTER TABLE RENAME

  **Acceptance Criteria**:
  - [ ] Migration file created with sequential number (e.g., `0002_prefix_auth_tables.sql`)
  - [ ] Migration renames all three tables
  - [ ] Migration renames all five indexes
  - [ ] Migration is idempotent (safe to run multiple times)

  **Evidence to Capture**:
  - [ ] Migration file content
  - [ ] Test run showing migration applies successfully

  **Commit**: YES (groups with Task 1)

---

- [x] 3. Verify authentication functionality

  **What to do**:
  - Run database migrations
  - Start API server
  - Test user registration
  - Test user login
  - Verify sessions are created in auth_sessions table
  - Verify no errors in Better-Auth operations

  **Test Steps**:
  1. Run migration: `bun run db:migrate`
  2. Start API: `bun run dev` (in apps/api)
  3. Test sign-up:
     ```bash
     curl -X POST http://localhost:3001/api/auth/sign-up/email \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"TestPass123!","name":"Test"}'
     ```
  4. Test sign-in:
     ```bash
     curl -X POST http://localhost:3001/api/auth/sign-in/email \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"TestPass123!"}'
     ```
  5. Verify in database:
     ```sql
     SELECT * FROM auth_sessions;
     SELECT * FROM auth_accounts;
     ```

  **Must NOT do**:
  - Skip testing authentication flow
  - Assume it works without verification

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`hono-routing`]
  - Reason: Testing API endpoints and database state

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None (final task)
  - **Blocked By**: Task 2

  **References**:
  - `apps/api/src/routes/auth.ts` - Auth routes (if any custom ones exist)
  - Better-Auth documentation for default endpoints

  **Acceptance Criteria**:
  - [ ] Migration runs successfully without errors
  - [ ] User registration works
  - [ ] User login works
  - [ ] Sessions stored in auth_sessions table
  - [ ] No console errors from Better-Auth

  **Evidence to Capture**:
  - [ ] Screenshot of successful API responses
  - [ ] Database query results showing auth tables

  **Commit**: NO (verification only)

---

## Commit Strategy

| Task | Message                                         | Files                     |
| ---- | ----------------------------------------------- | ------------------------- |
| 1+2  | `refactor(db): prefix auth tables with 'auth_'` | schema.ts, migration file |

---

## Success Criteria

### Verification Commands

```bash
# Check tables exist with correct names
psql $DATABASE_URL -c "\dt auth_*"

# Expected output:
#  Schema |       Name        | Type  | Owner
# --------+-------------------+-------+-------
#  public | auth_accounts     | table | user
#  public | auth_sessions     | table | user
#  public | auth_verifications| table | user

# Check indexes
psql $DATABASE_URL -c "\di auth_*"

# Expected output includes:
#  auth_accounts_user_idx
#  auth_accounts_provider_idx
#  auth_sessions_user_idx
#  auth_sessions_token_idx
#  auth_verifications_identifier_idx

# Test auth flow
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
# Expected: 200 OK with user object
```

### Final Checklist

- [x] All auth tables renamed with 'auth\_' prefix
- [x] All indexes renamed with 'auth\_' prefix
- [x] Migration file created and tested
- [x] Authentication flows work correctly
- [x] No data loss occurred
- [x] Application starts without errors

---

## Notes

**Important Considerations:**

1. **Better-Auth Configuration**: Better-Auth automatically detects table names from the schema. As long as the Drizzle schema is updated, Better-Auth should work without additional configuration changes.

2. **Existing Data**: The migration uses `ALTER TABLE RENAME` which preserves all data and foreign key relationships.

3. **Rollback Plan**: If issues occur, you can rollback by:

   ```sql
   ALTER TABLE auth_accounts RENAME TO accounts;
   ALTER TABLE auth_sessions RENAME TO sessions;
   ALTER TABLE auth_verifications RENAME TO verifications;
   ```

4. **Downstream Effects**: This change only affects the database layer. The application code uses Drizzle ORM which abstracts table names, so no application code changes are needed (assuming proper Drizzle usage).

5. **Concurrent Users**: If deploying to production, consider:
   - Running migration during low-traffic period
   - Brief maintenance window if necessary
   - The rename operation is fast but locks tables momentarily
