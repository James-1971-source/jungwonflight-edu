import { sqliteTable, text, integer, blob, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("student"),
  isApproved: integer("is_approved", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const videos = sqliteTable("videos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  googleDriveFileId: text("google_drive_file_id"), // nullable로 변경
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  categoryId: integer("category_id").references(() => categories.id),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const userProgress = sqliteTable("user_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  videoId: integer("video_id").references(() => videos.id).notNull(),
  watchedDuration: integer("watched_duration").default(0),
  completed: integer("completed", { mode: "boolean" }).default(false),
  lastWatchedAt: integer("last_watched_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const userNotes = sqliteTable("user_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  videoId: integer("video_id").references(() => videos.id).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Relations (동일하게 유지)
export const usersRelations = relations(users, ({ many }) => ({
  uploadedVideos: many(videos),
  progress: many(userProgress),
  notes: many(userNotes),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  videos: many(videos),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  category: one(categories, {
    fields: [videos.categoryId],
    references: [categories.id],
  }),
  uploader: one(users, {
    fields: [videos.uploadedBy],
    references: [users.id],
  }),
  progress: many(userProgress),
  notes: many(userNotes),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [userProgress.videoId],
    references: [videos.id],
  }),
}));

export const userNotesRelations = relations(userNotes, ({ one }) => ({
  user: one(users, {
    fields: [userNotes.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [userNotes.videoId],
    references: [videos.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  lastWatchedAt: true,
});

export const insertUserNoteSchema = createInsertSchema(userNotes).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserNote = typeof userNotes.$inferSelect;
export type InsertUserNote = z.infer<typeof insertUserNoteSchema>;