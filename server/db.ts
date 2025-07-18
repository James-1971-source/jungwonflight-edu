import postgres from 'postgres';

// 환경에 따른 연결 설정
export const sql = postgres(process.env.DATABASE_URL!, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : 'prefer', // 환경에 따라 동적 설정
  max: process.env.NODE_ENV === 'production' ? 10 : 1, // 프로덕션에서는 더 많은 연결 허용
  idle_timeout: 20, // 유휴 타임아웃
  connect_timeout: 10, // 연결 타임아웃
});

// DB 연결은 필요할 때 자동으로 이루어집니다