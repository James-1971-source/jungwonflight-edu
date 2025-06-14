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
  Bookmark, 
  RotateCcw,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Video, UserNote } from "@shared/schema";
import { googleDriveService } from "@/lib/google-drive";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VideoPlayerProps {
  video: Video;
  onVideoEnd?: () => void;
}

export function VideoPlayer({ video, onVideoEnd }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [note, setNote] = useState("");
  const [watchedSegments, setWatchedSegments] = useState<Set<number>>(new Set());
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [useAlternativePlayer, setUseAlternativePlayer] = useState(false); // 기본적으로 내장 플레이어 사용
  const [embedAttempts, setEmbedAttempts] = useState(0);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const notesQueryEnabled = video.id !== null && video.id !== undefined;
  const { data: notes = [] } = useQuery<UserNote[]>({
    queryKey: [`/api/notes/${video.id}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/notes/${video.id}`);
      return response.json();
    },
    enabled: notesQueryEnabled,
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
    if (userProgress) {
      const videoProgress = userProgress.find((p: any) => p.videoId === video.id);
      if (videoProgress) {
        setCurrentTime(videoProgress.watchedDuration || 0);
        // Reconstruct watched segments from saved duration
        const segments = new Set<number>();
        for (let i = 0; i < Math.floor(videoProgress.watchedDuration / 10); i++) {
          segments.add(i);
        }
        setWatchedSegments(segments);
      }
    }
  }, [userProgress, video.id]);

  // Auto-track progress when playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      interval = setInterval(() => {
        const newTime = currentTime + 1;
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

  // Hide controls after 3 seconds of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isPlaying && showControls) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isPlaying, showControls]);

  // Auto-hide play instruction overlay after 10 seconds
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isPlaying) {
      timeout = setTimeout(() => {
        setIsPlaying(false);
      }, 10000); // 10초 후 자동으로 오버레이 제거
    }
    
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isPlaying]);

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

  const handleTimeUpdate = (time: number) => {
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
      const watchedDuration = Math.max(time, watchedSegments.size * 10);
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
    setIsPlaying(!isPlaying);
  };

  const handleTimeSeek = (newTime: number) => {
    setCurrentTime(Math.max(0, Math.min(newTime, duration)));
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSaveNote = () => {
    if (!note.trim()) return;
    
    noteMutation.mutate({
      videoId: Number(video.id),
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

  const handleIframeError = () => {
    console.log("Iframe error occurred, attempt:", embedAttempts);
    
    if (embedAttempts < 2) {
      // Try different embed approach
      setEmbedAttempts(prev => prev + 1);
      setTimeout(() => {
        if (videoRef.current) {
          const newSrc = embedAttempts === 0 
            ? `https://drive.google.com/file/d/${video.googleDriveFileId}/preview?usp=drivesdk`
            : `https://drive.google.com/uc?export=view&id=${video.googleDriveFileId}`;
          videoRef.current.src = newSrc;
        }
      }, 1000);
    } else {
      setIframeError(true);
      toast({
        title: "동영상 로딩 오류",
        description: "Google Drive에서 직접 시청해주세요.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const actualWatchedDuration = Math.max(currentTime, watchedSegments.size * 10);
  const actualProgressPercentage = duration > 0 ? (actualWatchedDuration / duration) * 100 : 0;

  // 썸네일 경로 분기 함수 추가
  function getThumbnailUrl(video: { googleDriveFileId?: string | null }): string {
    if (!video.googleDriveFileId) {
      return "/default-thumbnail.jpg"; // 기본 썸네일 경로(없으면 public 폴더에 추가 필요)
    }
    if (video.googleDriveFileId.startsWith('local:')) {
      const filename = video.googleDriveFileId.replace('local:', '');
      return `/uploads/thumbnails/${filename}.jpg`;
    }
    return `https://drive.google.com/thumbnail?id=${video.googleDriveFileId}&sz=s400`;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 overflow-hidden shadow-lg">
        {/* Video Player Container */}
        <div 
          ref={playerContainerRef}
          className="relative bg-black aspect-video overflow-hidden cursor-pointer"
          onMouseMove={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {!iframeError && !useAlternativePlayer ? (
            <>
              {/* Enhanced Embed Player */}
              <div 
                className="relative w-full h-full"
                id="video-player-container"
                onClick={() => {
                  // iframe을 클릭하면 오버레이 제거 (실제 재생이 시작되었다고 가정)
                  if (isPlaying) {
                    setTimeout(() => setIsPlaying(false), 1000);
                  }
                }}
              >
                <iframe
                  ref={videoRef}
                  src={`https://drive.google.com/file/d/${video.googleDriveFileId}/preview?usp=sharing`}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={video.title}
                  onLoad={() => {
                    console.log("Iframe loaded successfully");
                    // iframe이 로드된 후 클릭 이벤트 리스너 추가 시도
                    if (videoRef.current) {
                      const iframe = videoRef.current;
                      // iframe 내부에서 클릭이나 키보드 이벤트 감지 시도
                      iframe.addEventListener('click', () => {
                        console.log("Video iframe clicked - likely started playing");
                        setTimeout(() => setIsPlaying(false), 2000);
                      });
                    }
                  }}
                  onError={(e) => {
                    console.error("Iframe error:", e);
                    handleIframeError();
                  }}
                />
                
                {/* 재생 안내 오버레이 */}
                {isPlaying && (
                  <>
                    <div className="absolute top-4 left-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg flex items-start z-20 animate-pulse">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <Play className="w-5 h-5 mr-2 text-blue-400" />
                          <span className="font-semibold text-lg">재생 안내</span>
                        </div>
                        <p className="text-sm leading-relaxed">
                          영상 중앙의 <strong className="text-blue-400">▶️ 재생 버튼</strong>을 직접 클릭하여 시청을 시작하세요.<br/>
                          <span className="text-slate-300">보안상 외부 버튼으로는 자동 재생이 제한됩니다.</span>
                        </p>
                      </div>
                      <button
                        onClick={() => setIsPlaying(false)}
                        className="ml-3 text-slate-400 hover:text-white transition-colors text-xl leading-none"
                        aria-label="닫기"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* 중앙 재생 버튼 강조 포인터 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-blue-400 rounded-full animate-ping opacity-60"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="w-8 h-8 text-blue-400 animate-bounce" />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            /* 오류 시에만 표시되는 간단한 fallback */
            <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
              <img 
                src={getThumbnailUrl(video)}
                alt={video.title ?? ''}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <p className="text-white text-lg font-medium mb-2">플레이어 로딩 오류</p>
                  <p className="text-slate-300 text-sm mb-6">비디오를 불러올 수 없습니다</p>
                  
                  <div className="space-x-3">
                    <button
                      onClick={() => {
                        // 내장 플레이어 다시 시도
                        setUseAlternativePlayer(false);
                        setIframeError(false);
                        setEmbedAttempts(0);
                      }}
                      className="px-4 py-2 bg-aviation-blue hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      다시 시도
                    </button>
                    <button
                      onClick={() => window.open(googleDriveService.getPlayerUrl(video.googleDriveFileId), '_blank')}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
                    >
                      새 창에서 열기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Progress Indicator Overlay - 학습 진도 표시 */}
          {!iframeError && !useAlternativePlayer && (
            <div className="absolute top-4 right-4 bg-black bg-opacity-60 rounded-lg px-3 py-2 text-white text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-aviation-blue font-medium">
                  {Math.round(actualProgressPercentage)}% 완료
                </span>
                <span className="text-slate-300">
                  {formatTime(actualWatchedDuration)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Video Details */}
        <CardContent className="p-6">
          {iframeError && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                임베드된 플레이어를 로드할 수 없습니다. 아래 버튼을 사용하여 Google Drive에서 직접 시청하세요.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{video.title}</h2>
            <p className="text-slate-300 leading-relaxed">{video.description}</p>
          </div>

          {/* Simplified Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Button
              onClick={() => {
                // 내장 플레이어가 비활성화되어 있다면 활성화
                if (useAlternativePlayer) {
                  setUseAlternativePlayer(false);
                  setIframeError(false);
                  setEmbedAttempts(0);
                }
                
                // 플레이어 영역으로 스크롤하고 강조 표시
                const playerContainer = document.getElementById('video-player-container');
                if (playerContainer) {
                  playerContainer.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                  });
                  
                  // 플레이어 컨테이너에 강조 효과 추가
                  playerContainer.style.border = '3px solid #3b82f6';
                  playerContainer.style.borderRadius = '8px';
                  playerContainer.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
                  
                  // 3초 후 강조 효과 제거
                  setTimeout(() => {
                    playerContainer.style.border = '';
                    playerContainer.style.borderRadius = '';
                    playerContainer.style.boxShadow = '';
                  }, 3000);
                }
                
                // iframe에 포커스
                if (videoRef.current) {
                  videoRef.current.focus();
                }
                
                setIsPlaying(true);
                toast({
                  title: "🎬 영상 준비 완료!",
                  description: "위의 파란색 테두리 영역에서 ▶️ 재생 버튼을 클릭하세요.",
                  duration: 5000,
                });
              }}
              className="bg-aviation-blue hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              동영상 시청하기
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
            <div className="mt-6">
              <h4 className="text-md font-medium text-white mb-3">이전 노트</h4>
              {notes && notes.length > 0 ? (
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
              ) : (
                <div className="text-slate-400">작성된 노트가 없습니다.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}