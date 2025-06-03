import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings, 
  Bookmark, 
  Share2 
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Video, UserNote } from "@shared/schema";
import { googleDriveService } from "@/lib/google-drive";
import { apiRequest } from "@/lib/queryClient";

interface VideoPlayerProps {
  video: Video;
  onVideoEnd?: () => void;
}

export function VideoPlayer({ video, onVideoEnd }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [note, setNote] = useState("");
  const [watchedSegments, setWatchedSegments] = useState<Set<number>>(new Set());
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery<UserNote[]>({
    queryKey: ["/api/notes", video.id],
  });

  const progressMutation = useMutation({
    mutationFn: (data: { videoId: number; watchedDuration: number; completed: boolean }) =>
      apiRequest("POST", "/api/progress", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
    },
  });

  const noteMutation = useMutation({
    mutationFn: (data: { videoId: number; content: string }) =>
      apiRequest("POST", "/api/notes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes", video.id] });
      setNote("");
      toast({
        title: "노트 저장 완료",
        description: "학습 노트가 성공적으로 저장되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "노트 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Track actual watched time by segments
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    
    // Track 10-second segments that have been watched
    const currentSegment = Math.floor(time / 10);
    if (!watchedSegments.has(currentSegment)) {
      const newWatchedSegments = new Set(watchedSegments);
      newWatchedSegments.add(currentSegment);
      setWatchedSegments(newWatchedSegments);
    }
    
    // Update progress every 15 seconds to avoid too frequent API calls
    const now = Date.now();
    if (now - lastUpdateTime > 15000) {
      const actualWatchedTime = watchedSegments.size * 10; // 10 seconds per segment
      const completionPercentage = duration > 0 ? (actualWatchedTime / duration) : 0;
      const completed = completionPercentage >= 0.8; // 80% completion required
      
      progressMutation.mutate({
        videoId: video.id,
        watchedDuration: actualWatchedTime,
        completed,
      });
      
      setLastUpdateTime(now);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    progressMutation.mutate({
      videoId: video.id,
      watchedDuration: duration,
      completed: true,
    });
    onVideoEnd?.();
  };

  const handleSaveNote = () => {
    if (!note.trim()) return;
    
    noteMutation.mutate({
      videoId: video.id,
      content: note,
    });
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const streamingUrl = googleDriveService.getStreamingUrl(video.googleDriveFileId);
  const directUrl = googleDriveService.getDirectUrl(video.googleDriveFileId);

  return (
    <div className="space-y-8">
      <Card className="bg-slate-800 overflow-hidden shadow-lg">
        {/* Video Player */}
        <div className="relative bg-black aspect-video">
          {/* HTML5 Video Player */}
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleVideoEnd}
            onVolumeChange={(e) => {
              setVolume(e.currentTarget.volume);
              setIsMuted(e.currentTarget.muted);
            }}
            poster={googleDriveService.getThumbnailUrl(video.googleDriveFileId, 800)}
          >
            <source src={googleDriveService.getDirectUrl(video.googleDriveFileId)} type="video/mp4" />
            <p className="text-white p-4">
              브라우저가 비디오를 지원하지 않습니다. 
              <a 
                href={`https://drive.google.com/file/d/${video.googleDriveFileId}/view`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-aviation-blue hover:underline ml-2"
              >
                Google Drive에서 시청하기
              </a>
            </p>
          </video>
          
          {/* Progress Overlay */}
          <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
            진도: {watchedSegments.size * 10}초 / {Math.round(duration)}초 
            ({duration > 0 ? Math.round((watchedSegments.size * 10 / duration) * 100) : 0}%)
          </div>
          

        </div>
        
        {/* Video Details */}
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-white mb-3">{video.title}</h2>
          {video.description && (
            <p className="text-slate-300 leading-relaxed mb-4">
              {video.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-sm text-slate-400 border-t border-slate-700 pt-4">
            <div className="flex items-center space-x-4">
              <span>업로드: {new Date(video.createdAt).toLocaleDateString('ko-KR')}</span>
              <span>조회수: 1,234회</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="hover:text-aviation-blue">
                <Bookmark className="h-4 w-4 mr-1" />
                북마크
              </Button>
              <Button variant="ghost" size="sm" className="hover:text-aviation-blue">
                <Share2 className="h-4 w-4 mr-1" />
                공유
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Notes Section */}
      <Card className="bg-slate-800">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">학습 노트</h3>
          
          {/* Existing Notes */}
          {notes.length > 0 && (
            <div className="mb-4 space-y-2">
              {notes.map((userNote) => (
                <div key={userNote.id} className="bg-slate-700 rounded-lg p-3">
                  <p className="text-slate-200 text-sm">{userNote.content}</p>
                  <p className="text-slate-400 text-xs mt-1">
                    {new Date(userNote.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {/* New Note */}
          <div className="bg-slate-700 rounded-lg p-4">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-transparent text-slate-200 placeholder-slate-400 resize-none focus:outline-none border-none"
              rows={4}
              placeholder="이 강의에 대한 메모를 작성하세요..."
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={handleSaveNote}
                disabled={!note.trim() || noteMutation.isPending}
                className="bg-aviation-blue hover:bg-blue-700 text-white"
              >
                {noteMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
