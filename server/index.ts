import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runMigrations } from "./migrate";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ Railway 포트 환경변수 사용 (가장 중요!)
const PORT = process.env.PORT || 8080;

console.log('[SERVER] 서버 초기화 시작...');

app.set('trust proxy', 1); // Railway, Heroku 등의 프록시 환경에서 secure 쿠키 설정

app.use(cors({
  origin: process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000", // Replit 환경에서는 도메인 사용
  credentials: true // 쿠키 사용
}));

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 헬스체크 엔드포인트 (Railway 필수)
app.get('/', (req, res) => {
  console.log(`[ROOT] 루트 경로 요청 받음: ${req.method} ${req.path}`);
  
  const response = { 
    status: 'OK', 
    message: 'JungwonFlight-Edu Server is running',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    pid: process.pid
  };
  
  console.log(`[ROOT] 응답 전송:`, response);
  res.status(200).json(response);
});

// Railway 전용 헬스체크 엔드포인트
app.get("/railway-health", (req, res) => {
  console.log(`[RAILWAY] Railway 헬스체크 요청 받음: ${req.method} ${req.path}`);
  
  const response = { 
    status: "healthy", 
    message: "Railway Health Check",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid
  };
  
  console.log(`[RAILWAY] 응답 전송:`, response);
  res.status(200).json(response);
});

// 간단한 텍스트 응답도 추가
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// 즉시 응답 가능한 최소한의 헬스체크
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "...";
      }

      log(logLine);
    }
  });

  next();
});

// ✅ 핵심 수정: 서버 시작 함수
async function startServer() {
  try {
    console.log(`[SERVER] 포트 설정: ${PORT}`);
    console.log(`[SERVER] 실제 사용 포트: ${PORT}`);
    console.log(`[SERVER] 환경변수 PORT: ${process.env.PORT}`);
    
    // 라우트 등록 (먼저 실행)
    await registerRoutes(app);
    console.log("[SERVER] 라우트 등록 완료");

    // 환경변수 정보 출력
    console.log(`[SERVER] 환경변수 정보:`, {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '설정됨' : '설정되지 않음',
      HOST: process.env.HOST || '0.0.0.0'
    });
    
    // 헬스체크 엔드포인트가 등록되었는지 확인
    console.log(`[SERVER] 등록된 라우트 확인: /api/health 엔드포인트 준비됨`);

    // 데이터베이스 마이그레이션 (실패해도 서버는 시작)
    try {
      await runMigrations();
      console.log('[SERVER] 데이터베이스 마이그레이션 완료');
    } catch (error) {
      console.error('[SERVER] 마이그레이션 실패:', error);
      // 계속 진행
    }

    // ✅ 가장 중요한 부분: Express 서버 시작
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] 서버가 포트 ${PORT}에서 실행 중입니다 ✅`);
      console.log(`[SERVER] 브라우저 접속: http://localhost:${PORT}/`);
      console.log(`[SERVER] 헬스체크 URL: http://localhost:${PORT}/api/health`);
      console.log(`[SERVER] 루트 헬스체크 URL: http://localhost:${PORT}/`);
      console.log(`[SERVER] 서버가 헬스체크 요청을 받을 준비가 되었습니다!`);
      console.log(`[SERVER] Railway 헬스체크 경로: /`);
      console.log(`[SERVER] 서버 상태: 정상 작동 중`);
      console.log(`[SERVER] 헬스체크 타임아웃: 600초`);
      console.log(`[SERVER] 서버 프로세스 ID: ${process.pid}`);
      console.log('[SERVER] Railway 헬스체크 준비 완료');
    });

    // 서버 에러 핸들링
    server.on('error', (error) => {
      console.error('[SERVER] 서버 에러:', error);
    });

    // 에러 핸들러
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error("[SERVER] 에러 발생:", err);
    });

    // 프로세스 종료 시 정리
    process.on('SIGTERM', () => {
      console.log('[SERVER] SIGTERM 수신, 서버를 종료합니다');
      server.close(() => {
        console.log('[SERVER] 서버 종료 완료');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('[SERVER] SIGINT 신호 수신, 서버 종료 중...');
      server.close(() => {
        console.log('[SERVER] 서버가 안전하게 종료되었습니다');
        process.exit(0);
      });
    });

    // 프로세스 종료 시 로그
    process.on('exit', (code) => {
      console.log(`[SERVER] 프로세스 종료, 코드: ${code}`);
    });

    // 예기치 않은 종료 방지
    process.on('uncaughtException', (error) => {
      console.error('[SERVER] 예기치 않은 오류:', error);
      // 서버를 종료하지 않고 계속 실행
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[SERVER] 처리되지 않은 Promise 거부:', reason);
      // 서버를 종료하지 않고 계속 실행
    });

    // ✅ 이 부분이 핵심: app.listen() 호출 후 함수는 종료되지만
    // Express 서버가 이벤트 루프를 유지하므로 프로세스가 계속 실행됨
    
  } catch (error) {
    console.error('[SERVER] 서버 시작 실패:', error);
    process.exit(1);
  }
}

// ✅ 메인 실행부 - 이 부분도 중요
startServer().catch((error) => {
  console.error('[SERVER] 치명적 오류:', error);
  process.exit(1);
});

export { app }; 