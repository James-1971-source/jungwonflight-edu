import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Bookmark, 
  RotateCcw,
  SkipForward,
  SkipBack,
  Settings,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Video, UserNote } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface NativeVideoPlayerProps {
  video: Video;
  onVideoEnd?: () => void;
}

export function NativeVideoPlayer({ video, onVideoEnd }: NativeVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [note, setNote] = useState("");
  const [watchedSegments, setWatchedSegments] = useState<Set<number>>(new Set());
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [bufferedPercentage, setBufferedPercentage] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery<UserNote[]>({
    queryKey: ["/api/notes", video.id],
  });

  // Load existing progress
  const { data: userProgress } = useQuery<any[]>({
    queryKey: ["/api/progress"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/progress");
      return response.json();
    },
  });

  // Set initial progress from saved data
  useEffect(() => {
    if (userProgress && videoRef.current) {
      const videoProgress = userProgress.find((p: any) => p.videoId === video.id);
      if (videoProgress && videoProgress.watchedDuration > 0) {
        videoRef.current.currentTime = videoProgress.watchedDuration;
        setCurrentTime(videoProgress.watchedDuration);
        
        // Reconstruct watched segments
        const segments = new Set<number>();
        for (let i = 0; i < Math.floor(videoProgress.watchedDuration / 10); i++) {
          segments.add(i);
        }
        setWatchedSegments(segments);
      }
    }
  }, [userProgress, video.id]);

  // Video event handlers
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
    };

    const handleTimeUpdate = () => {
      const time = videoElement.currentTime;
      setCurrentTime(time);
      
      // Track 10-second segments
      const currentSegment = Math.floor(time / 10);
      if (!watchedSegments.has(currentSegment)) {
        const newWatchedSegments = new Set(watchedSegments);
        newWatchedSegments.add(currentSegment);
        setWatchedSegments(newWatchedSegments);
      }

      // Save progress every 15 seconds
      const now = Date.now();
      if (now - lastUpdateTime > 15000) {
        const watchedDuration = Math.max(time, watchedSegments.size * 10);
        const progressPercentage = duration > 0 ? (watchedDuration / duration) * 100 : 0;
        
        progressMutation.mutate({
          videoId: video.id,
          watchedDuration,
          completed: progressPercentage >= 80,
        });
        
        setLastUpdateTime(now);
      }
    };

    const handleProgress = () => {
      if (videoElement.buffered.length > 0) {
        const buffered = videoElement.buffered.end(videoElement.buffered.length - 1);
        const bufferedPercent = (buffered / videoElement.duration) * 100;
        setBufferedPercentage(bufferedPercent);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      handleVideoEnd();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('progress', handleProgress);
    videoElement.addEventListener('ended', handleEnded);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('progress', handleProgress);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
    };
  }, [watchedSegments, lastUpdateTime, duration]);

  // Hide controls timeout
  useEffect(() => {
    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying]);

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

  const handleVideoEnd = () => {
    const finalWatchedDuration = Math.max(currentTime, watchedSegments.size * 10);
    
    progressMutation.mutate({
      videoId: video.id,
      watchedDuration: finalWatchedDuration,
      completed: true,
    });
    
    toast({
      title: "강의 완료!",
      description: "강의를 성공적으로 완료했습니다.",
    });
    
    onVideoEnd?.();
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleTimeSeek = (newTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    
    if (isMuted) {
      videoRef.current.volume = volume;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleFullscreenToggle = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    handleTimeSeek(newTime);
  };

  const handleSaveNote = () => {
    if (!note.trim()) return;
    
    noteMutation.mutate({
      videoId: video.id,
      content: note,
    });
  };

  const handleMarkComplete = () => {
    progressMutation.mutate({
      videoId: video.id,
      watchedDuration: duration,
      completed: true,
    });
    toast({
      title: "완료 처리됨",
      description: "강의를 완료로 표시했습니다.",
    });
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const actualWatchedDuration = Math.max(currentTime, watchedSegments.size * 10);
  const actualProgressPercentage = duration > 0 ? (actualWatchedDuration / duration) * 100 : 0;

  // 비디오 파일 URL 생성 - 로컬 파일 기반
  const filename = video.googleDriveFileId?.replace('local:', '') || '';
  const videoUrl = filename ? `/uploads/videos/${filename}` : '';
  const thumbnailUrl = video.thumbnailUrl || '';

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 overflow-hidden shadow-lg">
        {/* Video Player Container */}
        <div 
          ref={containerRef}
          className="relative bg-black aspect-video overflow-hidden cursor-pointer"
          onMouseMove={() => setShowControls(true)}
          onMouseLeave={() => !isPlaying && setShowControls(true)}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={videoUrl}
            poster={thumbnailUrl}
            controls
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
              }
            }}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={(e) => {
              console.error('비디오 로드 오류:', e);
              toast({
                title: "비디오 로드 오류",
                description: "비디오를 로드할 수 없습니다.",
                variant: "destructive",
              });
            }}
          />

          {/* Custom Controls Overlay */}
          {showControls && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 flex flex-col justify-between p-4">
              {/* Top Info */}
              <div className="flex justify-between items-start">
                <div className="bg-black/60 rounded-lg px-3 py-2 text-white text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-aviation-blue font-medium">
                      {Math.round(actualProgressPercentage)}% 완료
                    </span>
                    <span className="text-slate-300">
                      {formatTime(actualWatchedDuration)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFullscreenToggle}
                    className="text-white bg-black/60 hover:bg-black/80"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Center Play Button */}
              <div className="flex-1 flex items-center justify-center">
                <Button
                  onClick={handlePlayPause}
                  className="bg-aviation-blue/90 hover:bg-aviation-blue text-white w-16 h-16 rounded-full"
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                </Button>
              </div>

              {/* Bottom Controls */}
              <div className="space-y-3">
                {/* Progress Bar */}
                <div className="flex items-center space-x-3 text-white text-sm">
                  <span>{formatTime(currentTime)}</span>
                  <div className="flex-1 relative">
                    <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden">
                      {/* Buffer Bar */}
                      <div 
                        className="absolute top-0 left-0 h-full bg-gray-400 rounded-full transition-all duration-300"
                        style={{ width: `${bufferedPercentage}%` }}
                      />
                      {/* Progress Bar */}
                      <div 
                        className="absolute top-0 left-0 h-full bg-aviation-blue rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    {/* Clickable overlay */}
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      value={currentTime}
                      onChange={(e) => handleTimeSeek(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <span>{formatTime(duration)}</span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSkip(-10)}
                      className="text-white bg-black/60 hover:bg-black/80"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePlayPause}
                      className="text-white bg-black/60 hover:bg-black/80"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSkip(10)}
                      className="text-white bg-black/60 hover:bg-black/80"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMuteToggle}
                      className="text-white bg-black/60 hover:bg-black/80"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    <div className="w-20">
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        onValueChange={([value]) => handleVolumeChange(value)}
                        max={1}
                        step={0.1}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Video Details */}
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{video.title}</h2>
            <p className="text-slate-300 leading-relaxed">{video.description}</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Button
              onClick={handlePlayPause}
              className="bg-aviation-blue hover:bg-blue-700"
            >
              {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isPlaying ? "일시정지" : "동영상 시청하기"}
            </Button>
            
            <Button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                }
              }}
              variant="outline"
              className="text-white border-slate-600 hover:bg-slate-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              처음부터 다시보기
            </Button>
            
            <Button
              onClick={handleMarkComplete}
              variant="outline"
              className="text-white border-slate-600 hover:bg-slate-700"
            >
              강의 완료 처리
            </Button>
          </div>

          {/* Video Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-slate-700 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-aviation-blue">{Math.round(actualProgressPercentage)}%</div>
              <div className="text-sm text-slate-300">실제 진도율</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-aviation-orange">{formatTime(duration)}</div>
              <div className="text-sm text-slate-300">총 시간</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{formatTime(actualWatchedDuration)}</div>
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