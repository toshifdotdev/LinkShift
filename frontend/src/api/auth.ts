import { apiFetch } from "./client";
import type { LoginResponse, RefreshResponse } from "@/types/api";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function register(input: RegisterInput) {
  return apiFetch<{ success: true; email: string; message: string }>(
    "/auth/register",
    { method: "POST", body: input },
  );
}

export function login(input: LoginInput) {
  return apiFetch<LoginResponse>("/auth/login", { method: "POST", body: input });
}

export function logout() {
  return apiFetch<{ success: true; message: string }>("/auth/logout", { method: "POST" });
}

export function refreshSession() {
  return apiFetch<RefreshResponse>("/auth/refresh", { method: "POST" });
}

export function forgotPassword(email: string) {
  return apiFetch<{ success: true; message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export function resetPassword(input: { token: string; password: string }) {
  return apiFetch<{ success: true; message: string }>("/auth/reset-password", {
    method: "POST",
    body: input,
  });
}

export function resendVerification(email: string) {
  return apiFetch<{ success: true; message: string }>("/auth/resend-verification", {
    method: "POST",
    body: { email },
  });
}

export const GOOGLE_AUTH_URL = "/api/v1/auth/google";
