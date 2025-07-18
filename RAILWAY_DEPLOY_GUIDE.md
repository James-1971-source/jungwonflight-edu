# Railway 배포 가이드

## 🚀 Railway 배포 시 설정해야 할 환경 변수

### 필수 환경 변수
```bash
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your-super-secret-session-key
PORT=5000
```

### 선택적 환경 변수
```bash
REPLIT_DEV_DOMAIN=your-domain.com (Railway에서는 불필요)
```

## 🔧 해결된 문제점들

1. **헬스체크 실패 문제**
   - `/` 엔드포인트에서 명확한 200 상태 코드 반환
   - 추가 `/health` 엔드포인트 제공
   - 환경 정보 포함하여 디버깅 용이

2. **마이그레이션 오류**
   - 중복 컬럼 생성 방지
   - 마이그레이션 실패 시 서버 중단 방지
   - Railway에서 Drizzle 마이그레이션 자동 실행

3. **쿠키/세션 설정**
   - 환경에 따른 secure 설정 (개발: false, 프로덕션: true)
   - SameSite 설정 최적화

4. **데이터베이스 연결**
   - 환경에 따른 SSL 설정 (개발: prefer, 프로덕션: require)
   - 연결 풀 크기 최적화

## 📋 Railway 배포 전 체크리스트

- [ ] DATABASE_URL 환경 변수 설정
- [ ] SESSION_SECRET 환경 변수 설정  
- [ ] NODE_ENV=production 설정
- [ ] Postgres 데이터베이스 연결 확인
- [ ] 빌드 명령어: `npm run build:all`
- [ ] 시작 명령어: `npm start`
- [ ] 헬스체크 경로: `/`

## 🔄 배포 과정

1. GitHub에 소스 코드 푸시
2. Railway가 자동으로 빌드 시작
3. `npm run build:all` 실행
4. 환경 변수 적용
5. `npm start`로 서버 시작
6. 헬스체크 통과 시 배포 완료

## 🐛 디버깅 팁

- 헬스체크 실패 시 `/` 엔드포인트 직접 확인
- 로그에서 데이터베이스 연결 오류 확인
- 환경 변수 설정 재확인
- 빌드 로그에서 오류 확인