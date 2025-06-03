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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery<UserNote[]>({
    queryKey: ["/api/notes", video.id],
  });

  // Auto-track progress when playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      interval = setInterval(() => {
        const newTime = currentTime + 1; // Increment by 1 second
        setCurrentTime(newTime);
        handleTimeUpdate(newTime);
        
        if (newTime >= duration) {
          setIsPlaying(false);
          handleVideoEnd();
        }
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, currentTime, duration]);

  const progressMutation = useMutation({
    mutationFn: (data: { videoId: number; watchedDuration: number; completed: boolean }) =>
      apiRequest("POST", "/api/progress", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "진도 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const noteMutation = useMutation({
    mutationFn: (data: { videoId: number; content: string }) =>
      apiRequest("POST", "/api/notes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes", video.id] });
      setNote("");
      toast({
        title: "노트 저장됨",
        description: "노트가 성공적으로 저장되었습니다.",
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

    // Save progress every 15 seconds to avoid too frequent API calls
    const now = Date.now();
    if (now - lastUpdateTime > 15000) {
      const watchedDuration = watchedSegments.size * 10;
      const progressPercentage = (watchedDuration / duration) * 100;
      
      progressMutation.mutate({
        videoId: video.id,
        watchedDuration,
        completed: progressPercentage >= 80,
      });
      
      setLastUpdateTime(now);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    if ((currentTime / duration) >= 0.8) {
      progressMutation.mutate({
        videoId: video.id,
        watchedDuration: duration,
        completed: true,
      });
      toast({
        title: "강의 완료!",
        description: "강의를 성공적으로 완료했습니다.",
      });
    }
    onVideoEnd?.();
  };

  const handlePlayPause = () => {
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    
    // Try to communicate with iframe
    if (iframeRef.current) {
      try {
        const message = newIsPlaying ? 
          '{"event":"command","func":"playVideo","args":""}' : 
          '{"event":"command","func":"pauseVideo","args":""}';
        
        iframeRef.current.contentWindow?.postMessage(message, '*');
      } catch (error) {
        console.log('iframe postMessage not available');
      }
    }
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

  return (
    <div className="space-y-8">
      <Card className="bg-slate-800 overflow-hidden shadow-lg">
        {/* Video Player */}
        <div className="relative bg-black aspect-video overflow-hidden">
          {/* Video thumbnail and play overlay */}
          <div className="relative w-full h-full bg-slate-900">
            {/* Video thumbnail */}
            <img 
              src={googleDriveService.getThumbnailUrl(video.googleDriveFileId, 800)}
              alt={video.title}
              className="w-full h-full object-cover"
            />
            
            {/* Play overlay */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center cursor-pointer"
              onClick={handlePlayPause}
            >
              {!isPlaying ? (
                <div className="bg-black bg-opacity-60 rounded-full p-8 hover:bg-opacity-80 transition-all">
                  <Play className="w-20 h-20 text-white" />
                </div>
              ) : (
                <div className="bg-black bg-opacity-60 rounded-full p-8 hover:bg-opacity-80 transition-all">
                  <Pause className="w-20 h-20 text-white" />
                </div>
              )}
            </div>
            
            {/* Hidden iframe for actual video (only shown when playing) */}
            {isPlaying && (
              <iframe
                ref={iframeRef}
                src={`https://drive.google.com/file/d/${video.googleDriveFileId}/preview?autoplay=1`}
                className="absolute inset-0 w-full h-full z-20"
                allow="autoplay"
                allowFullScreen
                title={video.title}
                style={{
                  width: '120%',
                  height: '150%',
                  left: '-10%',
                  top: '-25%'
                }}
              />
            )}
          </div>
          
          {/* Progress Control Panel */}
          <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded pointer-events-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handlePlayPause}
                  className="bg-aviation-blue hover:bg-blue-700"
                  size="sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? " 일시정지" : " 재생"}
                </Button>
                <span className="text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <div className="text-sm">
                진도: {Math.round((currentTime / duration) * 100)}%
              </div>
            </div>
            <Progress value={(currentTime / duration) * 100} className="h-2" />
          </div>
        </div>
        
        {/* Video Details */}
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{video.title}</h2>
            <p className="text-slate-300 leading-relaxed">{video.description}</p>
          </div>

          {/* Video Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-slate-700 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-aviation-blue">{Math.round(progressPercentage)}%</div>
              <div className="text-sm text-slate-300">진도율</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-aviation-orange">{formatTime(duration)}</div>
              <div className="text-sm text-slate-300">총 시간</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{formatTime(currentTime)}</div>
              <div className="text-sm text-slate-300">시청 시간</div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Bookmark className="w-5 h-5 mr-2 text-aviation-blue" />
              학습 노트
            </h3>
            
            <div className="space-y-3">
              <Textarea
                placeholder="이 강의에 대한 노트를 작성하세요..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                rows={4}
              />
              <Button
                onClick={handleSaveNote}
                disabled={!note.trim() || noteMutation.isPending}
                className="bg-aviation-blue hover:bg-blue-700"
              >
                {noteMutation.isPending ? "저장 중..." : "노트 저장"}
              </Button>
            </div>

            {/* Previous Notes */}
            {notes.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-white mb-3">이전 노트</h4>
                <div className="space-y-3">
                  {notes.map((savedNote) => (
                    <div key={savedNote.id} className="bg-slate-700 p-4 rounded-lg">
                      <p className="text-slate-200">{savedNote.content}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(savedNote.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}