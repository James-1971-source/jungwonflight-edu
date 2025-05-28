import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, ChevronDown, Plane } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout, type AuthUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface NavigationProps {
  user: AuthUser;
}

export function Navigation({ user }: NavigationProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 디버깅용 로그
  console.log('Navigation user role:', user?.role);
  console.log('Navigation user full:', user);



  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
      toast({
        title: "로그아웃 완료",
        description: "성공적으로 로그아웃되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getUserInitials = (user: AuthUser): string => {
    if (!user?.username) return "U";
    return user.username.slice(0, 2).toUpperCase();
  };

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="flex items-center space-x-3">
            <Plane className="text-aviation-blue text-2xl" />
            <span className="text-xl font-bold text-white">AviLearn</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6 ml-8">
            <Link href="/dashboard">
              <Button 
                variant={location === "/dashboard" ? "default" : "ghost"} 
                className="text-slate-300 hover:text-white"
              >
                대시보드
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                내 강의
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                진도 현황
              </Button>
            </Link>
            {user.role === 'admin' && (
              <Link href="/admin">
                <Button 
                  variant={location === "/admin" ? "default" : "ghost"} 
                  className="text-slate-300 hover:text-white"
                >
                  관리자
                </Button>
              </Link>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-slate-400 hover:text-white" />
            <span className="absolute -top-1 -right-1 bg-aviation-orange text-xs rounded-full w-4 h-4 flex items-center justify-center text-white">
              2
            </span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-aviation-blue text-white text-sm font-medium">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-slate-300">{user.username}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {user.role === 'admin' ? '관리자' : '교육생'}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
