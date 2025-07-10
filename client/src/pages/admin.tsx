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
import { Checkbox } from "@/components/ui/checkbox";
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
  Trash2,
  AlertCircle,
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

interface VideoUploadData {
  title: string;
  description: string;
  categoryId: number;
  file: File | null;
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
  const [videoUploadForm, setVideoUploadForm] = useState<VideoUploadData>({
    title: "",
    description: "",
    categoryId: 0,
    file: null,
  });
  const [userForm, setUserForm] = useState<UserFormData>({
    username: "",
    email: "",
    password: "",
    role: "student",
    isApproved: true,
  });
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isVideoUploadDialogOpen, setIsVideoUploadDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteVideoId, setDeleteVideoId] = useState<number | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [editVideoId, setEditVideoId] = useState<number | null>(null);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  
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

  const { data: videoData } = useQuery<{videos: VideoType[]}>({
    queryKey: ["/api/videos"],
    queryFn: () => apiRequest("GET", "/api/videos").then((res) => res.json()),
    enabled: !!user && user.role === 'admin',
  });
  const videos = videoData?.videos || [];

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: !!user && user.role === 'admin',
    staleTime: 0, // 캐시를 즉시 만료시킴
    cacheTime: 0, // 캐시를 즉시 삭제
    refetchOnWindowFocus: true, // 포커스 시 강제 새로고침
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

  const videoUploadMutation = useMutation({
    mutationFn: async (data: VideoUploadData) => {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('categoryId', data.categoryId.toString());
      if (data.file) {
        formData.append('video', data.file);
      }

      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '업로드 실패');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setIsVideoUploadDialogOpen(false);
      setVideoUploadForm({
        title: "",
        description: "",
        categoryId: 0,
        file: null,
      });
      setUploadProgress(0);
      toast({
        title: "🎬 동영상 업로드 완료!",
        description: "새 동영상이 성공적으로 업로드되었습니다.",
      });
    },
    onError: (error: any) => {
      setUploadProgress(0);
      toast({
        title: "업로드 실패",
        description: error.message || "동영상 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const response = await apiRequest("DELETE", `/api/videos/${videoId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setDeleteVideoId(null);
      toast({
        title: "🗑️ 동영상 삭제 완료",
        description: "동영상이 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "동영상 삭제 중 오류가 발생했습니다.",
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

  const editVideoMutation = useMutation({
    mutationFn: async (data: { id: number } & VideoFormData) => {
      const response = await apiRequest("PUT", `/api/videos/${data.id}`, {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setEditVideoId(null);
      toast({
        title: "✏️ 동영상 수정 완료",
        description: "동영상 정보가 성공적으로 수정되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "수정 실패",
        description: error.message || "동영상 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async (data: { id: number } & Partial<UserFormData>) => {
      const response = await apiRequest("PUT", `/api/users/${data.id}`, {
        username: data.username,
        email: data.email,
        role: data.role,
        isApproved: data.isApproved,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditUserId(null);
      toast({
        title: "✏️ 교육생 정보 수정 완료",
        description: "교육생 정보가 성공적으로 수정되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "수정 실패",
        description: error.message || "교육생 정보 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      try {
        return await response.json();
      } catch {
        return {};
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/users"] }); // refetch 완료 후 UI 갱신
      setDeleteUserId(null);
      toast({
        title: "🗑️ 교육생 삭제 완료",
        description: "교육생이 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      if (error.message && error.message.startsWith("404")) {
        toast({
          title: "이미 삭제된 사용자",
          description: "이 사용자는 이미 삭제되었거나 존재하지 않습니다.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "삭제 실패",
          description: error.message || "교육생 삭제 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
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

  const handleVideoUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUploadForm.file || !videoUploadForm.title || !videoUploadForm.categoryId) {
      toast({
        title: "입력 오류",
        description: "제목, 카테고리, 파일을 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    setUploadProgress(10);
    videoUploadMutation.mutate(videoUploadForm);
  };

  const handleDeleteVideo = (videoId: number) => {
    setDeleteVideoId(videoId);
  };

  const confirmDeleteVideo = () => {
    if (deleteVideoId) {
      deleteVideoMutation.mutate(deleteVideoId);
    }
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

  const handleEditVideo = (video: any) => {
    setVideoForm({
      title: video.title,
      description: video.description,
      googleDriveFileId: video.googleDriveFileId,
      categoryId: video.categoryId,
      duration: video.duration,
    });
    setEditVideoId(video.id);
  };

  const handleEditVideoSubmit = () => {
    if (!editVideoId) return;
    
    editVideoMutation.mutate({
      id: editVideoId,
      ...videoForm,
    });
  };

  const handleEditUser = (user: any) => {
    setUserForm({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
      isApproved: user.isApproved,
    });
    setEditUserId(user.id);
  };

  const handleEditUserSubmit = () => {
    if (!editUserId) return;
    
    editUserMutation.mutate({
      id: editUserId,
      ...userForm,
    });
  };

  const handleDeleteUser = (userId: number) => {
    setDeleteUserId(userId);
  };

  const confirmDeleteUser = () => {
    if (deleteUserId) {
      deleteUserMutation.mutate(deleteUserId);
    }
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
                <div className="space-x-2">
                  <Button
                    onClick={() => setIsVideoDialogOpen(true)}
                    className="bg-aviation-blue hover:bg-blue-700"
                  >
                    Google Drive 연동
                  </Button>
                  <Button
                    onClick={() => setIsVideoUploadDialogOpen(true)}
                    className="bg-aviation-blue hover:bg-blue-700"
                  >
                    파일 업로드
                  </Button>
                </div>
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
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-400 hover:text-white"
                        onClick={() => handleEditVideo(video)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        onClick={() => handleDeleteVideo(video.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
                <Button
                  onClick={() => setIsUserDialogOpen(true)}
                  className="bg-aviation-blue hover:bg-blue-700"
                >
                  새 교육생 추가
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{user.username}</p>
                      <p className="text-slate-300 text-sm">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          user.role === 'admin' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                        }`}>
                          {user.role === 'admin' ? '관리자' : '교육생'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          user.isApproved ? 'bg-blue-500/20 text-blue-300' : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {user.isApproved ? '승인됨' : '승인 대기'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-400 hover:text-white"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.role === 'admin'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog open={deleteVideoId !== null} onOpenChange={() => setDeleteVideoId(null)}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center">
                <Trash2 className="w-5 h-5 mr-2 text-red-400" />
                동영상 삭제 확인
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-300 mb-4">
                이 동영상을 정말 삭제하시겠습니까?
              </p>
              <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 mb-4">
                <p className="text-red-300 text-sm">
                  ⚠️ <strong>주의:</strong> 삭제된 동영상은 복구할 수 없으며, 관련된 진도 및 노트 데이터도 함께 삭제됩니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setDeleteVideoId(null)}
                disabled={deleteVideoMutation.isPending}
              >
                취소
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteVideo}
                disabled={deleteVideoMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteVideoMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 동영상 편집 다이얼로그 */}
        <Dialog open={editVideoId !== null} onOpenChange={() => setEditVideoId(null)}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center">
                <Edit className="w-5 h-5 mr-2 text-aviation-blue" />
                동영상 정보 수정
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-title" className="text-slate-300">제목 *</Label>
                <Input
                  id="edit-title"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description" className="text-slate-300">설명</Label>
                <Textarea
                  id="edit-description"
                  value={videoForm.description}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="edit-category" className="text-slate-300">카테고리 *</Label>
                <Select
                  value={videoForm.categoryId.toString()}
                  onValueChange={(value) => setVideoForm(prev => ({ ...prev, categoryId: parseInt(value) }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setEditVideoId(null)}
                disabled={editVideoMutation.isPending}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                취소
              </Button>
              <Button 
                onClick={handleEditVideoSubmit}
                disabled={editVideoMutation.isPending || !videoForm.title || !videoForm.categoryId}
                className="bg-aviation-blue hover:bg-blue-700"
              >
                {editVideoMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 교육생 편집 다이얼로그 */}
        <Dialog open={editUserId !== null} onOpenChange={() => setEditUserId(null)}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center">
                <Edit className="w-5 h-5 mr-2 text-aviation-blue" />
                교육생 정보 수정
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-username" className="text-slate-300">사용자명 *</Label>
                <Input
                  id="edit-username"
                  value={userForm.username}
                  onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-email" className="text-slate-300">이메일 *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <Label htmlFor="edit-role" className="text-slate-300">역할 *</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(value) => setUserForm(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="역할 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="student">교육생</SelectItem>
                    <SelectItem value="admin">관리자</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-approved"
                  checked={userForm.isApproved}
                  onCheckedChange={(checked) => 
                    setUserForm(prev => ({ ...prev, isApproved: checked as boolean }))
                  }
                />
                <Label htmlFor="edit-approved" className="text-slate-300">
                  계정 승인
                </Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setEditUserId(null)}
                disabled={editUserMutation.isPending}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                취소
              </Button>
              <Button 
                onClick={handleEditUserSubmit}
                disabled={editUserMutation.isPending || !userForm.username || !userForm.email}
                className="bg-aviation-blue hover:bg-blue-700"
              >
                {editUserMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 교육생 삭제 확인 다이얼로그 */}
        <Dialog open={deleteUserId !== null} onOpenChange={() => setDeleteUserId(null)}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center">
                <Trash2 className="w-5 h-5 mr-2 text-red-400" />
                교육생 삭제 확인
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-300 mb-4">
                이 교육생을 정말 삭제하시겠습니까?
              </p>
              <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 mb-4">
                <p className="text-red-300 text-sm">
                  ⚠️ <strong>주의:</strong> 삭제된 교육생은 복구할 수 없으며, 관련된 진도 및 노트 데이터도 함께 삭제됩니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setDeleteUserId(null)}
                disabled={deleteUserMutation.isPending}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                취소
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteUser}
                disabled={deleteUserMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteUserMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 새 교육생 추가 다이얼로그 */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">새 교육생 추가</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              {/* Form fields for adding a new user */}
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
                  <SelectContent className="bg-slate-800 border-slate-700">
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
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="bg-aviation-blue hover:bg-blue-700"
                  disabled={userMutation.isPending}
                >
                  {userMutation.isPending ? "생성 중..." : "생성"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 파일 업로드 다이얼로그 */}
        <Dialog open={isVideoUploadDialogOpen} onOpenChange={setIsVideoUploadDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">🎬 비디오 파일 업로드</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleVideoUploadSubmit} className="space-y-4">
              {/* Form fields for uploading a video file */}
              <div>
                <Label htmlFor="upload-title" className="text-slate-300">제목 *</Label>
                <Input
                  id="upload-title"
                  value={videoUploadForm.title}
                  onChange={(e) => setVideoUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="강의 제목을 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="upload-description" className="text-slate-300">설명</Label>
                <Textarea
                  id="upload-description"
                  value={videoUploadForm.description}
                  onChange={(e) => setVideoUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="강의 설명을 입력하세요"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="upload-category" className="text-slate-300">카테고리 *</Label>
                <Select onValueChange={(value) => setVideoUploadForm(prev => ({ ...prev, categoryId: parseInt(value) }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="카테고리를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="upload-file" className="text-slate-300">비디오 파일 *</Label>
                <div className="mt-2">
                  <Input
                    id="upload-file"
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setVideoUploadForm(prev => ({ ...prev, file }));
                    }}
                    className="bg-slate-700 border-slate-600 text-white file:bg-aviation-blue file:text-white file:border-0 file:rounded file:px-3 file:py-2 file:mr-3"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    지원 형식: MP4, AVI, MOV, WMV, FLV, WebM (최대 500MB)
                  </p>
                  {videoUploadForm.file && (
                    <div className="mt-2 p-2 bg-slate-700 rounded text-sm text-slate-300">
                      📁 {videoUploadForm.file.name} ({(videoUploadForm.file.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </div>

              {videoUploadMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>업로드 진행 중...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-aviation-blue h-2 rounded-full transition-all duration-500"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVideoUploadDialogOpen(false)}
                  disabled={videoUploadMutation.isPending}
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="bg-aviation-blue hover:bg-blue-700"
                  disabled={videoUploadMutation.isPending || !videoUploadForm.file}
                >
                  {videoUploadMutation.isPending ? "업로드 중..." : "업로드 시작"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Google Drive 연동 다이얼로그 */}
        <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">새 동영상 업로드 (Google Drive)</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleVideoSubmit} className="space-y-4">
              {/* Form fields for Google Drive video */}
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
                  <SelectContent className="bg-slate-800 border-slate-700">
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
                  className="border-slate-600 text-white hover:bg-slate-700"
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
      </main>
    </div>
  );
}