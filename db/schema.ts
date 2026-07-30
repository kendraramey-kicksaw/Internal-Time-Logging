import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const oauthConnections = sqliteTable(
  "oauth_connections",
  {
    userEmail: text("user_email").notNull(),
    provider: text("provider").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: integer("token_expires_at"),
    instanceUrl: text("instance_url"),
    externalUserId: text("external_user_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userEmail, table.provider] })],
);

export const setupInstallations = sqliteTable(
  "setup_installations",
  {
    installId: text("install_id").primaryKey(),
    userHash: text("user_hash"),
    emailDomain: text("email_domain"),
    appVersion: text("app_version"),
    source: text("source"),
    localMode: integer("local_mode").notNull().default(1),
    firstSeenAt: text("first_seen_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    checkinCount: integer("checkin_count").notNull().default(1),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("setup_installations_user_hash_idx").on(table.userHash),
    index("setup_installations_last_seen_idx").on(table.lastSeenAt),
  ],
);
