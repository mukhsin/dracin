# Register api-proxy to Monorepo

> **STATUS: ✅ COMPLETED** (All tasks finished)

## TL;DR

> **Quick Summary**: Register the existing `@apps/api-proxy` to the Turborepo monorepo by aligning package naming with `@repo/*` convention and migrating hardcoded `PRIVATE_KEY` to environment variable.
>
> **Deliverables**:
>
> - Updated `apps/api-proxy/package.json` with `@repo/api-proxy` name and `dev` script
> - Updated `apps/api-proxy/index.js` with dotenv loading at startup
> - Updated `apps/api-proxy/EnvielToken.js` to read `PRIVATE_KEY` from `process.env`
> - Updated `turbo.json` with api-proxy specific configuration (port 3002)
>
> **Estimated Effort**: Quick (15-30 minutes)
> **Parallel Execution**: NO - sequential tasks with dependencies
> **Critical Path**: Task 1 → Task 2 → Task 3

---

## Context

### Original Request

User wants to:

1. Register the existing `@apps/api-proxy` (located at `apps/api-proxy/`) to the Turborepo monorepo
2. Update `EnvielToken.js` to read `PRIVATE_KEY` from `.env` file instead of hardcoded value

### Interview Summary

**Key Discussions**:

- Package currently named `@drama/api-proxy` but other apps use `@repo/*` convention
- `EnvielToken.js` has hardcoded `PRIVATE_KEY` at lines 5-7
- `.env.example` already exists with `PRIVATE_KEY` format
- `dotenv` is already in dependencies but not loaded

**Research Findings**:

- Other apps: `@repo/api`, `@repo/web`, `@repo/shared` follow consistent naming
- `api-proxy/index.js` defaults to port 3000 (conflicts with web app)
- `api-proxy` uses CommonJS (`require`) while other apps use ES modules
- `turbo.json` has generic tasks that may need api-proxy-specific configuration

### Metis Review

**Identified Gaps** (addressed):

- **Port conflict**: api-proxy and web both default to port 3000 → Will set api-proxy to port 3002
- **dotenv loading**: Not currently loaded before env access → Will add to top of index.js
- **Package naming**: Inconsistent with monorepo convention → Will rename to `@repo/api-proxy`
- **Dev script missing**: No `dev` script for turbo integration → Will add

---

## Work Objectives

### Core Objective

Register the api-proxy app to the Turborepo monorepo with consistent naming and environment variable configuration.

### Concrete Deliverables

- `apps/api-proxy/package.json` - Updated name and scripts
- `apps/api-proxy/index.js` - Added dotenv loading
- `apps/api-proxy/EnvielToken.js` - Updated to use `process.env.PRIVATE_KEY`
- `turbo.json` - Added api-proxy specific configuration

### Definition of Done

- [x] Package name is `@repo/api-proxy` (not `@drama/api-proxy`)
- [x] `bun run dev` from root starts api-proxy alongside other apps
- [x] `PRIVATE_KEY` is read from environment, not hardcoded
- [x] App fails gracefully with clear error if `PRIVATE_KEY` is missing
- [x] Port 3002 is used to avoid conflict with web app on 3000

### Must Have

- Package renamed to `@repo/api-proxy`
- `dev` script added to package.json
- dotenv loaded at startup in index.js
- PRIVATE_KEY read from process.env
- Port explicitly set to 3002

### Must NOT Have (Guardrails)

- MUST NOT: Convert api-proxy to TypeScript (out of scope)
- MUST NOT: Add new endpoints or features
- MUST NOT: Change PRIVATE_KEY value itself
- MUST NOT: Modify docker-compose.yml
- MUST NOT: Add tests for api-proxy
- MUST NOT: Change any business logic beyond env loading

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision

- **Infrastructure exists**: NO (no test framework in api-proxy)
- **Automated tests**: NO (out of scope)
- **Framework**: None

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type               | Tool            | How Agent Verifies                  |
| ------------------ | --------------- | ----------------------------------- |
| **Config/Package** | Bash (grep/cat) | Verify file contents match expected |
| **API/Backend**    | Bash (curl)     | Send requests, verify responses     |

---

## Execution Strategy

### Sequential Execution

