import { sql } from "./db";

export async function runMigrations() {
  try {
    console.log("마이그레이션 시작...");
    
    // is_approved 컬럼 추가
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false`;
    console.log("is_approved 컬럼 추가 완료");
    
    // 기존 사용자들을 승인된 상태로 설정
    await sql`UPDATE users SET is_approved = true WHERE role = 'admin'`;
    await sql`UPDATE users SET is_approved = true WHERE role = 'student'`;
    console.log("기존 사용자 승인 상태 업데이트 완료");
    
    console.log("마이그레이션 완료!");
  } catch (error) {
    console.error("마이그레이션 오류:", error);
    throw error;
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