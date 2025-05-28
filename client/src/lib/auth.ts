import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  isApproved: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  try {
    const response = await apiRequest("POST", "/api/login", credentials);
    const data = await response.json();
    return data.user;
  } catch (error) {
    throw new AuthError("로그인에 실패했습니다. 사용자명과 비밀번호를 확인해주세요.");
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("POST", "/api/logout");
  } catch (error) {
    throw new AuthError("로그아웃 중 오류가 발생했습니다.");
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await apiRequest("GET", "/api/me");
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
}