```
Task 1: Update package.json
    ↓
Task 2: Add dotenv loading to index.js
    ↓
Task 3: Update EnvielToken.js to use env var
    ↓
Task 4: Update turbo.json configuration
```

**Critical Path**: Task 1 → Task 2 → Task 3 → Task 4

---

## TODOs

- [x] 1. Update apps/api-proxy/package.json

  **What to do**:
  - Change `"name"` from `"@drama/api-proxy"` to `"@repo/api-proxy"`
  - Add `"dev": "node index.js"` script for turbo integration
  - Add `"typecheck": "echo 'No TypeScript'"` placeholder (optional, for turbo consistency)

  **Must NOT do**:
  - Do not change any dependency versions
  - Do not add new dependencies
  - Do not remove existing scripts

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file edits, no complex logic
  - **Skills**: None needed
  - **Skills Evaluated but Omitted**:
    - `turborepo`: Not needed for simple package.json edit

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2, Task 3, Task 4
  - **Blocked By**: None (can start immediately)

  **References**:
  - `apps/api/package.json` - Reference for naming convention (@repo/api)
  - `apps/web/package.json` - Reference for naming convention (@repo/web)
  - `packages/shared/package.json` - Reference for naming convention (@repo/shared)

  **Acceptance Criteria**:
  - [ ] `cat apps/api-proxy/package.json | grep '"name"'` outputs `"@repo/api-proxy"`
  - [ ] `cat apps/api-proxy/package.json | grep '"dev"'` shows `"dev": "node index.js"`

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Verify package name change
    Tool: Bash (grep)
    Preconditions: File exists at apps/api-proxy/package.json
    Steps:
      1. Run: cat apps/api-proxy/package.json | grep '"name"'
      2. Assert: Output contains "@repo/api-proxy"
    Expected Result: Package name is @repo/api-proxy
    Evidence: Terminal output captured

  Scenario: Verify dev script added
    Tool: Bash (grep)
    Preconditions: File exists at apps/api-proxy/package.json
    Steps:
      1. Run: cat apps/api-proxy/package.json | grep '"dev"'
      2. Assert: Output contains "node index.js"
    Expected Result: Dev script is configured
    Evidence: Terminal output captured
  ```

  **Evidence to Capture**:
  - [ ] Screenshot or text capture of grep output showing @repo/api-proxy
  - [ ] Screenshot or text capture of grep output showing dev script

  **Commit**: YES
  - Message: `chore(api-proxy): rename package to @repo/api-proxy and add dev script`
  - Files: `apps/api-proxy/package.json`
  - Pre-commit: None (config change only)

---

- [x] 2. Add dotenv loading to apps/api-proxy/index.js

  **What to do**:
  - Add `require('dotenv').config()` as the FIRST line of index.js (before any other requires)
  - This ensures environment variables are loaded before any module tries to access them

  **Must NOT do**:
  - Do not add dotenv to dependencies (already present)
  - Do not change any other requires
  - Do not move existing code

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line addition at top of file
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `apps/api-proxy/index.js` - Current file content
  - `apps/api-proxy/package.json` - Shows dotenv already in dependencies

  **Acceptance Criteria**:
  - [ ] `head -1 apps/api-proxy/index.js` shows `require('dotenv').config()`
  - [ ] File still has all original requires after the dotenv line

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Verify dotenv is loaded first
    Tool: Bash (head/grep)
    Preconditions: File exists at apps/api-proxy/index.js
    Steps:
      1. Run: head -5 apps/api-proxy/index.js
      2. Assert: First non-empty line contains "require('dotenv').config()"
      3. Assert: Second line contains "express" require
    Expected Result: dotenv config is first, followed by other requires
    Evidence: Terminal output captured

  Scenario: Verify dotenv is in dependencies
    Tool: Bash (grep)
    Preconditions: package.json exists
    Steps:
      1. Run: cat apps/api-proxy/package.json | grep dotenv
      2. Assert: Output shows dotenv in dependencies
    Expected Result: dotenv package is available
    Evidence: Terminal output captured
  ```

  **Evidence to Capture**:
  - [ ] Terminal output of head -5 showing dotenv at top
  - [ ] Terminal output showing dotenv in dependencies

  **Commit**: YES
  - Message: `chore(api-proxy): load dotenv at startup`
  - Files: `apps/api-proxy/index.js`
  - Pre-commit: None

