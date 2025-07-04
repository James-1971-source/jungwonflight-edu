import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  PlayCircle, 
  Settings, 
  Cloud, 
  Map, 
  AlertTriangle 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Category } from "@shared/schema";

export function Sidebar() {
  const [location] = useLocation();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: videoData } = useQuery<{ videos: any[] }>({
    queryKey: ["/api/videos"],
  });
  const videos = videoData?.videos || [];

  const { data: progress = [] } = useQuery<any[]>({
    queryKey: ["/api/progress"],
  });

  const getCategoryIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "기초 비행 이론":
        return PlayCircle;
      case "항공기 시스템":
        return Settings;
      case "기상학":
        return Cloud;
      case "항법":
        return Map;
      case "비상 절차":
        return AlertTriangle;
      default:
        return PlayCircle;
    }
  };

  // Calculate overall progress
  const totalVideos = videos.length;
  const completedVideos = progress.filter(p => p.completed).length;
  const overallProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

  return (
    <aside className="w-96 bg-slate-800 min-h-screen border-r border-slate-700">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">강의 카테고리</h3>
        <ul className="space-y-2">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.name);
            const videoCount = videos.filter(video => video.categoryId === category.id).length;
            const isActive = location === `/category/${category.id}`;
            
            return (
              <li key={category.id}>
                <Link href={`/category/${category.id}`}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start px-3 py-3 h-auto ${
                      isActive 
                        ? "bg-aviation-blue text-white" 
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                    <span className="flex-1 min-w-0 text-left text-sm leading-tight break-words">{category.name}</span>
                    <Badge 
                      variant={isActive ? "secondary" : "outline"}
                      className={`ml-2 text-xs flex-shrink-0 ${
                        isActive ? "bg-blue-700 text-white" : "bg-slate-600 text-slate-300"
                      }`}
                    >
                      {videoCount}
                    </Badge>
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
        
        <div className="mt-8">
          <h4 className="text-md font-medium text-slate-300 mb-3">학습 진도</h4>
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">전체 진도</span>
              <span className="text-aviation-blue font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </div>
      </div>
    </aside>
  );
}
