import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  CloudUpload, 
  Users, 
  Video, 
  Clock, 
  HardDrive, 
  Plus, 
  Edit,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";
import type { Category, Video as VideoType, User } from "@shared/schema";

interface VideoFormData {
  title: string;
  description: string;
  googleDriveFileId: string;
  categoryId: number;
  duration: number;
}

interface UserFormData {
  username: string;
  email: string;
  password: string;
  role: string;
  isApproved: boolean;
}

export default function Admin() {
  const [videoForm, setVideoForm] = useState<VideoFormData>({
    title: "",
    description: "",
    googleDriveFileId: "",
    categoryId: 0,
    duration: 0,
  });
  const [userForm, setUserForm] = useState<UserFormData>({
    username: "",
    email: "",
    password: "",
    role: "student",
    isApproved: true,
  });
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getCurrentUser,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: videos = [] } = useQuery<VideoType[]>({
    queryKey: ["/api/videos"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: !!user && user.role === 'admin',
  });

  const videoMutation = useMutation({
    mutationFn: (data: VideoFormData) => apiRequest("POST", "/api/videos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setIsVideoDialogOpen(false);
      setVideoForm({
        title: "",
        description: "",
        googleDriveFileId: "",
        categoryId: 0,
        duration: 0,
      });
      toast({
        title: "동영상 업로드 완료",
        description: "새 동영상이 성공적으로 추가되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "동영상 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const userMutation = useMutation({
    mutationFn: (data: UserFormData) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsUserDialogOpen(false);
      setUserForm({
        username: "",
        email: "",
        password: "",
        role: "student",
        isApproved: true,
      });
      toast({
        title: "사용자 생성 완료",
        description: "새 교육생이 성공적으로 추가되었습니다.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "사용자 생성 중 오류가 발생했습니다.";
      toast({
        title: "오류",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoForm.title || !videoForm.googleDriveFileId || !videoForm.categoryId) {
      toast({
        title: "입력 오류",
        description: "모든 필수 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    videoMutation.mutate(videoForm);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username || !userForm.email || !userForm.password) {
      toast({
        title: "입력 오류",
        description: "모든 필수 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    userMutation.mutate(userForm);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Skeleton className="h-16 w-full" />
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            관리자 권한이 필요합니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const mockStats = {
    totalVideos: videos.length,
    totalStudents: users.filter(u => u.role === 'student').length,
    totalWatchTime: "847시간",
    storageUsed: "1.2TB"
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation user={user} />
      
      <main className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">관리자 대시보드</h1>
          <p className="text-slate-400">시스템 관리 및 콘텐츠 업로드</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">총 동영상</p>
                  <p className="text-2xl font-bold text-white">{mockStats.totalVideos}</p>
                </div>
                <Video className="h-8 w-8 text-aviation-blue" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">등록 교육생</p>
                  <p className="text-2xl font-bold text-white">{mockStats.totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">총 시청시간</p>
                  <p className="text-2xl font-bold text-white">{mockStats.totalWatchTime}</p>
                </div>
                <Clock className="h-8 w-8 text-aviation-orange" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">저장소 사용량</p>
                  <p className="text-2xl font-bold text-white">{mockStats.storageUsed}</p>
                </div>
                <HardDrive className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Video Upload Section */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                동영상 관리
                <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-aviation-blue hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      새 동영상 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">새 동영상 업로드</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleVideoSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-slate-300">제목 *</Label>
                        <Input
                          id="title"
                          value={videoForm.title}
                          onChange={(e) => setVideoForm(prev => ({ ...prev, title: e.target.value }))}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="강의 제목을 입력하세요"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-slate-300">설명</Label>
                        <Textarea
                          id="description"
                          value={videoForm.description}
                          onChange={(e) => setVideoForm(prev => ({ ...prev, description: e.target.value }))}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="강의 설명을 입력하세요"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category" className="text-slate-300">카테고리 *</Label>
                        <Select onValueChange={(value) => setVideoForm(prev => ({ ...prev, categoryId: parseInt(value) }))}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue placeholder="카테고리를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="googleDriveFileId" className="text-slate-300">Google Drive 파일 ID *</Label>
                        <Input
                          id="googleDriveFileId"
                          value={videoForm.googleDriveFileId}
                          onChange={(e) => setVideoForm(prev => ({ ...prev, googleDriveFileId: e.target.value }))}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="Google Drive 파일 ID를 입력하세요"
                        />
                      </div>
                      <div>
                        <Label htmlFor="duration" className="text-slate-300">길이 (초)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={videoForm.duration}
                          onChange={(e) => setVideoForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="동영상 길이를 초 단위로 입력하세요"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsVideoDialogOpen(false)}
                        >
                          취소
                        </Button>
                        <Button 
                          type="submit" 
                          className="bg-aviation-blue hover:bg-blue-700"
                          disabled={videoMutation.isPending}
                        >
                          {videoMutation.isPending ? "업로드 중..." : "업로드"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {videos.slice(0, 5).map((video) => (
                  <div key={video.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{video.title}</p>
                      <p className="text-slate-300 text-sm">
                        {new Date(video.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* User Management Section */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                교육생 관리
                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-aviation-orange hover:bg-orange-600">
                      <Plus className="h-4 w-4 mr-2" />
                      새 교육생 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">새 교육생 추가</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUserSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="username" className="text-slate-300">사용자명 *</Label>
                        <Input
                          id="username"
                          value={userForm.username}
                          onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="사용자명을 입력하세요"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-slate-300">이메일 *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="이메일을 입력하세요"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password" className="text-slate-300">비밀번호 *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={userForm.password}
                          onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="비밀번호를 입력하세요"
                        />
                      </div>
                      <div>
                        <Label htmlFor="role" className="text-slate-300">역할</Label>
                        <Select 
                          value={userForm.role} 
                          onValueChange={(value) => setUserForm(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">교육생</SelectItem>
                            <SelectItem value="admin">관리자</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsUserDialogOpen(false)}
                        >
                          취소
                        </Button>
                        <Button 
                          type="submit" 
                          className="bg-aviation-orange hover:bg-orange-600"
                          disabled={userMutation.isPending}
                        >
                          {userMutation.isPending ? "생성 중..." : "생성"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.filter(user => user.role === 'student').length === 0 ? (
                  <div className="text-slate-400 text-center py-8">
                    등록된 교육생이 없습니다
                  </div>
                ) : (
                  users
                    .filter(user => user.role === 'student')
                    .slice(0, 5)
                    .map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{student.username}</p>
                          <p className="text-slate-300 text-sm">{student.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              student.isApproved 
                                ? 'bg-green-900 text-green-300' 
                                : 'bg-red-900 text-red-300'
                            }`}>
                              {student.isApproved ? '승인됨' : '승인 대기'}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                )}
                {users.filter(user => user.role === 'student').length > 5 && (
                  <div className="text-center pt-3">
                    <Button variant="ghost" className="text-slate-400 hover:text-white">
                      더 보기 ({users.filter(user => user.role === 'student').length - 5}명 더)
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}