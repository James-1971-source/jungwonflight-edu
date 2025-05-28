import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { login, type LoginCredentials } from "@/lib/auth";

export default function Login() {
  const [, setLocation] = useLocation();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: "",
    password: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/me"], { user });
      setLocation("/dashboard");
      toast({
        title: "로그인 성공",
        description: `${user.username}님, 환영합니다!`,
      });
    },
    onError: (error) => {
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.username || !credentials.password) {
      toast({
        title: "입력 오류",
        description: "사용자명과 비밀번호를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(credentials);
  };

  const handleInputChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Plane className="h-12 w-12 text-aviation-blue" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">AviLearn 로그인</CardTitle>
          <CardDescription className="text-slate-400">
            승인된 교육생만 접근 가능합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">교육생 ID</Label>
              <Input
                id="username"
                type="text"
                value={credentials.username}
                onChange={handleInputChange("username")}
                placeholder="교육생 ID를 입력하세요"
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-aviation-blue"
                disabled={loginMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={handleInputChange("password")}
                placeholder="비밀번호를 입력하세요"
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-aviation-blue"
                disabled={loginMutation.isPending}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-aviation-blue hover:bg-blue-700 text-white"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "로그인 중..." : "로그인"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              계정이 없으신가요?{" "}
              <a href="#" className="text-aviation-blue hover:underline">
                관리자에게 문의
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
