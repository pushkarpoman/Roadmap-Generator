import type {
  JobGapInsight,
  QuizQuestion,
  ResumeBullet,
  RoadmapContent,
  RoadmapRecord,
  Stage,
  UserDTO,
} from "@/types/roadmap";

const JSON_HEADERS = { "Content-Type": "application/json" };

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = (data as { message?: string }).message || "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export async function register(name: string, email: string, password: string) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ name, email, password }),
  });

  return handleResponse<{ token: string; user: UserDTO }>(response);
}

export async function login(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password }),
  });

  return handleResponse<{ token: string; user: UserDTO }>(response);
}

export async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });

  return handleResponse<{ message: string }>(response);
}

export async function getCurrentUser() {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 401) return null;
  const data = await handleResponse<{ user: UserDTO }>(response);
  return data.user;
}

export async function generateRoadmap(role: string) {
  const response = await fetch("/api/roadmap/generate", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ role }),
  });

  return handleResponse<RoadmapContent>(response);
}

export async function saveRoadmap(title: string, content: RoadmapContent) {
  const response = await fetch("/api/roadmap", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ title, content }),
  });

  return handleResponse<RoadmapRecord>(response);
}

export async function getRoadmapHistory() {
  const response = await fetch("/api/roadmap/history", {
    method: "GET",
    cache: "no-store",
  });

  return handleResponse<RoadmapRecord[]>(response);
}

export async function updateRoadmap(id: number, title: string, content: RoadmapContent) {
  const response = await fetch(`/api/roadmap/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ title, content }),
  });

  return handleResponse<RoadmapRecord>(response);
}

export async function analyzeRoadmapJobGap(roadmap: RoadmapContent, postingText: string) {
  const response = await fetch("/api/roadmap/job-gap", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ roadmap, postingText }),
  });

  return handleResponse<JobGapInsight>(response);
}

export async function generateStageQuiz(stage: Stage, count = 5) {
  const response = await fetch("/api/roadmap/quiz", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ stage, count }),
  });

  const data = await handleResponse<{ questions: QuizQuestion[] }>(response);
  return data.questions;
}

export async function generateResumeBullets(roadmap: RoadmapContent, completedStageIds: number[]) {
  const response = await fetch("/api/roadmap/bullets", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ roadmap, completedStageIds }),
  });

  const data = await handleResponse<{ bullets: ResumeBullet[] }>(response);
  return data.bullets;
}

export async function replanRoadmapWeekly(roadmap: RoadmapContent) {
  const response = await fetch("/api/roadmap/replan", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ roadmap }),
  });

  const data = await handleResponse<{ roadmap: RoadmapContent }>(response);
  return data.roadmap;
}
