import { useState, useEffect } from "react";
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

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    
    // Update progress every 10 seconds
    if (time % 10 === 0) {
      const completed = time >= duration * 0.9; // Consider completed if watched 90%
      progressMutation.mutate({
        videoId: video.id,
        watchedDuration: time,
        completed,
      });
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
        <div className="relative bg-black video-aspect">
          {/* Fallback to HTML5 video if iframe fails */}
          <video
            className="w-full h-full"
            controls
            poster={googleDriveService.getThumbnailUrl(video.googleDriveFileId, 800)}
            preload="metadata"
            onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget.currentTime)}
            onEnded={handleVideoEnd}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            <source src={directUrl} type="video/mp4" />
            <source src={streamingUrl} type="video/mp4" />
            <p className="text-white p-4">
              브라우저가 HTML5 동영상을 지원하지 않습니다. 
              <a href={streamingUrl} className="text-aviation-blue hover:underline" target="_blank" rel="noopener noreferrer">
                Google Drive에서 직접 보기
              </a>
            </p>
          </video>
          
          {/* Video Controls Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
            <Button
              onClick={handlePlayPause}
              size="lg"
              className="bg-aviation-blue hover:bg-blue-700 rounded-full p-4 text-white text-2xl"
            >
              {isPlaying ? <Pause /> : <Play />}
            </Button>
          </div>
          
          {/* Video Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            <div className="flex items-center justify-between text-white">
              <div>
                <h3 className="font-medium">{video.title}</h3>
                <p className="text-sm text-slate-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="hover:text-aviation-blue"
                >
                  {isMuted ? <VolumeX /> : <Volume2 />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-aviation-blue"
                >
                  <Maximize />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-aviation-blue"
                >
                  <Settings />
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <Progress value={progressPercentage} className="h-1" />
            </div>
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
