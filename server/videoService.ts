import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// FFmpeg 바이너리 경로 설정
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export interface VideoMetadata {
  duration: number;
  resolution: string;
  size: number;
  format: string;
}

export interface ProcessedVideo {
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  thumbnailPath?: string;
  duration?: number;
  resolution?: string;
}

export class VideoService {
  private static readonly UPLOADS_DIR = path.join(__dirname, 'uploads');
  private static readonly VIDEOS_DIR = path.join(VideoService.UPLOADS_DIR, 'videos');
  private static readonly THUMBNAILS_DIR = path.join(VideoService.UPLOADS_DIR, 'thumbnails');

  static async ensureDirectoriesExist() {
    try {
      await fs.mkdir(VideoService.UPLOADS_DIR, { recursive: true });
      await fs.mkdir(VideoService.VIDEOS_DIR, { recursive: true });
      await fs.mkdir(VideoService.THUMBNAILS_DIR, { recursive: true });
    } catch (error) {
      console.error('디렉토리 생성 실패:', error);
    }
  }

  static async getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('비디오 스트림을 찾을 수 없습니다'));
          return;
        }

        const duration = metadata.format.duration || 0;
        const width = videoStream.width || 0;
        const height = videoStream.height || 0;
        const size = metadata.format.size || 0;
        const format = metadata.format.format_name || '';

        resolve({
          duration: Math.round(duration),
          resolution: `${width}x${height}`,
          size,
          format,
        });
      });
    });
  }

  static async generateThumbnail(videoPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const thumbnailFilename = `thumb_${Date.now()}.jpg`;
      const thumbnailPath = path.join(outputPath, thumbnailFilename);

      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['10%'], // 영상의 10% 지점에서 썸네일 생성
          filename: thumbnailFilename,
          folder: outputPath,
          size: '640x360' // 썸네일 크기
        })
        .on('end', () => {
          resolve(thumbnailPath);
        })
        .on('error', (err) => {
          console.error('썸네일 생성 실패:', err);
          reject(err);
        });
    });
  }

  static async processVideo(file: Express.Multer.File): Promise<ProcessedVideo> {
    await VideoService.ensureDirectoriesExist();

    const filename = `video_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${file.originalname.split('.').pop()}`;
    const filePath = path.join(VideoService.VIDEOS_DIR, filename);

    // 파일을 uploads/videos 디렉토리로 이동
    await fs.writeFile(filePath, file.buffer);

    const processedVideo: ProcessedVideo = {
      filename,
      originalName: file.originalname,
      filePath: `/uploads/videos/${filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
    };

    try {
      // 비디오 메타데이터 추출
      const metadata = await VideoService.getVideoMetadata(filePath);
      processedVideo.duration = metadata.duration;
      processedVideo.resolution = metadata.resolution;

      // 썸네일 생성
      const thumbnailPath = await VideoService.generateThumbnail(filePath, VideoService.THUMBNAILS_DIR);
      const thumbnailFilename = path.basename(thumbnailPath);
      processedVideo.thumbnailPath = `/uploads/thumbnails/${thumbnailFilename}`;
    } catch (error) {
      console.error('비디오 처리 중 오류:', error);
      // 메타데이터 추출이 실패해도 파일 업로드는 성공으로 처리
    }

    return processedVideo;
  }

  static async deleteVideo(filePath: string, thumbnailPath?: string) {
    try {
      const fullVideoPath = path.join(__dirname, filePath.replace('/uploads/', 'uploads/'));
      console.log(`비디오 파일 삭제 시도: ${fullVideoPath}`);
      
      try {
        await fs.unlink(fullVideoPath);
        console.log(`비디오 파일 삭제 완료: ${fullVideoPath}`);
      } catch (videoError) {
        console.log(`비디오 파일 삭제 실패 (파일이 없을 수 있음): ${fullVideoPath}`);
      }

      if (thumbnailPath) {
        const fullThumbnailPath = path.join(__dirname, thumbnailPath.replace('/uploads/', 'uploads/'));
        console.log(`썸네일 파일 삭제 시도: ${fullThumbnailPath}`);
        
        try {
          await fs.unlink(fullThumbnailPath);
          console.log(`썸네일 파일 삭제 완료: ${fullThumbnailPath}`);
        } catch (thumbError) {
          console.log(`썸네일 파일 삭제 실패 (파일이 없을 수 있음): ${fullThumbnailPath}`);
        }
      }
    } catch (error) {
      console.error('파일 삭제 중 오류:', error);
      // 파일 삭제 실패해도 예외를 던지지 않음 (DB 삭제는 계속 진행)
    }
  }

  static getVideoStreamUrl(filename: string): string {
    return `/uploads/videos/${filename}`;
  }

  static getThumbnailUrl(filename: string): string {
    return `/uploads/thumbnails/${filename}`;
  }
} 