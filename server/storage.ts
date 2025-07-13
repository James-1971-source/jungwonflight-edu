import { 
  users, categories, videos, userProgress, userNotes, userCourses,
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
  getUserByRole(role: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  deleteUserProgress(userId: number): Promise<void>;
  deleteUserNotes(userId: number): Promise<void>;

  // My Courses
  getUserCourses(userId: number): Promise<Video[]>;
  addUserCourse(userId: number, videoId: number): Promise<void>;
  removeUserCourse(userId: number, videoId: number): Promise<void>;
  getUserCourseIds(userId: number): Promise<number[]>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteAllCategories(): Promise<void>;

  // Videos
  getVideos(): Promise<Video[]>;
  getVideosByCategory(categoryId: number): Promise<Video[]>;
  getVideo(id: number): Promise<Video | undefined>;
  getVideoByTitle(title: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, updates: Partial<InsertVideo>): Promise<Video | undefined>;
  deleteVideo(id: number): Promise<boolean>;

  // User Progress
  getUserProgress(userId: number): Promise<UserProgress[]>;
  getVideoProgress(userId: number, videoId: number): Promise<UserProgress | undefined>;
  updateProgress(userId: number, videoId: number, progress: Partial<InsertUserProgress>): Promise<UserProgress>;

  // User Notes
  getUserNotes(userId: number, videoId: number): Promise<UserNote[]>;
  getAllUserNotes(userId: number): Promise<UserNote[]>;
  createNote(userId: number, videoId: number, content: string): Promise<UserNote>;
  updateNote(id: number, content: string): Promise<UserNote | undefined>;
  deleteNote(id: number): Promise<boolean>;

  deleteAllVideos(): Promise<void>;

  deleteAllUserCourses(): Promise<void>;
  deleteAllUserProgress(): Promise<void>;
  deleteAllUserNotes(): Promise<void>;
}

// 클래스 바깥에 선언
function toSnakeCase(obj: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/([A-Z])/g, "_$1").toLowerCase(),
      v
    ])
  );
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

  async getUserByRole(role: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.role, role));
    return user || undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
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

  async deleteUser(id: number): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    // 삭제 후 실제로 존재하는지 재확인
    const user = await this.getUser(id);
    return !user;
  }

  async deleteUserProgress(userId: number): Promise<void> {
    await db.delete(userProgress).where(eq(userProgress.userId, userId));
  }

  async deleteUserNotes(userId: number): Promise<void> {
    await db.delete(userNotes).where(eq(userNotes.userId, userId));
  }

  // My Courses
  async getUserCourses(userId: number): Promise<Video[]> {
    const result = await db
      .select({ video: videos })
      .from(userCourses)
      .leftJoin(videos, eq(userCourses.videoId, videos.id))
      .where(eq(userCourses.userId, userId))
      .orderBy(desc(userCourses.createdAt));
    
    return result.map(r => r.video).filter((v): v is Video => v !== null);
  }

  async addUserCourse(userId: number, videoId: number): Promise<void> {
    await db.insert(userCourses).values({ userId, videoId }).onConflictDoNothing();
  }

  async removeUserCourse(userId: number, videoId: number): Promise<void> {
    await db.delete(userCourses).where(
      and(
        eq(userCourses.userId, userId),
        eq(userCourses.videoId, videoId)
      )
    );
  }

  async getUserCourseIds(userId: number): Promise<number[]> {
    const result = await db
      .select({ videoId: userCourses.videoId })
      .from(userCourses)
      .where(eq(userCourses.userId, userId));
    return result.map(r => r.videoId);
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async deleteAllCategories(): Promise<void> {
    await db.delete(categories).execute();
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

  async getVideoByTitle(title: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.title, title));
    return video || undefined;
  }

  private toSnakeCase(obj: Record<string, any>) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.replace(/([A-Z])/g, "_$1").toLowerCase(),
        v
      ])
    );
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    // id 필드가 있으면 무조건 제거
    if ('id' in video) {
      delete (video as any).id;
    }
    // undefined, id 필드 모두 제거 (2중 필터링)
    let cleanVideo = Object.fromEntries(
      Object.entries(video).filter(([k, v]) => k !== "id" && v !== undefined)
    );
    cleanVideo = toSnakeCase(cleanVideo); // ← snake_case 변환 추가
    
    // 쿼리 로그 출력
    const insertQuery = db.insert(videos).values(cleanVideo).returning();
    console.log('=== DRIZZLE INSERT QUERY DEBUG ===');
    console.log('Clean video data:', cleanVideo);
    console.log('Generated SQL:', insertQuery.toSQL());
    console.log('===================================');
    
    try {
      // 먼저 drizzle-orm으로 시도
      const result = await insertQuery;
      return result[0];
    } catch (error) {
      console.log('Drizzle ORM insert 실패, 직접 SQL로 시도:', error);
      
      // drizzle-orm이 실패하면 직접 SQL 사용
      const columns = Object.keys(cleanVideo);
      const values = Object.values(cleanVideo);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      const sql = `
        INSERT INTO videos (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      console.log('직접 SQL 쿼리:', sql);
      console.log('SQL 값들:', values);
      
      // 반드시 values를 두 번째 인자로 넘겨야 함!
      const result = await db.execute(sql, values);
      return result[0] as Video;
    }
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
    try {
      // 관련된 사용자 진도 데이터 먼저 삭제 (Foreign Key 제약조건)
      await db.delete(userProgress).where(eq(userProgress.videoId, id));
      console.log(`비디오 ${id}의 진도 데이터 삭제 완료`);
      
      // 관련된 사용자 노트 데이터 먼저 삭제 (Foreign Key 제약조건)
      await db.delete(userNotes).where(eq(userNotes.videoId, id));
      console.log(`비디오 ${id}의 노트 데이터 삭제 완료`);
      
      // 마지막으로 비디오 삭제
      const result = await db.delete(videos).where(eq(videos.id, id));
      console.log(`비디오 ${id} 삭제 완료`);
      
      return true;
    } catch (error) {
      console.error('동영상 삭제 중 데이터베이스 오류:', error);
      throw error;
    }
  }

  async deleteAllVideos(): Promise<void> {
    await db.delete(videos).execute();
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

  async getAllUserNotes(userId: number): Promise<UserNote[]> {
    return await db
      .select()
      .from(userNotes)
      .where(eq(userNotes.userId, userId))
      .orderBy(desc(userNotes.createdAt));
  }

  async createNote(userId: number, videoId: number, content: string): Promise<UserNote> {
    const [newNote] = await db
      .insert(userNotes)
      .values({ userId, videoId, content })
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
    await db.delete(userNotes).where(eq(userNotes.id, id));
    return true;
  }

  async deleteAllUserCourses(): Promise<void> {
    await db.delete(userCourses).execute();
  }

  async deleteAllUserProgress(): Promise<void> {
    await db.delete(userProgress).execute();
  }

  async deleteAllUserNotes(): Promise<void> {
    await db.delete(userNotes).execute();
  }
}

export const storage = new DatabaseStorage();