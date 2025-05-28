import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Sidebar } from "@/components/sidebar";
import { VideoPlayer } from "@/components/video-player";
import { VideoList } from "@/components/video-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { Video } from "@shared/schema";
import { getCurrentUser } from "@/lib/auth";

export default function VideoPlayerPage() {
  const { id } = useParams();
  const videoId = parseInt(id);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getCurrentUser,
  });

  const { data: video, isLoading: videoLoading, error: videoError } = useQuery<Video>({
    queryKey: ["/api/videos", videoId],
    enabled: !!user && !isNaN(videoId),
  });

  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
    enabled: !!user,
  });

  if (userLoading || videoLoading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="animate-pulse">
          <div className="h-16 bg-slate-800 border-b border-slate-700"></div>
          <div className="flex">
            <div className="w-64 h-screen bg-slate-800 border-r border-slate-700"></div>
            <div className="flex-1 p-6">
              <Skeleton className="aspect-video w-full rounded-xl mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (videoError || !video) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navigation user={user} />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {videoError ? "동영상을 불러오는 중 오류가 발생했습니다." : "동영상을 찾을 수 없습니다."}
              </AlertDescription>
            </Alert>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation user={user} />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{video.title}</h1>
            <p className="text-slate-400">{video.description}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <VideoPlayer video={video} />
            </div>

            <div className="lg:col-span-1">
              <VideoList
                videos={videos}
                currentVideoId={video.id}
                onVideoSelect={(selectedVideo) => {
                  window.location.href = `/video/${selectedVideo.id}`;
                }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
