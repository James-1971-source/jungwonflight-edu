import postgres from 'postgres';

// Railway 환경에 맞는 연결 설정
export const sql = postgres(process.env.DATABASE_URL!, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 1, // 연결 풀 크기 제한
  idle_timeout: 20, // 유휴 타임아웃
  connect_timeout: 10, // 연결 타임아웃
});

// DB 연결 테스트
sql`SELECT 1`.then(() => {
  console.log('✅ DB 연결 성공');
}).catch((err) => {
  console.error('❌ DB 연결 실패:', err);
});