import { apiFetch } from "./client";
import type { MeUser } from "@/types/api";

export function getMe() {
  return apiFetch<{ success: true; data: MeUser }>("/users/me");
}

export function updateName(name: string) {
  return apiFetch<{ success: true; message: string }>("/users/me", {
    method: "PATCH",
    body: { name },
  });
}

export function deleteAccount(password?: string) {
  return apiFetch<{ success: true; message: string }>("/users/me", {
    method: "DELETE",
    body: password ? { password } : {},
  });
}
