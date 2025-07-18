import { 
  users, categories, videos, userProgress, userNotes, userCourses,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Video, type InsertVideo,
  type UserProgress, type InsertUserProgress,
  type UserNote, type InsertUserNote
} from "@shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, desc } from "drizzle-orm";

// Drizzle ORM 설정
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});
const db = drizzle(client);

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
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0] || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || undefined;
  }

  async getUserByRole(role: string): Promise<User | undefined> {
    const [user] = await sql`SELECT * FROM users WHERE role = ${role}`;
    return user || undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await sql`SELECT * FROM users WHERE role = ${role} ORDER BY created_at DESC`;
  }

  async getUsers(): Promise<User[]> {
    return await sql`SELECT * FROM users ORDER BY created_at DESC`;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await sql`
      INSERT INTO users (username, email, password, role)
      VALUES (${insertUser.username}, ${insertUser.email}, ${insertUser.password}, ${insertUser.role})
      RETURNING *
    `;
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    console.log(`[STORAGE] updateUser 호출:`, { id, updates });
    
    // isApproved 필드를 is_approved로 변환
    const processedUpdates = { ...updates };
    if ('isApproved' in processedUpdates) {
      (processedUpdates as any).is_approved = processedUpdates.isApproved;
      delete processedUpdates.isApproved;
    }
    
    console.log(`[STORAGE] 처리된 업데이트 데이터:`, processedUpdates);
    
    const [user] = await sql`
      UPDATE users SET ${sql(Object.keys(processedUpdates).map(k => `${k} = ${sql((processedUpdates as any)[k])}`))}
      WHERE id = ${id}
      RETURNING *
    `;
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    await sql`DELETE FROM users WHERE id = ${id}`;
    // 삭제 후 실제로 존재하는지 재확인
    const user = await this.getUser(id);
    return !user;
  }

  async deleteUserProgress(userId: number): Promise<void> {
    await sql`DELETE FROM user_progress WHERE user_id = ${userId}`;
  }

  async deleteUserNotes(userId: number): Promise<void> {
    await sql`DELETE FROM user_notes WHERE user_id = ${userId}`;
  }

  // My Courses
  async getUserCourses(userId: number): Promise<Video[]> {
    const result = await sql`
      SELECT v.* FROM user_courses uc
      LEFT JOIN videos v ON uc.video_id = v.id
      WHERE uc.user_id = ${userId}
      ORDER BY uc.created_at DESC
    `;
    
    return result.map(r => r as Video).filter((v): v is Video => v !== null);
  }

  async addUserCourse(userId: number, videoId: number): Promise<void> {
    await sql`INSERT INTO user_courses (user_id, video_id) VALUES (${userId}, ${videoId}) ON CONFLICT DO NOTHING`;
  }

  async removeUserCourse(userId: number, videoId: number): Promise<void> {
    await sql`DELETE FROM user_courses WHERE user_id = ${userId} AND video_id = ${videoId}`;
  }

  async getUserCourseIds(userId: number): Promise<number[]> {
    const result = await sql`SELECT video_id FROM user_courses WHERE user_id = ${userId}`;
    return result.map(r => r.video_id);
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await sql`SELECT * FROM categories ORDER BY name`;
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await sql`SELECT * FROM categories WHERE name = ${name}`;
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await sql`
      INSERT INTO categories (name)
      VALUES (${category.name})
      RETURNING *
    `;
    return newCategory;
  }

  async deleteAllCategories(): Promise<void> {
    await sql`DELETE FROM categories`;
  }

  // Videos
  async getVideos(): Promise<Video[]> {
    return await sql`SELECT * FROM videos ORDER BY created_at DESC`;
  }

  async getVideosByCategory(categoryId: number): Promise<Video[]> {
    return await sql`
      SELECT * FROM videos WHERE category_id = ${categoryId} ORDER BY created_at DESC
    `;
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await sql`SELECT * FROM videos WHERE id = ${id}`;
    return video || undefined;
  }

  async getVideoByTitle(title: string): Promise<Video | undefined> {
    const [video] = await sql`SELECT * FROM videos WHERE title = ${title}`;
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
    cleanVideo = toSnakeCase(cleanVideo);

    // 컬럼명과 값 순서를 명확히 지정
    const columns = [
      "title",
      "description",
      "google_drive_file_id",
      "thumbnail_url",
      "duration",
      "category_id",
      "uploaded_by"
    ];
    const values = [
      cleanVideo.title,
      cleanVideo.description,
      cleanVideo.google_drive_file_id,
      cleanVideo.thumbnail_url,
      cleanVideo.duration,
      cleanVideo.category_id,
      cleanVideo.uploaded_by
    ];

    const sqlQuery = sql`
      INSERT INTO videos (${sql.raw(columns.join(', '))})
      VALUES (${sql.join(values, sql.raw(', '))})
      RETURNING *
    `;

    console.log('최종 직접 SQL 쿼리:', sqlQuery);
    console.log('최종 SQL 값들:', values);

    const result = await sql`
      INSERT INTO videos (${sql(columns)}) 
      VALUES (${sql(values)}) 
      RETURNING *
    `;
    return result[0] as Video;
  }

  async updateVideo(id: number, updates: Partial<InsertVideo>): Promise<Video | undefined> {
    const [video] = await sql`
      UPDATE videos SET ${sql(Object.keys(updates).map(k => `${k} = ${sql(updates[k])}`))}
      WHERE id = ${id}
      RETURNING *
    `;
    return video || undefined;
  }

  async deleteVideo(id: number): Promise<boolean> {
    try {
      // 관련된 사용자 진도 데이터 먼저 삭제 (Foreign Key 제약조건)
      await sql`DELETE FROM user_progress WHERE video_id = ${id}`;
      console.log(`비디오 ${id}의 진도 데이터 삭제 완료`);
      
      // 관련된 사용자 노트 데이터 먼저 삭제 (Foreign Key 제약조건)
      await sql`DELETE FROM user_notes WHERE video_id = ${id}`;
      console.log(`비디오 ${id}의 노트 데이터 삭제 완료`);
      
      // 마지막으로 비디오 삭제
      const result = await sql`DELETE FROM videos WHERE id = ${id}`;
      console.log(`비디오 ${id} 삭제 완료`);
      
      return true;
    } catch (error) {
      console.error('동영상 삭제 중 데이터베이스 오류:', error);
      throw error;
    }
  }

  async deleteAllVideos(): Promise<void> {
    await sql`DELETE FROM videos`;
  }

  // User Progress
  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return await sql`SELECT * FROM user_progress WHERE user_id = ${userId}`;
  }

  async getVideoProgress(userId: number, videoId: number): Promise<UserProgress | undefined> {
    const [progress] = await sql`SELECT * FROM user_progress WHERE user_id = ${userId} AND video_id = ${videoId}`;
    return progress || undefined;
  }

  async updateProgress(userId: number, videoId: number, progress: Partial<InsertUserProgress>): Promise<UserProgress> {
    const existing = await this.getVideoProgress(userId, videoId);

    if (existing) {
      const [updated] = await sql`
        UPDATE user_progress SET ${sql(Object.keys(progress).map(k => `${k} = ${sql(progress[k])}`))}
        WHERE user_id = ${userId} AND video_id = ${videoId}
        RETURNING *
      `;
      return updated;
    } else {
      const [created] = await sql`
        INSERT INTO user_progress (user_id, video_id, ${sql.identifier(Object.keys(progress))})
        VALUES (${userId}, ${videoId}, ${sql(Object.values(progress))})
        RETURNING *
      `;
      return created;
    }
  }

  // User Notes
  async getUserNotes(userId: number, videoId: number): Promise<UserNote[]> {
    return await sql`SELECT * FROM user_notes WHERE user_id = ${userId} AND video_id = ${videoId} ORDER BY created_at DESC`;
  }

  async getAllUserNotes(userId: number): Promise<UserNote[]> {
    return await sql`SELECT * FROM user_notes WHERE user_id = ${userId} ORDER BY created_at DESC`;
  }

  async createNote(userId: number, videoId: number, content: string): Promise<UserNote> {
    const [newNote] = await sql`
      INSERT INTO user_notes (user_id, video_id, content)
      VALUES (${userId}, ${videoId}, ${content})
      RETURNING *
    `;
    return newNote;
  }

  async updateNote(id: number, content: string): Promise<UserNote | undefined> {
    const [note] = await sql`
      UPDATE user_notes SET content = ${content}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return note || undefined;
  }

  async deleteNote(id: number): Promise<boolean> {
    await sql`DELETE FROM user_notes WHERE id = ${id}`;
    return true;
  }

  async deleteAllUserCourses(): Promise<void> {
    await sql`DELETE FROM user_courses`;
  }

  async deleteAllUserProgress(): Promise<void> {
    await sql`DELETE FROM user_progress`;
  }

  async deleteAllUserNotes(): Promise<void> {
    await sql`DELETE FROM user_notes`;
  }

  async createVideoWithPgDriver(video: InsertVideo): Promise<any> {
    // id, undefined 필드 제거 및 snake_case 변환
    let cleanVideo = Object.fromEntries(
      Object.entries(video).filter(([k, v]) => k !== "id" && v !== undefined)
    );
    cleanVideo = toSnakeCase(cleanVideo);

    // 컬럼명과 값 순서를 명확히 지정
    const columns = [
      "title",
      "description",
      "google_drive_file_id",
      "thumbnail_url",
      "duration",
      "category_id",
      "uploaded_by"
    ];
    const values = [
      cleanVideo.title,
      cleanVideo.description,
      cleanVideo.google_drive_file_id,
      cleanVideo.thumbnail_url,
      cleanVideo.duration,
      cleanVideo.category_id,
      cleanVideo.uploaded_by
    ];

    // 쿼리 실행
    const result = await sql`
      INSERT INTO videos (${sql(columns)}) 
      VALUES (${sql(values)}) 
      RETURNING *
    `;
    return result[0];
  }
}

export const storage = new DatabaseStorage();