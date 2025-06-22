import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { Sidebar } from "@/components/sidebar";
import { VideoPlayer } from "@/components/video-player";
import { NativeVideoPlayer } from "@/components/native-video-player";
import { VideoList } from "@/components/video-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, PlusCircle } from "lucide-react";
import type { Video } from "@shared/schema";
import { getCurrentUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

export default function MyCoursesPage() {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getCurrentUser,
  });

  const { data: myVideos = [], isLoading: videosLoading, error: videosError } = useQuery<Video[]>({
    queryKey: ["/api/my-courses"],
    queryFn: () => apiRequest("GET", "/api/my-courses").then(res => res.json()),
    enabled: !!user,
  });

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleVideoEnd = () => {
    const currentIndex = myVideos.findIndex(v => v.id === selectedVideo?.id);
    if (currentIndex !== -1 && currentIndex < myVideos.length - 1) {
      setSelectedVideo(myVideos[currentIndex + 1]);
    }
  };

  if (!selectedVideo && myVideos.length > 0) {
    setSelectedVideo(myVideos[0]);
  }

  if (userLoading) {
    return <div className="min-h-screen bg-slate-900" />;
  }
  
  if (!user) {
    // This should ideally not happen due to ProtectedRoute, but as a fallback
    return <div className="min-h-screen bg-slate-900" />;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation user={user} />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              내 강의
            </h1>
            <p className="text-slate-400">
              내가 학습하기 위해 추가한 강의 목록입니다.
            </p>
          </div>

          {videosError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                강의를 불러오는 중 오류가 발생했습니다.
              </AlertDescription>
            </Alert>
          )}

          {videosLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Skeleton className="aspect-video w-full rounded-xl" />
              </div>
              <div className="lg:col-span-1">
                <Skeleton className="h-96 w-full rounded-lg" />
              </div>
            </div>
          ) : myVideos.length === 0 ? (
            <div className="text-center py-20 bg-slate-800 rounded-lg">
              <AlertCircle className="mx-auto h-12 w-12 text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold text-white">아직 추가된 강의가 없습니다.</h3>
              <p className="mt-2 text-sm text-slate-400">
                대시보드에서 듣고 싶은 강의를 '내 강의에 추가' 해보세요.
              </p>
              <Link href="/dashboard">
                <a className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-aviation-blue hover:bg-blue-700">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  강의 둘러보러 가기
                </a>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {selectedVideo && (
                  selectedVideo.googleDriveFileId?.startsWith('local:') ? (
                    <NativeVideoPlayer 
                      video={selectedVideo} 
                      onVideoEnd={handleVideoEnd}
                    />
                  ) : (
                    <VideoPlayer 
                      video={selectedVideo} 
                      onVideoEnd={handleVideoEnd}
                    />
                  )
                )}
              </div>
              <div className="lg:col-span-1">
                <VideoList
                  videos={myVideos}
                  currentVideoId={selectedVideo?.id}
                  onVideoSelect={handleVideoSelect}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 