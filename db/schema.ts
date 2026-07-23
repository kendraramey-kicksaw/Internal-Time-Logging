import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
