import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Video, UserProgress } from "@shared/schema";
import { googleDriveService } from "@/lib/google-drive";

interface VideoListProps {
  videos: Video[];
  currentVideoId?: number;
  onVideoSelect: (video: Video) => void;
}

export function VideoList({ videos, currentVideoId, onVideoSelect }: VideoListProps) {
  const { data: userProgress = [] } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
  });

  const getVideoProgress = (videoId: number): UserProgress | undefined => {
    return userProgress.find(p => p.videoId === videoId);
  };

  const calculateProgressPercentage = (videoId: number, duration?: number): number => {
    const progress = getVideoProgress(videoId);
    if (!progress || !duration) return 0;
    return Math.min((progress.watchedDuration / duration) * 100, 100);
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateOverallProgress = (): number => {
    if (videos.length === 0) return 0;
    const totalProgress = videos.reduce((sum, video) => {
      return sum + calculateProgressPercentage(video.id, video.duration);
    }, 0);
    return Math.round(totalProgress / videos.length);
  };

  const overallProgress = calculateOverallProgress();

  return (
    <Card className="bg-slate-800">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">강의 목록</h3>
        
        <div className="space-y-3">
          {videos.map((video) => {
            const isActive = video.id === currentVideoId;
            const progress = calculateProgressPercentage(video.id, video.duration);
            const thumbnailUrl = googleDriveService.getThumbnailUrl(video.googleDriveFileId);
            
            return (
              <div
                key={video.id}
                className={`rounded-lg p-4 cursor-pointer transition-colors ${
                  isActive 
                    ? "bg-aviation-blue" 
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
                onClick={() => onVideoSelect(video)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-16 h-12 bg-black rounded overflow-hidden relative">
                    <img 
                      src={thumbnailUrl}
                      alt={`${video.title} thumbnail`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to a default aviation image
                        e.currentTarget.src = "https://images.unsplash.com/photo-1540962351504-03099e0a754b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200";
                      }}
                    />
                    {!isActive && (
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Play className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-sm mb-1 leading-tight break-words line-clamp-2 ${
                      isActive ? "text-white" : "text-white"
                    }`}>
                      {video.title}
                    </h4>
                    <p className={`text-xs mb-1 ${
                      isActive ? "text-blue-100" : "text-slate-300"
                    }`}>
                      {formatDuration(video.duration)}
                    </p>
                    <div className={`w-full rounded-full h-1 ${
                      isActive ? "bg-blue-700" : "bg-slate-600"
                    }`}>
                      <div
                        className={`h-1 rounded-full transition-all duration-300 ${
                          isActive ? "bg-white" : "bg-slate-400"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {videos.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">진도율</span>
              <span className="text-aviation-blue font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2 mt-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
