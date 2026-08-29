import { apiFetch } from "./client";
import type { MeUser } from "@/types/api";

export function getMe() {
  return apiFetch<{ success: true; data: MeUser }>("/users/me");
}

export function updateName(name: string) {
  return apiFetch<{ success: true; data: { id: string; name: string; email: string; avatarUrl: string | null } }>(
    "/users/me",
    {
      method: "PATCH",
      body: { name },
    },
  );
}