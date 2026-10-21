import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { UndoData } from "@/lib/undo-data";

/**
 * Multi-tenant CMS schema.
 * Every content table (pages, blocks, posts, services, seo_meta, media, api_keys)
 * is scoped by siteId so a single database can serve many customer sites.
 */

// ---------------------------------------------------------------------------
// sites
// ---------------------------------------------------------------------------
export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  domain: text("domain"),
  // Optional ISR/on-demand revalidation webhook for the site's frontend.
  revalidateUrl: text("revalidate_url"),
  revalidateSecret: text("revalidate_secret"),
  // Who created the site (null for sites seeded before self-service existed).
  createdByUserId: uuid("created_by_user_id"),
  // Last successful schema sync from the customer site (POST /api/v1/sites/[slug]/schema).
  lastSchemaSyncAt: timestamp("last_schema_sync_at", { withTimezone: true }),
  // Last connection check from the integration page: 'ok' | 'failed' | null.
  lastConnectionStatus: text("last_connection_status"),
  lastConnectionCheckedAt: timestamp("last_connection_checked_at", { withTimezone: true }),
  // Outcome of the latest revalidate webhook (content save or "Testa
  // anslutningen"): 'ok' | 'failed' | null (never sent). See lib/revalidate.ts.
  lastWebhookStatus: text("last_webhook_status"),
  lastWebhookAt: timestamp("last_webhook_at", { withTimezone: true }),
  // Short Swedish description of why the latest webhook failed (null when ok).
  lastWebhookError: text("last_webhook_error"),
  // Where new quote requests (offertförfrågningar) are e-mailed. Null = the
  // request is only stored and listed in the panel.
  notifyEmail: text("notify_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("sites_slug_idx").on(table.slug),
]);

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const roleEnumValues = ["admin", "customer"] as const;
export type Role = (typeof roleEnumValues)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  // Null until the user has chosen a password (invited users, Google-only accounts).
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  // 'admin' manages every tenant; 'customer' is scoped via memberships
  // (memberships.role decides owner vs editor per site).
  role: text("role", { enum: roleEnumValues }).notNull().default("customer"),
  // Set when the address has been confirmed (verification link, accepted invite, Google).
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  // First-touch attribution captured on the visitor's first page view
  // (lib/attribution.ts): e.g. "google", "utm:linkedin", "direkt", "ref:example.com".
  signupSource: text("signup_source"),
  // The first public page the visitor landed on, e.g. "/guider/andra-text-pa-hemsidan".
  signupLanding: text("signup_landing"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("users_email_idx").on(table.email),
]);

// ---------------------------------------------------------------------------
// memberships (links a user to a site they may manage)
// ---------------------------------------------------------------------------
export const membershipRoleEnumValues = ["owner", "editor"] as const;
export type MembershipRole = (typeof membershipRoleEnumValues)[number];

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  // 'owner' manages settings, integration, members and structure; 'editor' edits content.
  role: text("role", { enum: membershipRoleEnumValues }).notNull().default("editor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("memberships_user_site_idx").on(table.userId, table.siteId),
]);

// ---------------------------------------------------------------------------
// pages
// ---------------------------------------------------------------------------
export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  // One line shown under the page title in the editor (from schema sync).
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("pages_site_slug_idx").on(table.siteId, table.slug),
]);

// ---------------------------------------------------------------------------
// blocks (key/value content blocks belonging to a page, e.g. 'hero.title')
// ---------------------------------------------------------------------------
export const blockTypeEnumValues = ["text", "richtext", "image"] as const;
export type BlockType = (typeof blockTypeEnumValues)[number];

export const blocks = pgTable("blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  type: text("type", { enum: blockTypeEnumValues }).notNull().default("text"),
  // For type 'image' this holds the media URL; otherwise plain/rich text content.
  value: text("value"),
  // Alt text for type 'image': what the picture shows, for screen readers and
  // search engines. Null/empty means the image is decorative.
  alt: text("alt"),
  // Editor label/help text, usually set by the customer site's schema sync.
  // Null falls back to components/admin/labels.ts.
  label: text("label"),
  help: text("help"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("blocks_page_key_idx").on(table.pageId, table.key),
]);

// ---------------------------------------------------------------------------
// posts
// ---------------------------------------------------------------------------
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  body: text("body"), // markdown
  coverImage: text("cover_image"),
  // Alt text for the cover image (accessibility + SEO).
  coverImageAlt: text("cover_image_alt"),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("posts_site_slug_idx").on(table.siteId, table.slug),
]);

// ---------------------------------------------------------------------------
// services
// ---------------------------------------------------------------------------
export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  price: text("price"),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// seo_meta
// ---------------------------------------------------------------------------
export const seoMeta = pgTable("seo_meta", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  pageSlug: text("page_slug").notNull(),
  title: text("title"),
  description: text("description"),
  ogImage: text("og_image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("seo_meta_site_page_idx").on(table.siteId, table.pageSlug),
]);

