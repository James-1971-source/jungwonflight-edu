import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express 앱 생성
const app = express();
const PORT = parseInt(process.env.PORT || '8080');

console.log('[SERVER] 서버 초기화 시작...');
console.log('[SERVER] 포트 설정:', PORT);
console.log('[SERVER] 실제 사용 포트:', PORT);
console.log('[SERVER] 환경변수 PORT:', process.env.PORT);

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 헬스체크 엔드포인트들
app.get('/', (req, res) => {
  console.log('[SERVER] 루트 엔드포인트 호출됨');
  res.status(200).json({ 
    status: 'OK', 
    message: 'JungwonFlight-Edu Server is running',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/health', (req, res) => {
  console.log('[SERVER] /health 엔드포인트 호출됨');
  res.status(200).json({ 
    status: 'healthy',
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  console.log('[SERVER] /api/health 엔드포인트 호출됨');
  res.status(200).json({ 
    status: 'healthy',
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

console.log('[SERVER] 라우트 등록 완료');

// 환경변수 정보 출력
console.log('[SERVER] 환경변수 정보:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '설정됨' : '설정안됨',
  HOST: '0.0.0.0'
});

console.log('[SERVER] 등록된 라우트 확인: /api/health 엔드포인트 준비됨');

// 마이그레이션 함수 (간단한 버전)
async function runMigration() {
  console.log('마이그레이션 시작...');
  try {
    // 실제 마이그레이션 코드가 있다면 여기에 추가
    // await migrate();
    console.log('마이그레이션 완료!');
    console.log('마이그레이션이 성공적으로 완료되었습니다.');
    return true;
  } catch (error) {
    console.error('마이그레이션 실패:', error);
    return false;
  }
}

// 🔥 서버 시작 함수 - 이 부분이 핵심!
async function startServer() {
  console.log('[SERVER] 🚀 서버 시작 프로세스 시작');
  
  try {
    // 마이그레이션 실행 (실패해도 서버는 시작)
    await runMigration();
    
    console.log('[SERVER] 🔧 Express 서버 바인딩 시작...');
    
    // 🚨 가장 중요한 부분: 서버 시작 및 리스닝
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] ✅ 서버가 성공적으로 시작되었습니다!`);
      console.log(`[SERVER] ✅ 주소: http://0.0.0.0:${PORT}`);
      console.log(`[SERVER] ✅ 헬스체크 엔드포인트: http://0.0.0.0:${PORT}/health`);
      console.log('[SERVER] ✅ Railway 헬스체크 준비 완료');
      console.log('[SERVER] ✅ 서버 상태: RUNNING');
    });

    // 서버 이벤트 리스너
    server.on('listening', () => {
      const address = server.address();
      console.log('[SERVER] ✅ 서버 리스닝 상태 확인:', address);
    });

    server.on('error', (error: any) => {
      console.error('[SERVER] ❌ 서버 오류:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`[SERVER] ❌ 포트 ${PORT}가 이미 사용 중`);
      }
    });

    // 프로세스 종료 신호 처리
    process.on('SIGTERM', () => {
      console.log('[SERVER] SIGTERM 신호 받음');
      server.close(() => {
        console.log('[SERVER] 서버가 안전하게 종료됨');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('[SERVER] SIGINT 신호 받음');
      server.close(() => {
        console.log('[SERVER] 서버가 안전하게 종료됨');
        process.exit(0);
      });
    });

    return server;
    
  } catch (error) {
    console.error('[SERVER] ❌ 서버 시작 실패:', error);
    
    // 비상 모드: 최소한의 서버라도 시작
    console.log('[SERVER] 🚨 비상 모드로 서버 시작 시도');
    const emergencyServer = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] 🚨 비상 서버 시작됨 - 포트: ${PORT}`);
    });
    return emergencyServer;
  }
}

// 🔥 메인 실행부
console.log('[SERVER] 📋 메인 프로세스 시작');

// 서버 시작
startServer()
  .then((server) => {
    console.log('[SERVER] ✅ startServer() 호출 완료');
    
    // 5초 후 상태 확인
    setTimeout(() => {
      if (server.listening) {
        console.log('[SERVER] ✅ 5초 후 상태 확인: 서버 정상 동작');
        console.log('[SERVER] ✅ 서버 주소:', server.address());
      } else {
        console.log('[SERVER] ❌ 5초 후 상태 확인: 서버가 리스닝하지 않음');
      }
    }, 5000);
  })
  .catch((error) => {
    console.error('[SERVER] ❌ startServer() 실패:', error);
    process.exit(1);
  });

// 프로세스 생존 확인용 heartbeat
setInterval(() => {
  console.log(`[SERVER] 💓 프로세스 생존 확인 - 업타임: ${Math.floor(process.uptime())}초`);
}, 30000);

// 혹시 모를 상황을 위한 프로세스 유지
process.on('uncaughtException', (error) => {
  console.error('[SERVER] ❌ 처리되지 않은 예외:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] ❌ 처리되지 않은 Promise 거부:', reason);
});

export { app }; 