# Better Auth Schema Implementation Plan

> **STATUS: ✅ COMPLETED** (All tasks finished)

## Overview

Implement Better Auth tables with `auth_` prefix for consistency and separation of concerns.

## Changes Required

### 1. Update `apps/api/src/db/schema.ts`

Add new Better Auth tables with `auth_` prefix:

```typescript
// Better Auth Tables (prefixed with auth_)

export const authUsers = pgTable(
  "auth_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    name: text("name"),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: uniqueIndex("auth_users_email_idx").on(table.email),
  }),
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => ({
    tokenIdx: uniqueIndex("auth_sessions_token_idx").on(table.token),
    userIdIdx: index("auth_sessions_user_id_idx").on(table.userId),
  }),
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userProviderIdx: uniqueIndex("auth_accounts_user_provider_idx").on(
      table.userId,
      table.providerId,
    ),
    userIdIdx: index("auth_accounts_user_id_idx").on(table.userId),
  }),
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    identifierIdx: index("auth_verifications_identifier_idx").on(
      table.identifier,
    ),
  }),
);
```

### 2. Update `apps/api/src/lib/auth.ts`

Add `modelName` mappings to map Better Auth's expected table names to our prefixed tables:

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
    usePlural: true,
  }),
  // Map Better Auth table names to our prefixed tables
  user: {
    modelName: "auth_users",
  },
  session: {
    modelName: "auth_sessions",
  },
  account: {
    modelName: "auth_accounts",
  },
  verification: {
    modelName: "auth_verifications",
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  // ... rest of config
});
```

### 3. Create Migration

Generate a new migration to create the auth tables:

```bash
cd apps/api
bun run db:generate
```

### 4. Update Foreign Key References

Update `watchlist` and `watchHistory` tables to reference `authUsers` instead of `users`:

```typescript
// In watchlist table:
userId: uuid("user_id")
  .notNull()
  .references(() => authUsers.id, { onDelete: "cascade" }),

// In watchHistory table:
userId: uuid("user_id")
  .notNull()
  .references(() => authUsers.id, { onDelete: "cascade" }),
```

### 5. Update Relations

Update relations to use `authUsers`:

```typescript
export const authUsersRelations = relations(authUsers, ({ many }) => ({
  sessions: many(authSessions),
  accounts: many(authAccounts),
  watchlist: many(watchlist),
  watchHistory: many(watchHistory),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(authUsers, {
    fields: [watchlist.userId],
    references: [authUsers.id],
  }),
  drama: one(dramas, {
    fields: [watchlist.dramaId],
    references: [dramas.id],
  }),
}));

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  user: one(authUsers, {
    fields: [watchHistory.userId],
    references: [authUsers.id],
  }),
  episode: one(episodes, {
    fields: [watchHistory.episodeId],
    references: [episodes.id],
  }),
}));
```

### 6. Update Type Exports

Add exports for new auth types:

```typescript
export type AuthUser = typeof authUsers.$inferSelect;
export type NewAuthUser = typeof authUsers.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;
export type AuthAccount = typeof authAccounts.$inferSelect;
export type AuthVerification = typeof authVerifications.$inferSelect;
```

### 7. Run Migration

```bash
cd apps/api
bun run db:migrate
```

### 8. Update Services

Update services that reference `users` to use `authUsers`:

- `watchlist.service.ts`
- `history.service.ts`

## Migration Strategy

1. **Phase 1**: Create new auth tables alongside existing `users` table
2. **Phase 2**: Migrate data from `users` to `auth_users` (if needed)
3. **Phase 3**: Update foreign key references
4. **Phase 4**: Drop old `users` table

## Testing

After implementation, run tests to verify:

```bash
cd apps/api
bun test src/test/history.test.ts src/test/watchlist.test.ts
```

## Success Criteria

- [x] All Better Auth tables created with `auth_` prefix
- [x] Better Auth configured with `modelName` mappings
- [x] Foreign keys updated to reference `auth_users`
- [x] Relations updated
- [x] Migration runs successfully
- [x] Tests pass
