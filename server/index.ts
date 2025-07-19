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
  res.json({ 
    status: "healthy", 
    message: "JungwonFlight-Edu API Server",
    timestamp: new Date().toISOString()
  });
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

(async () => {
  try {
    console.log("[SERVER] 서버 초기화 시작...");
    
    // 환경변수 PORT 사용 또는 기본값 5002
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5002;
    console.log(`[SERVER] 포트 설정: ${port}`);
    
    // 라우트 등록 (먼저 실행)
    registerRoutes(app);
    console.log("[SERVER] 라우트 등록 완료");

    // HTTP 서버를 시작
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`[SERVER] 서버가 포트 ${port}에서 시작되었습니다`);
      console.log(`[SERVER] 브라우저 접속: http://localhost:${port}/`);
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

    // 환경변수 정보 출력
    console.log(`[SERVER] 환경변수 정보:`, {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '설정됨' : '설정되지 않음'
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[SERVER] SIGTERM 신호 수신, 서버 종료 중...');
      server.close(() => {
        console.log('[SERVER] 서버가 안전하게 종료되었습니다');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error("[SERVER] 서버 초기화 오류:", error);
    process.exit(1);
  }
})(); 