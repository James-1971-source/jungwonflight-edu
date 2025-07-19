import { sql } from "drizzle-orm";
import postgres from "postgres";

export async function runMigrations() {
  try {
    console.log("마이그레이션 시작...");
    
    // 데이터베이스 연결
    const connectionString = process.env.DATABASE_URL!;
    const client = postgres(connectionString, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    
    // 세션 테이블 생성 (connect-pg-simple용)
    try {
      await client`
        CREATE TABLE IF NOT EXISTS sessions (
          sid VARCHAR NOT NULL COLLATE "default",
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL
        )
        WITH (OIDS=FALSE);
      `;
      
      await client`
        ALTER TABLE sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
      `;
      
      console.log("세션 테이블 생성 완료");
    } catch (sessionError) {
      console.log("세션 테이블이 이미 존재하거나 생성 중 오류:", sessionError);
    }
    
    // Railway 환경에서는 Drizzle Kit으로 스키마 생성
    // 개발 환경에서는 이미 생성되어 있음
    console.log("마이그레이션 완료!");
    
    await client.end();
  } catch (error) {
    console.error("마이그레이션 오류:", error);
    // Railway에서는 마이그레이션 실패로 인한 서버 중단 방지
    console.log("마이그레이션 오류 발생했지만 서버는 계속 실행됩니다.");
  }
}

// 직접 실행할 경우
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log("마이그레이션이 성공적으로 완료되었습니다.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("마이그레이션 실패:", error);
      process.exit(1);
    });
} 