// ---------------------------------------------------------------------------
// media
// ---------------------------------------------------------------------------
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type"),
  size: integer("size"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// api_keys
// ---------------------------------------------------------------------------
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  // Klartexten lagras aldrig — bara SHA-256 för uppslag och de fyra sista
  // tecknen för att kunna känna igen nyckeln (se lib/api-keys.ts).
  keyHash: text("key_hash").notNull(),
  keyHint: text("key_hint").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("api_keys_key_hash_idx").on(table.keyHash),
]);

// ---------------------------------------------------------------------------
// auth_tokens (one-time links sent by e-mail: verify, reset, invite)
// ---------------------------------------------------------------------------
export const authTokenTypeEnumValues = ["verify", "reset", "invite"] as const;
export type AuthTokenType = (typeof authTokenTypeEnumValues)[number];

export const authTokens = pgTable("auth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  // The raw token only ever lives in the e-mail link; we store its sha256.
  tokenHash: text("token_hash").notNull(),
  type: text("type", { enum: authTokenTypeEnumValues }).notNull(),
  // Target user (verify/reset) or invited user row (invite).
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  // For invites: which site and which membership role is granted on accept.
  siteId: uuid("site_id").references(() => sites.id, { onDelete: "cascade" }),
  membershipRole: text("membership_role", { enum: membershipRoleEnumValues }),
  invitedByUserId: uuid("invited_by_user_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("auth_tokens_hash_idx").on(table.tokenHash),
]);

// ---------------------------------------------------------------------------
// audit_logs
// ---------------------------------------------------------------------------
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  siteId: uuid("site_id").references(() => sites.id, { onDelete: "cascade" }),
  // Machine-readable action key, e.g. 'blocks.update', 'posts.publish'.
  action: text("action").notNull(),
  // Human-readable (Swedish) summary shown in the activity log UI.
  detail: text("detail"),
  // Snapshot of the previous state, captured before the change was written.
  // Present only on entries that can be undone (see lib/undo-data.ts).
  undoData: jsonb("undo_data").$type<UndoData>(),
  // Set when the entry has been undone, so it can only be undone once.
  undoneAt: timestamp("undone_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// quote_requests (offertförfrågningar from a customer site's form)
// ---------------------------------------------------------------------------
export const quoteStatusValues = ["ny", "besvarad", "arkiverad"] as const;
export type QuoteStatus = (typeof quoteStatusValues)[number];

export const quoteEmailStatusValues = ["sent", "failed", "skipped"] as const;
export type QuoteEmailStatus = (typeof quoteEmailStatusValues)[number];

export const quoteRequests = pgTable("quote_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  status: text("status", { enum: quoteStatusValues }).notNull().default("ny"),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  jobType: text("job_type").notNull(),
  machine: text("machine"),
  location: text("location"),
  // ISO date (YYYY-MM-DD) the customer would like to start, if given.
  desiredStart: text("desired_start"),
  description: text("description").notNull(),
  consent: boolean("consent").notNull().default(false),
  // Salted SHA-256 of the sender's IP — used for rate limiting only.
  ipHash: text("ip_hash"),
  // Outcome of the notification e-mails; the request is stored regardless.
  emailStatus: text("email_status", { enum: quoteEmailStatusValues }).notNull().default("skipped"),
  emailError: text("email_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("quote_requests_site_created_idx").on(table.siteId, table.createdAt),
]);

// ---------------------------------------------------------------------------
// relations
// ---------------------------------------------------------------------------
export const sitesRelations = relations(sites, ({ many }) => ({
  memberships: many(memberships),
  pages: many(pages),
  blocks: many(blocks),
  posts: many(posts),
  services: many(services),
  seoMeta: many(seoMeta),
  media: many(media),
  apiKeys: many(apiKeys),
  auditLogs: many(auditLogs),
  quoteRequests: many(quoteRequests),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  authTokens: many(authTokens),
}));

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, { fields: [authTokens.userId], references: [users.id] }),
  site: one(sites, { fields: [authTokens.siteId], references: [sites.id] }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  site: one(sites, { fields: [memberships.siteId], references: [sites.id] }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  site: one(sites, { fields: [pages.siteId], references: [sites.id] }),
  blocks: many(blocks),
}));

export const blocksRelations = relations(blocks, ({ one }) => ({
  page: one(pages, { fields: [blocks.pageId], references: [pages.id] }),
  site: one(sites, { fields: [blocks.siteId], references: [sites.id] }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  site: one(sites, { fields: [posts.siteId], references: [sites.id] }),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  site: one(sites, { fields: [services.siteId], references: [sites.id] }),
}));

export const seoMetaRelations = relations(seoMeta, ({ one }) => ({
  site: one(sites, { fields: [seoMeta.siteId], references: [sites.id] }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  site: one(sites, { fields: [media.siteId], references: [sites.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  site: one(sites, { fields: [apiKeys.siteId], references: [sites.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  site: one(sites, { fields: [auditLogs.siteId], references: [sites.id] }),
}));

export const quoteRequestsRelations = relations(quoteRequests, ({ one }) => ({
  site: one(sites, { fields: [quoteRequests.siteId], references: [sites.id] }),
}));
