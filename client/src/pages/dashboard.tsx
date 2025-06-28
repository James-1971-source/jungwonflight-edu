import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, PlusCircle, CheckCircle, PlayCircle } from "lucide-react";
import type { Video, Category } from "@shared/schema";
import { getCurrentUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VideosApiResponse {
  videos: Video[];
  userCourseIds: number[];
}

export default function Dashboard() {
  const { id: categoryId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getCurrentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: !!user,
  });

  const queryKey = categoryId ? ["/api/videos", "category", categoryId] : ["/api/videos"];
  const { data, isLoading: videosLoading, error: videosError } = useQuery<VideosApiResponse>({
    queryKey: queryKey,
    queryFn: () => {
      const url = categoryId ? `/api/videos?categoryId=${categoryId}` : '/api/videos';
      return apiRequest("GET", url).then(res => res.json());
    },
    enabled: !!user,
  });

  const videos = data?.videos || [];
  const userCourseIds = new Set(data?.userCourseIds || []);

  const addCourseMutation = useMutation({
    mutationFn: (videoId: number) => apiRequest("POST", "/api/my-courses", { videoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/my-courses"] });
      toast({
        title: "✅ 추가 완료",
        description: "선택한 강의가 '내 강의'에 추가되었습니다.",
      });
    },
  });

  const removeCourseMutation = useMutation({
    mutationFn: (videoId: number) => apiRequest("DELETE", `/api/my-courses/${videoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/my-courses"] });
      toast({
        title: "🗑️ 삭제 완료",
        description: "선택한 강의가 '내 강의'에서 삭제되었습니다.",
      });
    },
  });

  const currentCategory = categoryId ? categories.find(c => c.id === parseInt(categoryId)) : null;

  if (userLoading) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  if (!user) {
    return null; // Should be redirected by ProtectedRoute
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation user={user} />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videosLoading ? (
              [...Array(8)].map((_, i) => (
                <div key={i} className="bg-slate-800 rounded-lg overflow-hidden">
                  <Skeleton className="w-full h-40" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full mt-2" />
              </div>
                </div>
              ))
          ) : videos.length === 0 ? (
              <div className="col-span-full">
                <Alert className="border-slate-700 bg-slate-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                    아직 등록된 동영상이 없습니다.
              </AlertDescription>
            </Alert>
              </div>
            ) : (
              videos.map(video => {
                const isAdded = userCourseIds.has(video.id);
                return (
                  <div key={video.id} className="bg-slate-800 rounded-lg overflow-hidden group flex flex-col">
                    <Link href={`/video/${video.id}`}>
                      <a className="block relative">
                        <img 
                          src={video.thumbnailUrl || '/default-thumbnail.jpg'} 
                          alt={video.title ?? ""}
                          className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          <PlayCircle className="w-12 h-12 text-white/70 group-hover:text-white transition-opacity opacity-0 group-hover:opacity-100" />
                        </div>
                      </a>
                    </Link>
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="font-semibold text-white text-sm leading-tight break-words line-clamp-2 min-h-[2.5rem]">{video.title}</h3>
                      <p className="text-sm text-slate-400 truncate mt-1 flex-grow">{video.description}</p>
                      <Button
                        onClick={() => isAdded ? removeCourseMutation.mutate(video.id) : addCourseMutation.mutate(video.id)}
                        disabled={addCourseMutation.isPending || removeCourseMutation.isPending}
                        variant={isAdded ? "destructive" : "default"}
                        className="w-full mt-4"
                      >
                        {isAdded ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            내 강의에서 제거
                          </>
                        ) : (
                          <>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            내 강의에 추가
                          </>
                        )}
                      </Button>
              </div>
            </div>
                )
              })
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
