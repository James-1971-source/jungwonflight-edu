# 1. Node.js 공식 이미지 사용
FROM node:20

# 2. ffmpeg(=ffprobe 포함) 설치
RUN apt-get update && apt-get install -y ffmpeg

# 3. 작업 디렉토리 설정
WORKDIR /app

# 4. 의존성 복사 및 설치
COPY package*.json ./
RUN npm install

# 5. 소스 복사
COPY . .

# 6. 빌드 (필요시)
RUN npm run build

# 7. 앱 실행
CMD ["npm", "start"]