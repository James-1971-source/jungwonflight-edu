import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

// SQLite 데이터베이스 파일 경로
const sqlite = new Database('./database.sqlite');

export const db = drizzle(sqlite, { schema });