---

- [x] 3. Update apps/api-proxy/EnvielToken.js to use environment variable

  **What to do**:
  - Replace hardcoded `PRIVATE_KEY` constant (lines 5-7) with:
    ```javascript
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    if (!PRIVATE_KEY) {
      console.error("[FATAL] PRIVATE_KEY environment variable is required");
      process.exit(1);
    }
    ```
  - The validation ensures the app fails fast with a clear error message

  **Must NOT do**:
  - Do not change any other logic in the file
  - Do not change the getSignature function
  - Do not change the getNewToken function
  - Do not add new dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple variable replacement with validation
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 4
  - **Blocked By**: Task 2

  **References**:
  - `apps/api-proxy/EnvielToken.js` - Current file with hardcoded key
  - `apps/api-proxy/.env.example` - Shows expected PRIVATE_KEY format

  **Acceptance Criteria**:
  - [ ] `grep -n "process.env.PRIVATE_KEY" apps/api-proxy/EnvielToken.js` finds the variable
  - [ ] `grep -n "NAarxO" apps/api-proxy/EnvielToken.js` returns no matches (old key removed)
  - [ ] File contains validation that exits if PRIVATE_KEY is missing

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Verify PRIVATE_KEY uses env var
    Tool: Bash (grep)
    Preconditions: File exists at apps/api-proxy/EnvielToken.js
    Steps:
      1. Run: grep -n "process.env.PRIVATE_KEY" apps/api-proxy/EnvielToken.js
      2. Assert: At least one match found
      3. Assert: Match is on a line assigning to const PRIVATE_KEY
    Expected Result: PRIVATE_KEY is read from environment
    Evidence: Terminal output captured

  Scenario: Verify old hardcoded key is removed
    Tool: Bash (grep)
    Preconditions: File exists at apps/api-proxy/EnvielToken.js
    Steps:
      1. Run: grep -n "NAarxO" apps/api-proxy/EnvielToken.js
      2. Assert: Command returns no output (exit code 1)
    Expected Result: Hardcoded key is completely removed
    Evidence: Terminal output captured

  Scenario: Verify validation exists
    Tool: Bash (grep)
    Preconditions: File exists at apps/api-proxy/EnvielToken.js
    Steps:
      1. Run: grep -n "PRIVATE_KEY environment variable is required" apps/api-proxy/EnvielToken.js
      2. Assert: Match found
      3. Run: grep -n "process.exit(1)" apps/api-proxy/EnvielToken.js
      4. Assert: Match found near the error message
    Expected Result: App validates PRIVATE_KEY and exits if missing
    Evidence: Terminal output captured
  ```

  **Evidence to Capture**:
  - [ ] Terminal output showing process.env.PRIVATE_KEY usage
  - [ ] Terminal output showing NAarxO not found (key removed)
  - [ ] Terminal output showing validation exists

  **Commit**: YES
  - Message: `refactor(api-proxy): read PRIVATE_KEY from environment`
  - Files: `apps/api-proxy/EnvielToken.js`
  - Pre-commit: None

---

- [x] 4. Update turbo.json with api-proxy configuration

  **What to do**:
  - Add api-proxy specific environment variables to `globalEnv`:
    - `PORT` (for port configuration)
    - `PRIVATE_KEY` (for the token signing key)
  - Add `apps/api-proxy/**` to `globalDependencies` if not already covered
  - Consider adding a specific task for api-proxy if needed (generic `dev` task may suffice)

  **Current turbo.json analysis**:
  - Generic `dev` task with `cache: false, persistent: true` covers all apps
  - No api-proxy-specific env vars in `globalEnv`
  - Port 3002 should be set to avoid conflict with web on 3000

  **Must NOT do**:
  - Do not remove existing tasks
  - Do not change existing app configurations
  - Do not add unnecessary complexity

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple JSON configuration update
  - **Skills**: `turborepo`
    - Reason: Understanding turbo.json structure and env variable handling

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:
  - `turbo.json` - Current configuration
  - `apps/api-proxy/package.json` - Shows the app structure

  **Acceptance Criteria**:
  - [ ] `turbo.json` contains `PORT` in `globalEnv`
  - [ ] `turbo.json` contains `PRIVATE_KEY` in `globalEnv`
  - [ ] Running `bun run dev` from root starts api-proxy on port 3002

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Verify env vars in turbo.json
    Tool: Bash (cat/jq)
    Preconditions: turbo.json exists
    Steps:
      1. Run: cat turbo.json | jq '.globalEnv'
      2. Assert: Array contains "PORT"
      3. Assert: Array contains "PRIVATE_KEY"
    Expected Result: Both env vars are in globalEnv
    Evidence: Terminal output captured

  Scenario: Verify api-proxy starts with turbo
    Tool: Bash (timeout)
    Preconditions: All previous tasks complete, .env file exists with PRIVATE_KEY
    Steps:
      1. Create temporary .env in apps/api-proxy/ with PRIVATE_KEY=test-key
      2. Run: timeout 5 bun run dev --filter=api-proxy 2>&1 || true
      3. Assert: Output contains "Server running" or "localhost:3002"
    Expected Result: api-proxy starts successfully via turbo
    Evidence: Terminal output captured

  Scenario: Verify port configuration
    Tool: Bash (grep)
    Preconditions: turbo.json updated
    Steps:
      1. Run: cat turbo.json | grep -A5 '"dev"'
      2. Assert: Shows cache:false and persistent:true
    Expected Result: Dev task is properly configured
    Evidence: Terminal output captured
  ```

  **Evidence to Capture**:
  - [ ] Terminal output showing globalEnv contains PORT and PRIVATE_KEY
  - [ ] Terminal output showing api-proxy starts via turbo
  - [ ] Screenshot of turbo.json relevant section

  **Commit**: YES
  - Message: `chore(turbo): add api-proxy env vars to globalEnv`
  - Files: `turbo.json`
  - Pre-commit: None

---

## Commit Strategy

| After Task | Message                                                                  | Files                         | Verification                      |
| ---------- | ------------------------------------------------------------------------ | ----------------------------- | --------------------------------- |
| 1          | `chore(api-proxy): rename package to @repo/api-proxy and add dev script` | apps/api-proxy/package.json   | grep name, grep dev               |
| 2          | `chore(api-proxy): load dotenv at startup`                               | apps/api-proxy/index.js       | head -5                           |
| 3          | `refactor(api-proxy): read PRIVATE_KEY from environment`                 | apps/api-proxy/EnvielToken.js | grep process.env, grep -v NAarxO  |
| 4          | `chore(turbo): add api-proxy env vars to globalEnv`                      | turbo.json                    | cat turbo.json \| jq '.globalEnv' |

---

## Success Criteria

### Verification Commands

```bash
# 1. Verify package name change
cat apps/api-proxy/package.json | grep '"name"'
# Expected: "@repo/api-proxy"

# 2. Verify dev script exists
cat apps/api-proxy/package.json | grep '"dev"'
# Expected: "dev": "node index.js"

# 3. Verify dotenv is loaded first
head -1 apps/api-proxy/index.js
# Expected: require('dotenv').config()

# 4. Verify PRIVATE_KEY comes from env
grep -n "process.env.PRIVATE_KEY" apps/api-proxy/EnvielToken.js
# Expected: At least one match

# 5. Verify hardcoded key is removed
grep -n "NAarxO" apps/api-proxy/EnvielToken.js
# Expected: No matches (exit code 1)

# 6. Verify validation exists
grep -n "PRIVATE_KEY environment variable is required" apps/api-proxy/EnvielToken.js
# Expected: Match found

# 7. Verify turbo.json has env vars
cat turbo.json | jq '.globalEnv'
# Expected: Array contains "PORT" and "PRIVATE_KEY"

# 8. Test api-proxy starts (requires .env with PRIVATE_KEY)
cd apps/api-proxy && PRIVATE_KEY="test-key" timeout 3 node index.js 2>&1 || true
# Expected: "Server running on http://localhost:3002" or similar
```

### Final Checklist

- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] Package renamed to `@repo/api-proxy`
- [x] dotenv loaded at startup
- [x] PRIVATE_KEY read from environment
- [x] App validates PRIVATE_KEY and exits if missing
- [x] turbo.json updated with env vars
- [x] api-proxy starts successfully via `bun run dev`
