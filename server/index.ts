import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runMigrations } from "./migrate";

const app = express();

app.set('trust proxy', 1); // Railway, Heroku 등 프록시 환경에서 secure 쿠키 동작 보장

app.use(cors({
  origin: "https://jungwonflight-edu-production.up.railway.app", // 실제 Railway 프론트엔드 도메인
  credentials: true // 쿠키 허용
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log("[SERVER] 서버 초기화 시작...");
    
    // 마이그레이션 실행
    try {
      await runMigrations();
      log("마이그레이션 완료");
    } catch (error) {
      log(`마이그레이션 오류: ${error}`);
      // 마이그레이션 실패해도 서버는 계속 실행
    }

    const server = await registerRoutes(app);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      try {
        serveStatic(app);
      } catch (staticError) {
        console.error("[SERVER] 정적 파일 서빙 설정 오류:", staticError);
        // 정적 파일 서빙 실패해도 API는 계속 동작
      }
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error("[SERVER] 에러 미들웨어:", err);
    });

    // Use environment variable PORT or default to 5002
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5002;
    console.log(`[SERVER] 서버 시작 중... 포트: ${port}`);
    console.log(`[SERVER] 환경변수:`, {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '설정됨' : '설정되지 않음'
    });
    
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      console.log(`[SERVER] 서버가 포트 ${port}에서 시작되었습니다.`);
      
      // 헬스체크 준비 완료 알림
      console.log(`[SERVER] 헬스체크 엔드포인트 준비: http://localhost:${port}/api/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[SERVER] SIGTERM 신호 수신, 서버 종료 중...');
      server.close(() => {
        console.log('[SERVER] 서버가 정상적으로 종료되었습니다.');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error("[SERVER] 서버 초기화 오류:", error);
    process.exit(1);
  }
})();
