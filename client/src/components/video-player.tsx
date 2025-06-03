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
          {/* Google Drive Video Preview */}
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <div className="text-center p-8">
              <img 
                src={googleDriveService.getThumbnailUrl(video.googleDriveFileId, 800)}
                alt={video.title}
                className="w-full max-w-md mx-auto rounded-lg mb-6 shadow-lg"
              />
              <h3 className="text-xl font-semibold text-white mb-4">{video.title}</h3>
              <p className="text-slate-300 mb-6">Google Drive에서 고화질 동영상을 시청하세요</p>
              <div className="space-y-3 relative z-10">
                <a
                  href={`https://drive.google.com/file/d/${video.googleDriveFileId}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-aviation-blue hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer relative z-20"
                  style={{ pointerEvents: 'auto' }}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Google Drive에서 시청하기
                </a>
                <Button
                  onClick={() => {
                    progressMutation.mutate({
                      videoId: video.id,
                      watchedDuration: video.duration || 0,
                      completed: true,
                    });
                  }}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors relative z-20"
                  style={{ pointerEvents: 'auto' }}
                >
                  ✓ 시청 완료 표시
                </Button>
                <div className="text-sm text-slate-400">
                  동영상 시청 후 완료 버튼을 클릭하세요
                </div>
              </div>
            </div>
          </div>
          
          {/* Video Info Overlay - Only show at bottom */}
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
