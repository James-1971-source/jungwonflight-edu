import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertVideoSchema, insertCategorySchema, insertUserNoteSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import multer from "multer";
import path from "path";
import { VideoService } from "./videoService";
import { fileURLToPath } from 'url';
import connectPgSimple from 'connect-pg-simple';
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      role: string;
      isApproved: boolean;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // 루트 경로 - 헬스체크용 (Railway에서 사용)
  app.get("/", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      message: "JungwonFlight-Edu API Server",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      port: process.env.PORT || 5000
    });
  });

  // 추가 헬스체크 엔드포인트
  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Railway 헬스체크용 엔드포인트
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      port: process.env.PORT || 5000
    });
  });

  // 정적 파일 서빙 (업로드된 파일들)
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Multer 설정 (메모리 저장)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB 제한
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('지원하지 않는 파일 형식입니다. MP4, AVI, MOV, WMV, FLV, WebM 파일만 업로드 가능합니다.'));
      }
    },
  });

  // Session configuration with PostgreSQL store for production
  const PgSession = connectPgSimple(session);
  
  app.use(session({
    store: new PgSession({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      },
      tableName: 'sessions', // 테이블 이름
    }),
    secret: process.env.SESSION_SECRET || "avilearn-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', // 환경에 따라 동적 설정
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 환경에 따라 동적 설정
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30일
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport configuration
  passport.use(new LocalStrategy(
    { usernameField: 'username' },
    async (username, password, done) => {
      try {
        console.log(`[LOGIN] 로그인 시도: ${username}`);
        
        // 데이터베이스 연결 상태 확인
        try {
          const testQuery = await sql`SELECT 1`;
          console.log(`[LOGIN] DB 연결 확인: 성공`);
        } catch (dbError) {
          console.error(`[LOGIN] DB 연결 오류:`, dbError);
          return done(new Error('데이터베이스 연결 오류'));
        }
        
        // Try to find user by username first, then by email
        let user = await storage.getUserByUsername(username);
        if (!user) {
          console.log(`[LOGIN] 사용자명으로 사용자 찾기 실패: ${username}`);
          user = await storage.getUserByEmail(username);
          if (user) {
            console.log(`[LOGIN] 이메일로 사용자 찾기 성공: ${username}`);
          }
        } else {
          console.log(`[LOGIN] 사용자명으로 사용자 찾기 성공: ${username}`);
        }
        
        if (!user) {
          console.log(`[LOGIN] 사용자를 찾을 수 없음: ${username}`);
          return done(null, false, { message: '잘못된 사용자명 또는 이메일입니다.' });
        }

        console.log(`[LOGIN] 사용자 정보:`, {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved
        });

        // isApproved가 undefined인 경우 임시로 true로 설정
        const isApproved = user.isApproved !== undefined ? user.isApproved : true;
        
        if (!isApproved) {
          console.log(`[LOGIN] 승인되지 않은 계정: ${username}`);
          return done(null, false, { message: '승인되지 않은 계정입니다.' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          console.log(`[LOGIN] 비밀번호 불일치: ${username}`);
          return done(null, false, { message: '잘못된 비밀번호입니다.' });
        }

        console.log(`[LOGIN] 로그인 성공: ${username}`);
        return done(null, {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isApproved: isApproved
        });
      } catch (error) {
        console.error(`[LOGIN] 로그인 중 오류 발생:`, error);
        return done(error);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        // isApproved가 undefined인 경우 임시로 true로 설정
        const isApproved = user.isApproved !== undefined ? user.isApproved : true;
        
        if (isApproved) {
          done(null, {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isApproved: isApproved
          });
        } else {
          done(null, false);
        }
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });

  // Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "인증이 필요합니다." });
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
      return next();
    }
    res.status(403).json({ message: "관리자 권한이 필요합니다." });
  };

  // Auth routes
  app.post("/api/login", (req, res, next) => {
    console.log(`[LOGIN] 로그인 요청 받음:`, {
      username: req.body.username,
      hasPassword: !!req.body.password,
      body: req.body,
      headers: req.headers
    });
    
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error(`[LOGIN] 인증 오류:`, err);
        return res.status(500).json({ message: "로그인 중 오류가 발생했습니다." });
      }
      
      if (!user) {
        console.log(`[LOGIN] 인증 실패:`, info?.message);
        return res.status(401).json({ message: info?.message || "로그인에 실패했습니다." });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error(`[LOGIN] 세션 생성 오류:`, err);
          return res.status(500).json({ message: "로그인 중 오류가 발생했습니다." });
        }
        
        console.log(`[LOGIN] 로그인 완료:`, { id: user.id, username: user.username });
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "로그아웃 중 오류가 발생했습니다." });
      }
      res.json({ message: "로그아웃되었습니다." });
    });
  });

  app.get("/api/me", requireAuth, (req, res) => {
    res.json(req.user);
  });

  // Get all users (admin only)
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "사용자 목록을 불러오는 중 오류가 발생했습니다." });
    }
  });

  // User registration (admin only)
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "이미 존재하는 사용자명입니다." });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "이미 존재하는 이메일입니다." });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Remove password from response
      const { password, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error) {
      res.status(400).json({ message: "사용자 생성 중 오류가 발생했습니다." });
    }
  });

  // User update (admin only)
  app.put("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      console.log(`[USER UPDATE] 사용자 수정 요청:`, { id, updates });
      
      // Check if user exists
      const existingUser = await storage.getUser(parseInt(id));
      if (!existingUser) {
        console.log(`[USER UPDATE] 사용자를 찾을 수 없음: ${id}`);
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      console.log(`[USER UPDATE] 기존 사용자 정보:`, existingUser);

      // Check username uniqueness if username is being updated
      if (updates.username && updates.username !== existingUser.username) {
        const userWithUsername = await storage.getUserByUsername(updates.username);
        if (userWithUsername) {
          return res.status(400).json({ message: "이미 존재하는 사용자명입니다." });
        }
      }

      // Check email uniqueness if email is being updated
      if (updates.email && updates.email !== existingUser.email) {
        const userWithEmail = await storage.getUserByEmail(updates.email);
        if (userWithEmail) {
          return res.status(400).json({ message: "이미 존재하는 이메일입니다." });
        }
      }

      // isApproved 필드 처리
      if (updates.isApproved !== undefined) {
        // boolean 값으로 변환
        updates.isApproved = Boolean(updates.isApproved);
        console.log(`[USER UPDATE] isApproved 값 설정:`, updates.isApproved);
      }

      console.log(`[USER UPDATE] 최종 업데이트 데이터:`, updates);

      // Update user
      const updatedUser = await storage.updateUser(parseInt(id), updates);
      if (!updatedUser) {
        console.log(`[USER UPDATE] 사용자 업데이트 실패: ${id}`);
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      console.log(`[USER UPDATE] 사용자 업데이트 성공:`, updatedUser);

      // Remove password from response
      const { password, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error(`[USER UPDATE] 오류 발생:`, error);
      res.status(400).json({ message: "사용자 정보 수정 중 오류가 발생했습니다." });
    }
  });

  // User deletion (admin only)
  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      // Prevent deleting an admin
      if (user.role === 'admin') {
        return res.status(400).json({ message: "관리자는 삭제할 수 없습니다." });
      }

      // Delete user's progress and notes first
      await storage.deleteUserProgress(userId);
      await storage.deleteUserNotes(userId);

      // Delete user
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      res.json({ message: "사용자가 삭제되었습니다." });
    } catch (error) {
      console.error('사용자 삭제 오류:', error);
      res.status(500).json({ message: "사용자 삭제 중 오류가 발생했습니다." });
    }
  });

  // Categories routes
  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "카테고리를 불러오는 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/categories", requireAdmin, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ message: "카테고리 생성 중 오류가 발생했습니다." });
    }
  });

  // Videos routes
  app.get("/api/videos", requireAuth, async (req, res) => {
    try {
      const { categoryId } = req.query;
      let videos;
      
      if (categoryId) {
        videos = await storage.getVideosByCategory(parseInt(categoryId as string));
      } else {
        videos = await storage.getVideos();
      }
      
      const userCourseIds = await storage.getUserCourseIds(req.user!.id);
      
      res.json({
        videos,
        userCourseIds
      });
    } catch (error) {
      res.status(500).json({ message: "동영상을 불러오는 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/videos/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const video = await storage.getVideo(parseInt(id));
      
      if (!video) {
        return res.status(404).json({ message: "동영상을 찾을 수 없습니다." });
      }
      
      res.json(video);
    } catch (error) {
      res.status(500).json({ message: "동영상을 불러오는 중 오류가 발생했습니다." });
    }
  });

  // 새로운 파일 업로드 라우트
  app.post("/api/videos/upload", requireAdmin, upload.single('video'), async (req, res) => {
    try {
      console.log("업로드 요청 받음:", {
        file: req.file ? "파일 있음" : "파일 없음",
        body: req.body,
        user: req.user
      });

      if (!req.file) {
        console.log("파일이 없음");
        return res.status(400).json({ message: "비디오 파일이 필요합니다." });
      }

      const { title, description, categoryId } = req.body;
      
      if (!title) {
        console.log("제목이 없음");
        return res.status(400).json({ message: "제목이 필요합니다." });
      }

      console.log("파일 정보:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // 비디오 파일 처리
      const processedVideo = await VideoService.processVideo(req.file);

      // 데이터베이스에 저장 (파일 경로를 googleDriveFileId에 저장)
      const videoData = {
        title,
        description: description || "",
        googleDriveFileId: `local:${processedVideo.filename}`,
        thumbnailUrl: processedVideo.thumbnailPath,
        duration: processedVideo.duration,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        uploadedBy: req.user!.id
      };
      console.log("업로드 직전 videoData:", videoData);
      const video = await storage.createVideo(videoData);
      
      res.status(201).json(video);
    } catch (error: any) {
      console.error('비디오 업로드 오류:', error);
      res.status(400).json({ 
        message: error.message || "비디오 업로드 중 오류가 발생했습니다." 
      });
    }
  });

  // 기존 JSON 기반 비디오 생성 (호환성을 위해 유지, 하지만 사용 중단 예정)
  app.post("/api/videos", requireAdmin, async (req, res) => {
    try {
      const videoData = insertVideoSchema.parse(req.body);
      const video = await storage.createVideo({
        ...videoData,
        uploadedBy: req.user!.id
      });
      res.status(201).json(video);
    } catch (error) {
      res.status(400).json({ message: "동영상 업로드 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/videos/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const video = await storage.updateVideo(parseInt(id), updateData);
      if (!video) {
        return res.status(404).json({ message: "동영상을 찾을 수 없습니다." });
      }
      
      res.json(video);
    } catch (error) {
      res.status(400).json({ message: "동영상 수정 중 오류가 발생했습니다." });
    }
  });

  app.delete("/api/videos/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // 삭제하기 전에 비디오 정보 가져오기 (로컬 파일 삭제를 위해)
      const video = await storage.getVideo(parseInt(id));
      if (!video) {
        return res.status(404).json({ message: "동영상을 찾을 수 없습니다." });
      }

      // 로컬 파일인 경우 파일 시스템에서도 삭제
      if (video.googleDriveFileId?.startsWith('local:')) {
        const filename = video.googleDriveFileId.replace('local:', '');
        const videoPath = `/uploads/videos/${filename}`;
        const thumbnailPath = video.thumbnailUrl || undefined;
        
        try {
          await VideoService.deleteVideo(videoPath, thumbnailPath);
          console.log(`로컬 파일 삭제 완료: ${filename}`);
        } catch (fileError) {
          console.error('파일 삭제 실패:', fileError);
          // 파일 삭제 실패해도 DB에서는 삭제 진행
        }
      }

      // 데이터베이스에서 삭제
      const success = await storage.deleteVideo(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "동영상을 찾을 수 없습니다." });
      }
      
      res.json({ message: "동영상이 삭제되었습니다." });
    } catch (error) {
      console.error('동영상 삭제 오류:', error);
      res.status(500).json({ message: "동영상 삭제 중 오류가 발생했습니다." });
    }
  });

  // Progress routes
  app.get("/api/progress", requireAuth, async (req, res) => {
    try {
      const progress = await storage.getUserProgress(req.user!.id);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "진도를 불러오는 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/progress", requireAuth, async (req, res) => {
    try {
      const { videoId, watchedDuration, completed } = req.body;
      const progress = await storage.updateProgress(
        req.user!.id,
        videoId,
        { watchedDuration, completed }
      );
      res.json(progress);
    } catch (error) {
      res.status(400).json({ message: "진도 업데이트 중 오류가 발생했습니다." });
    }
  });

  // Notes routes
  app.get("/api/notes/:videoId", requireAuth, async (req, res) => {
    try {
      const { videoId } = req.params;
      const notes = await storage.getUserNotes(req.user!.id, parseInt(videoId));
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "노트를 불러오는 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/notes", requireAuth, async (req, res) => {
    try {
      const noteData = insertUserNoteSchema.parse(req.body);
      const note = await storage.createNote(
        req.user!.id,
        noteData.videoId,
        noteData.content
      );
      res.status(201).json(note);
    } catch (error) {
      const errMsg = (error as Error)?.message || String(error);
      console.error("노트 생성 에러:", errMsg, req.body);
      res.status(400).json({ message: "노트 생성 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/notes/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      
      const note = await storage.updateNote(parseInt(id), content);
      if (!note) {
        return res.status(404).json({ message: "노트를 찾을 수 없습니다." });
      }
      
      res.json(note);
    } catch (error) {
      res.status(400).json({ message: "노트 수정 중 오류가 발생했습니다." });
    }
  });

  app.delete("/api/notes/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteNote(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "노트를 찾을 수 없습니다." });
      }
      
      res.json({ message: "노트가 삭제되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "노트 삭제 중 오류가 발생했습니다." });
    }
  });

  // 내가 쓴 모든 노트 반환
  app.get("/api/my-notes", requireAuth, async (req, res) => {
    try {
      const notes = await storage.getAllUserNotes(req.user!.id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "내 노트 목록을 불러오는 중 오류가 발생했습니다." });
    }
  });

  // Setup initial admin (only if no admin exists)
  app.post("/api/setup-admin", async (req, res) => {
    try {
      // Check if any admin already exists
      const existingAdmin = await storage.getUserByRole("admin");
      if (existingAdmin) {
        return res.status(400).json({ message: "관리자 계정이 이미 존재합니다." });
      }

      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: "모든 필드를 입력해주세요." });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const admin = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: "admin",
        isApproved: true
      });

      res.status(201).json({ message: "관리자 계정이 생성되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "관리자 계정 생성 중 오류가 발생했습니다." });
    }
  });

  // Admin user management routes
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response for security
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "사용자 목록을 불러오는 중 오류가 발생했습니다." });
    }
  });

  // Google Drive API integration routes
  app.get("/api/google-drive/validate-key", requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          message: "Google Drive API 키가 설정되지 않았습니다.",
          hasKey: false 
        });
      }

      // Test API key with a simple request to check permissions
      const testResponse = await fetch(`https://www.googleapis.com/drive/v3/about?fields=user&key=${apiKey}`);
      
      if (testResponse.ok) {
        const data = await testResponse.json();
        res.json({
          message: "API 키가 유효하며 공개 데이터 읽기 권한이 있습니다.",
          hasKey: true,
          hasPermission: true,
          user: data.user
        });
      } else {
        const errorData = await testResponse.json();
        res.json({
          message: "API 키 권한 확인 실패",
          hasKey: true,
          hasPermission: false,
          error: errorData.error
        });
      }
    } catch (error) {
      res.status(500).json({ 
        message: "API 키 유효성 검사 중 오류가 발생했습니다.",
        error: (error as Error)?.message || String(error)
      });
    }
  });

  app.get("/api/google-drive/files", requireAdmin, async (req, res) => {
    try {
      // This endpoint would integrate with Google Drive API
      // For now, return a placeholder response
      res.json({
        message: "Google Drive API integration required",
        files: []
      });
    } catch (error) {
      res.status(500).json({ message: "Google Drive 파일을 불러오는 중 오류가 발생했습니다." });
    }
  });

  // My Courses routes
  app.get("/api/my-courses", requireAuth, async (req, res) => {
    try {
      const courses = await storage.getUserCourses(req.user!.id);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "내 강의 목록을 불러오는 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/my-courses", requireAuth, async (req, res) => {
    try {
      const { videoId } = req.body;
      if (!videoId) {
        return res.status(400).json({ message: "videoId가 필요합니다." });
      }
      await storage.addUserCourse(req.user!.id, videoId);
      res.status(201).json({ message: "강의가 추가되었습니다." });
    } catch (error) {
      res.status(400).json({ message: "강의 추가 중 오류가 발생했습니다." });
    }
  });

  app.delete("/api/my-courses/:videoId", requireAuth, async (req, res) => {
    try {
      const { videoId } = req.params;
      await storage.removeUserCourse(req.user!.id, parseInt(videoId));
      res.json({ message: "강의가 삭제되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "강의 삭제 중 오류가 발생했습니다." });
    }
  });

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // 간단한 응답으로 시작
      res.json({ 
        status: "healthy", 
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`[HEALTH] 오류:`, error);
      res.status(500).json({ 
        status: "unhealthy", 
        error: (error as Error)?.message || String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
