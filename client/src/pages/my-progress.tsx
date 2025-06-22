import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import { Navigation } from "@/components/navigation";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, BookCheck, Clock, Award } from "lucide-react";
import type { Video, UserProgress } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function MyProgressPage() {
  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getCurrentUser,
  });

  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ["/api/my-courses"],
    queryFn: () => apiRequest("GET", "/api/my-courses").then((res) => res.json()),
    enabled: !!user,
  });

  const { data: progress = [] } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
    queryFn: () => apiRequest("GET", "/api/progress").then((res) => res.json()),
    enabled: !!user,
  });

  if (!user) {
    return <div>Loading...</div>; // Or a more sophisticated loading state
  }
  
  const completedVideos = progress.filter(p => p.completed).length;
  const totalVideos = videos.length;
  const overallProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
  const totalDuration = videos.reduce((acc, video) => acc + (video.duration || 0), 0);
  const watchedDuration = progress.reduce((acc, p) => acc + p.watchedDuration, 0);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}시간 ${minutes}분`;
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation user={user} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">나의 학습 현황</h1>
            <p className="text-slate-400">전체 학습 진행 상황을 확인하세요.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                  전체 진도율
                </CardTitle>
                <Award className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{overallProgress}%</div>
                <Progress value={overallProgress} className="h-2 mt-2" />
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                  완료한 강의
                </CardTitle>
                <BookCheck className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {completedVideos} / {totalVideos}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                  총 학습 시간
                </CardTitle>
                <Clock className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatTime(watchedDuration)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">강의별 진도 현황</CardTitle>
            </CardHeader>
            <CardContent>
              {videos.length > 0 ? (
                <div className="space-y-4">
                  {videos.map(video => {
                    const videoProgress = progress.find(p => p.videoId === video.id);
                    const watched = videoProgress?.watchedDuration || 0;
                    const percentage = video.duration > 0 ? Math.round((watched / video.duration) * 100) : 0;
                    return (
                      <div key={video.id}>
                        <div className="flex justify-between mb-1">
                          <p className="text-slate-300">{video.title}</p>
                          <p className="text-sm text-slate-400">{percentage}%</p>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              ) : (
                 <Alert className="bg-slate-800 border-slate-700">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    아직 등록된 강의가 없습니다.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
} 