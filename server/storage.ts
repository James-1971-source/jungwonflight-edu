import { 
  users, categories, videos, userProgress, userNotes,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Video, type InsertVideo,
  type UserProgress, type InsertUserProgress,
  type UserNote, type InsertUserNote
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Videos
  getVideos(): Promise<Video[]>;
  getVideosByCategory(categoryId: number): Promise<Video[]>;
  getVideo(id: number): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, updates: Partial<InsertVideo>): Promise<Video | undefined>;
  deleteVideo(id: number): Promise<boolean>;

  // User Progress
  getUserProgress(userId: number): Promise<UserProgress[]>;
  getVideoProgress(userId: number, videoId: number): Promise<UserProgress | undefined>;
  updateProgress(userId: number, videoId: number, progress: Partial<InsertUserProgress>): Promise<UserProgress>;

  // User Notes
  getUserNotes(userId: number, videoId: number): Promise<UserNote[]>;
  createNote(note: InsertUserNote): Promise<UserNote>;
  updateNote(id: number, content: string): Promise<UserNote | undefined>;
  deleteNote(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  // Videos
  async getVideos(): Promise<Video[]> {
    return await db.select().from(videos).orderBy(desc(videos.createdAt));
  }

  async getVideosByCategory(categoryId: number): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .where(eq(videos.categoryId, categoryId))
      .orderBy(desc(videos.createdAt));
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video || undefined;
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await db
      .insert(videos)
      .values(video)
      .returning();
    return newVideo;
  }

  async updateVideo(id: number, updates: Partial<InsertVideo>): Promise<Video | undefined> {
    const [video] = await db
      .update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();
    return video || undefined;
  }

  async deleteVideo(id: number): Promise<boolean> {
    const result = await db.delete(videos).where(eq(videos.id, id));
    return result.rowCount > 0;
  }

  // User Progress
  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
  }

  async getVideoProgress(userId: number, videoId: number): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.videoId, videoId)));
    return progress || undefined;
  }

  async updateProgress(userId: number, videoId: number, progress: Partial<InsertUserProgress>): Promise<UserProgress> {
    const existing = await this.getVideoProgress(userId, videoId);

    if (existing) {
      const [updated] = await db
        .update(userProgress)
        .set({ ...progress, lastWatchedAt: new Date() })
        .where(and(eq(userProgress.userId, userId), eq(userProgress.videoId, videoId)))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userProgress)
        .values({ userId, videoId, ...progress })
        .returning();
      return created;
    }
  }

  // User Notes
  async getUserNotes(userId: number, videoId: number): Promise<UserNote[]> {
    return await db
      .select()
      .from(userNotes)
      .where(and(eq(userNotes.userId, userId), eq(userNotes.videoId, videoId)))
      .orderBy(desc(userNotes.createdAt));
  }

  async createNote(note: InsertUserNote): Promise<UserNote> {
    const [newNote] = await db
      .insert(userNotes)
      .values(note)
      .returning();
    return newNote;
  }

  async updateNote(id: number, content: string): Promise<UserNote | undefined> {
    const [note] = await db
      .update(userNotes)
      .set({ content, updatedAt: new Date() })
      .where(eq(userNotes.id, id))
      .returning();
    return note || undefined;
  }

  async deleteNote(id: number): Promise<boolean> {
    const result = await db.delete(userNotes).where(eq(userNotes.id, id));
    return result.rowCount > 0;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserByRole(role: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.role, role));
    return user || undefined;
  }
}

export const storage = new DatabaseStorage();