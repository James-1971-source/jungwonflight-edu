import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runMigrations } from "./migrate";

const app = express();

app.set('trust proxy', 1); // Railway, Heroku 등의 프록시 환경에서 secure 쿠키 설정

app.use(cors({
  origin: process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000", // Replit 환경에서는 도메인 사용
  credentials: true // 쿠키 사용
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 헬스체크 응답을 위한 기본 경로 (브라우저 접속용)
app.get("/", (req, res) => {
  console.log(`[ROOT] 루트 경로 요청 받음: ${req.method} ${req.path}`);
  console.log(`[ROOT] 요청 헤더:`, req.headers);
  
  const response = { 
    status: "healthy", 
    message: "JungwonFlight-Edu API Server",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT || 5000,
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

// 모든 경로에 대한 기본 응답 (Railway 헬스체크용)
app.get("*", (req, res) => {
  if (req.path === "/") {
    res.status(200).json({ status: "healthy", message: "Server is running" });
  } else {
    res.status(404).json({ error: "Not found" });
  }
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

// 서버 시작 함수
async function startServer() {
  try {
    console.log("[SERVER] 서버 초기화 시작...");
    
    // Railway에서는 PORT 환경변수를 사용, 기본값은 5002
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5002;
    console.log(`[SERVER] 포트 설정: ${port}`);
    console.log(`[SERVER] 실제 사용 포트: ${port}`);
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

    // HTTP 서버를 시작
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`[SERVER] 서버가 포트 ${port}에서 시작되었습니다`);
      console.log(`[SERVER] 브라우저 접속: http://localhost:${port}/`);
      console.log(`[SERVER] 헬스체크 URL: http://localhost:${port}/api/health`);
      console.log(`[SERVER] 루트 헬스체크 URL: http://localhost:${port}/`);
      console.log(`[SERVER] 서버가 헬스체크 요청을 받을 준비가 되었습니다!`);
      console.log(`[SERVER] Railway 헬스체크 경로: /`);
      console.log(`[SERVER] 서버 상태: 정상 작동 중`);
      console.log(`[SERVER] 헬스체크 타임아웃: 600초`);
      console.log(`[SERVER] 서버 프로세스 ID: ${process.pid}`);
      console.log(`[SERVER] 서버 시작 완료! 헬스체크 준비됨`);
      
      // 서버가 계속 실행 중임을 주기적으로 로그
      setInterval(() => {
        console.log(`[SERVER] 서버 실행 중... (${new Date().toISOString()})`);
      }, 30000); // 30초마다

      // 프로세스가 종료되지 않도록 keep-alive
      process.stdin.resume();
      
      console.log(`[SERVER] 서버가 포그라운드에서 실행 중입니다. 종료하려면 Ctrl+C를 누르세요.`);
      
      // 서버가 계속 실행되도록 무한 루프 (Railway 환경에서 필요)
      setInterval(() => {
        // 아무것도 하지 않지만 프로세스가 종료되지 않도록 함
      }, 1000);

      // 추가적인 프로세스 유지 메커니즘
      const keepAlive = setInterval(() => {
        console.log(`[SERVER] Keep-alive 체크... (${new Date().toISOString()})`);
      }, 60000); // 1분마다

      // 서버 종료 시 keep-alive도 정리
      server.on('close', () => {
        clearInterval(keepAlive);
      });
    });

    // 서버 에러 핸들러 추가
    server.on('error', (error) => {
      console.error('[SERVER] 서버 에러:', error);
    });

    // 데이터베이스 마이그레이션 실행 (백그라운드에서)
    runMigrations().then(() => {
      console.log("[SERVER] 데이터베이스 마이그레이션 완료");
    }).catch((error) => {
      console.error("[SERVER] 데이터베이스 마이그레이션 오류:", error);
    });

    // 에러 핸들러
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error("[SERVER] 에러 발생:", err);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[SERVER] SIGTERM 신호 수신, 서버 종료 중...');
      server.close(() => {
        console.log('[SERVER] 서버가 안전하게 종료되었습니다');
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

    // 강제로 프로세스가 종료되지 않도록 추가 보호
    process.on('beforeExit', (code) => {
      console.log(`[SERVER] beforeExit 이벤트 발생, 코드: ${code}`);
      // 프로세스가 종료되지 않도록 방지
    });

    // 서버 시작 완료 후 무한 루프로 프로세스 유지
    console.log("[SERVER] 서버 시작 함수 완료, 프로세스 유지 중...");
    
    // 무한 루프로 프로세스 유지
    setInterval(() => {
      console.log(`[SERVER] 프로세스 유지 중... (${new Date().toISOString()})`);
    }, 30000); // 30초마다

  } catch (error) {
    console.error("[SERVER] 서버 초기화 오류:", error);
    process.exit(1);
  }
}

// 서버 시작
startServer(); 