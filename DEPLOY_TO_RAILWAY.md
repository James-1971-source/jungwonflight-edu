# JungwonFlight-Edu Railway 배포 가이드

이 문서는 로컬PC에서 개발하던 교육 플랫폼(React + Node.js + SQLite)을 Railway 클라우드에 PostgreSQL 기반으로 배포하고 서비스하는 전체 과정을 단계별로 안내합니다.

---

## 1. 사전 준비

- GitHub 저장소 준비 (코드 푸시)
- Railway 계정 생성 및 로그인

---

## 2. 코드베이스 준비

### 2-1. .gitignore 파일 업데이트
- node_modules, uploads, database.sqlite 등 민감/불필요 파일 제외

### 2-2. PostgreSQL 지원 코드로 변경
- SQLite → PostgreSQL로 DB 연결 코드 수정
- `server/db.ts`, `drizzle.config.ts` 등에서 DATABASE_URL 환경변수 사용
- `connect-pg-simple`로 세션 스토어 변경

### 2-3. seed 스크립트 준비
- `server/seed.ts` 등 초기 데이터(관리자 계정 등) 입력 스크립트 준비

---

## 3. Railway 배포 설정

### 3-1. railway.json 파일 작성/수정
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npm start",
    "releaseCommand": "npm run db:push && npm run db:seed",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 3-2. Vite 빌드 경로 설정
- `vite.config.ts`에서 build.outDir을 `../dist/public`으로 지정
- tailwindcss 플러그인 import 제거, config 파일은 프로젝트 루트에 위치

---

## 4. GitHub에 커밋/푸시
```bash
git add .
git commit -m "Deploy: Railway 배포 자동화 및 PostgreSQL 전환"
git push origin main
```

---

## 5. Railway에서 프로젝트 생성 및 GitHub 연동
1. Railway 대시보드 → New Project → GitHub 저장소 선택
2. PostgreSQL 데이터베이스 추가 (Add Plugin → PostgreSQL)
3. 환경변수(Variables) 설정
   - DATABASE_URL (Railway에서 제공)
   - SESSION_SECRET (임의의 긴 문자열)
   - NODE_ENV=production

---

## 6. 도메인(공개) 설정
1. Architecture 화면에서 서비스 블록 클릭
2. Settings → Public Networking → 도메인 확인/생성
3. https://xxxxxx.up.railway.app 주소로 접속

---

## 7. seed 자동 실행 및 서비스 점검
- 배포 시 releaseCommand로 db:push, db:seed가 자동 실행됨
- 로그인 화면에서 seed에 등록된 관리자 계정으로 로그인
- 주요 기능(동영상 업로드/재생, 내 강의, 관리자 기능 등) 테스트

---

## 8. 운영 팁
- 관리자 계정 비밀번호 변경, 불필요 계정 삭제
- Metrics/Logs로 서비스 상태 모니터링
- 데이터베이스 백업 정책 고민
- 도메인 커스텀 연결(선택)

---

## 부록: 자주 발생하는 문제
- 로그인 실패: seed 데이터가 DB에 없는 경우, releaseCommand에 db:seed 추가 필요
- Not Found: 서비스 도메인 미공개(Expose), 포트 설정 확인
- 빌드 실패: vite.config.ts, tailwind/postcss 설정, 경로 문제 등 점검

---

**이 문서를 참고하여 로컬 개발 환경에서 Railway 클라우드 서비스로 안전하게 이전할 수 있습니다.** 