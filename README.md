# JungwonFlight-Edu 🛩️

(주)중원항공 비행교육원 온라인 교육 플랫폼 - Google Drive 기반 비디오 학습 관리 시스템 (LMS)

## 📋 프로젝트 개요

JungwonFlight-Edu는 항공 교육을 위한 전문적인 온라인 학습 플랫폼입니다. Google Drive에 저장된 동영상 강의를 스트리밍하고, 학습 진도를 추적하며, 학습 노트를 작성할 수 있는 종합적인 교육 관리 시스템입니다.

## ✨ 주요 기능

### 🎥 동영상 학습 시스템
- **Google Drive 연동**: 동영상을 Google Drive에 저장하고 임베드 플레이어로 직접 재생
- **진도 추적**: 10초 단위로 실제 시청 구간을 추적하여 정확한 진도율 관리
- **자동 완료 처리**: 80% 이상 시청 시 강의 자동 완료 처리
- **수동 진도 관리**: 시청 시작, 완료 처리, 시간 건너뛰기 등 수동 제어 가능
- **대체 플레이어**: 임베드 플레이어 오류 시 Google Drive로 직접 연결

### 👥 사용자 관리
- **역할 기반 접근 제어**: 관리자와 학생 계정 구분
- **승인 기반 가입**: 관리자가 학생 계정 승인 관리
- **안전한 인증**: Passport.js 기반 세션 인증

### 📚 콘텐츠 관리
- **카테고리별 분류**: 항공 교육 과정별 체계적 분류
  - 기초 비행 이론
  - 항공기 시스템  
  - 기상학
  - 항법
  - 비상 절차
- **동영상 메타데이터**: 제목, 설명, 썸네일, 재생 시간 관리

### 📝 학습 노트
- **강의별 노트 작성**: 각 동영상에 대한 개인 학습 노트
- **노트 히스토리**: 시간순 노트 관리 및 검색

### 📊 관리자 대시보드
- **콘텐츠 업로드**: Google Drive 파일 ID로 새 강의 추가
- **사용자 관리**: 교육생 계정 생성 및 승인 관리
- **통계 대시보드**: 총 동영상 수, 등록 교육생 수, 시청 통계

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# 데이터베이스 연결 (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/jungwonflight_edu"

# 세션 시크릿 (랜덤 문자열)
SESSION_SECRET="your-secret-key-here"

# Google Drive API (선택사항)
VITE_GOOGLE_DRIVE_API_KEY="your-google-drive-api-key"
```

### 3. 데이터베이스 초기화
```bash
# 데이터베이스 스키마 생성
npm run db:push

# 샘플 데이터 생성 (선택사항)
npm run db:seed
```

### 4. 개발 서버 실행
```bash
npm run dev
```

## 🔑 기본 계정 정보

시드 스크립트 실행 후 다음 계정으로 로그인할 수 있습니다:

### 관리자 계정
- **Username**: `admin`
- **Password**: `admin123!`
- **권한**: 모든 관리 기능 접근 가능

### 학생 계정  
- **Username**: `student1`
- **Password**: `student123!`
- **권한**: 강의 시청 및 노트 작성

## 📱 사용 방법

### 학생 사용법

1. **로그인**: 학생 계정으로 로그인
2. **강의 선택**: 사이드바에서 카테고리 선택 또는 전체 강의 보기
3. **동영상 시청**: 
   - 임베드된 플레이어에서 직접 재생
   - 플레이어 오류 시 "외부에서 시청" 버튼 클릭
   - 진도가 자동으로 저장됨
4. **노트 작성**: 강의 하단에서 학습 노트 작성 및 저장
5. **진도 확인**: 각 강의별 시청 진도율 확인

### 관리자 사용법

1. **관리자 로그인**: 관리자 계정으로 로그인 후 `/admin` 접속
2. **콘텐츠 업로드**:
   - Google Drive에 동영상 업로드
   - 파일 ID 복사 (URL에서 `/d/` 다음 부분)
   - "새 동영상 추가"에서 메타데이터와 함께 등록
3. **사용자 관리**: 새 교육생 계정 생성 및 관리
4. **통계 확인**: 대시보드에서 전체 시스템 통계 확인

## 🔧 Google Drive 연동 설정

### 1. Google Drive 파일 준비
1. Google Drive에 교육용 동영상 업로드
2. 파일을 "링크가 있는 모든 사용자"로 공유 설정
3. 공유 링크에서 파일 ID 추출:
   ```
   https://drive.google.com/file/d/1VdOzdSZiCBWsxXKAGEHzrsTr7hGGW_7z/view
                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                  이 부분이 파일 ID
   ```

### 2. API 키 설정 (선택사항)
Google Drive API 키를 설정하면 더 안정적인 연동이 가능합니다:
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. Google Drive API 활성화
3. API 키 생성 후 `.env` 파일에 추가

## 🛠️ 기술 스택

### Frontend
- **React 18** + **TypeScript**
- **Tailwind CSS** + **Radix UI**
- **React Query** (서버 상태 관리)
- **Wouter** (라우팅)
- **React Hook Form** (폼 관리)

### Backend  
- **Node.js** + **Express**
- **PostgreSQL** + **Drizzle ORM**
- **Passport.js** (인증)
- **bcrypt** (비밀번호 암호화)

### Development
- **Vite** (번들링)
- **TypeScript** (타입 안전성)
- **ESBuild** (빠른 빌드)

## 🎨 UI/UX 특징

- **항공 테마**: 항공 교육에 특화된 디자인 (aviation-blue, aviation-orange)
- **다크 모드**: 눈의 피로를 줄이는 다크 테마
- **반응형 디자인**: 데스크톱, 태블릿, 모바일 지원
- **직관적 UI**: 교육자와 학습자 모두 쉽게 사용할 수 있는 인터페이스

## 🚨 문제 해결

### 동영상이 재생되지 않는 경우
1. Google Drive 파일이 올바르게 공유되었는지 확인
2. 파일 ID가 정확한지 확인  
3. "외부에서 시청" 버튼으로 대체 재생
4. 브라우저의 팝업 차단 해제

### 로그인 문제
1. 사용자 계정이 승인되었는지 확인
2. 비밀번호 대소문자 확인
3. 관리자에게 계정 승인 요청

### 진도가 저장되지 않는 경우
1. 로그인 상태 확인
2. 네트워크 연결 상태 확인
3. "시청 시작" 버튼 클릭 후 재생
4. 수동으로 "강의 완료 처리" 버튼 사용

## 📞 지원

문의사항이나 버그 리포트는 시스템 관리자에게 연락해주세요.

---

**중원대학교 항공운항학과** | JungwonFlight-Edu v1.0.0 
