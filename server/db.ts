import postgres from 'postgres';

// Replit 환경에 맞는 연결 설정
export const sql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require', // Replit PostgreSQL에서는 SSL 필요
  max: 1, // 연결 풀 크기 제한
  idle_timeout: 20, // 유휴 타임아웃
  connect_timeout: 10, // 연결 타임아웃
});

// DB 연결은 필요할 때 자동으로 이루어집니다