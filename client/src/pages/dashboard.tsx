import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Navigation } from "@/components/navigation";
import { Sidebar } from "@/components/sidebar";
import { VideoPlayer } from "@/components/video-player";
import { VideoList } from "@/components/video-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { Video, Category } from "@shared/schema";
import { getCurrentUser } from "@/lib/auth";

export default function Dashboard() {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const { id: categoryId } = useParams();
  
  // 디버깅용 로그
  console.log('Dashboard categoryId:', categoryId);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getCurrentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: !!user,
  });

  const { data: videos = [], isLoading: videosLoading, error: videosError } = useQuery<Video[]>({
    queryKey: categoryId ? ["/api/videos", "category", categoryId] : ["/api/videos"],
    queryFn: () => {
      const url = categoryId ? `/api/videos?categoryId=${categoryId}` : '/api/videos';
      console.log('Fetching videos from:', url);
      return fetch(url).then(res => res.json());
    },
    enabled: !!user,
  });

  const currentCategory = categoryId ? categories.find(c => c.id === parseInt(categoryId)) : null;

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleVideoEnd = () => {
    // Auto-play next video logic could go here
    const currentIndex = videos.findIndex(v => v.id === selectedVideo?.id);
    if (currentIndex < videos.length - 1) {
      setSelectedVideo(videos[currentIndex + 1]);
    }
  };

  // Set first video as default if none selected
  if (!selectedVideo && videos.length > 0) {
    setSelectedVideo(videos[0]);
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-4 w-32" />
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

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation user={user} />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {currentCategory ? currentCategory.name : "전체 강의"}
            </h1>
            <p className="text-slate-400">
              {currentCategory ? currentCategory.description : "모든 카테고리의 강의를 확인하실 수 있습니다"}
            </p>
          </div>

          {videosError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                동영상을 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.
              </AlertDescription>
            </Alert>
          )}

          {videosLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          ) : videos.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                아직 등록된 동영상이 없습니다. 관리자가 콘텐츠를 업로드할 때까지 기다려주세요.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {selectedVideo && (
                  <VideoPlayer 
                    video={selectedVideo} 
                    onVideoEnd={handleVideoEnd}
                  />
                )}
              </div>

              <div className="lg:col-span-1">
                <VideoList
                  videos={videos}
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
