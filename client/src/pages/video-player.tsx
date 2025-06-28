import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Navigation } from "@/components/navigation";
import { Sidebar } from "@/components/sidebar";
import { VideoPlayer } from "@/components/video-player";
import { NativeVideoPlayer } from "@/components/native-video-player";
import { VideoList } from "@/components/video-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { Video } from "@shared/schema";
import { getCurrentUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

interface VideosApiResponse {
  videos: Video[];
  userCourseIds: number[];
}

export default function VideoPlayerPage() {
  const { id } = useParams();
  const videoId = parseInt(id as string);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getCurrentUser,
  });

  // Fetch the single video to be played
  const { data: currentVideo, error: currentVideoError, isLoading: currentVideoLoading } = useQuery<Video>({
    queryKey: ["/api/videos", videoId],
    queryFn: () => apiRequest("GET", `/api/videos/${videoId}`).then((res) => res.json()),
    enabled: !!user && !isNaN(videoId),
  });

  // Fetch all videos for the sidebar playlist
  const { data: videoData, isLoading: videoListLoading } = useQuery<VideosApiResponse>({
    queryKey: ["/api/videos"],
    queryFn: () => apiRequest("GET", "/api/videos").then((res) => res.json()),
    enabled: !!user,
  });
  const allVideos = videoData?.videos || [];

  if (userLoading || currentVideoLoading || videoListLoading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navigation user={user!} />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <Skeleton className="aspect-video w-full rounded-xl" />
                    </div>
                    <div className="lg:col-span-1">
                        <Skeleton className="h-96 w-full" />
            </div>
          </div>
            </main>
        </div>
      </div>
    );
  }

  if (!user) {
    // This case should be handled by ProtectedRoute, but as a fallback.
    return null;
  }

  if (currentVideoError || !currentVideo) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navigation user={user} />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {currentVideoError ? "동영상을 불러오는 중 오류가 발생했습니다." : "동영상을 찾을 수 없습니다."}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {currentVideo.googleDriveFileId?.startsWith('local:') ? (
                <NativeVideoPlayer 
                  video={currentVideo} 
                />
              ) : (
                <VideoPlayer 
                  video={currentVideo} 
                />
              )}
            </div>

            <div className="lg:col-span-1">
              <VideoList
                videos={allVideos}
                currentVideoId={currentVideo.id}
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
