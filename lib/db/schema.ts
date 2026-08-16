import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
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
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  // 'admin' manages every tenant; 'customer' is scoped via memberships.
  role: text("role", { enum: roleEnumValues }).notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("users_email_idx").on(table.email),
]);

// ---------------------------------------------------------------------------
// memberships (links a customer user to the one site they manage)
// ---------------------------------------------------------------------------
export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
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
  key: text("key").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("api_keys_key_idx").on(table.key),
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
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
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
