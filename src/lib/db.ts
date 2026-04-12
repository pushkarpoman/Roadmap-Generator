import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type { RoadmapContent } from "@/types/roadmap";

type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
};

type RoadmapRow = {
  id: number;
  user_id: number;
  title: string;
  content: RoadmapContent;
  created_at: string;
};

type LocalStore = {
  users: UserRow[];
  roadmaps: RoadmapRow[];
  counters: {
    userId: number;
    roadmapId: number;
  };
};

declare global {
  var __roadmapGeneratorFallbackNoticeShown: boolean | undefined;
  var __roadmapGeneratorPersistenceModePromise: Promise<"neon" | "file"> | undefined;
}

const connectionString = process.env.DATABASE_URL?.trim();
const sql = connectionString ? neon(connectionString) : null;
const localStorePath = path.join(process.cwd(), ".data", "roadmap-generator.json");
const fallbackAllowed = process.env.NODE_ENV !== "production";

let schemaReady = false;

function getFallbackReason(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown database connection issue";
}

function emptyStore(): LocalStore {
  return {
    users: [],
    roadmaps: [],
    counters: {
      userId: 0,
      roadmapId: 0,
    },
  };
}

function showFallbackNotice(error: unknown) {
  if (globalThis.__roadmapGeneratorFallbackNoticeShown) return;
  globalThis.__roadmapGeneratorFallbackNoticeShown = true;
  console.warn(
    `Neon is unavailable locally (${getFallbackReason(error)}). Falling back to file storage at .data/roadmap-generator.json`
  );
}

async function ensureLocalStore() {
  await mkdir(path.dirname(localStorePath), { recursive: true });

  try {
    await readFile(localStorePath, "utf8");
  } catch {
    await writeFile(localStorePath, JSON.stringify(emptyStore(), null, 2), "utf8");
  }
}

async function readLocalStore(): Promise<LocalStore> {
  await ensureLocalStore();

  try {
    const raw = await readFile(localStorePath, "utf8");
    return JSON.parse(raw) as LocalStore;
  } catch {
    const store = emptyStore();
    await writeFile(localStorePath, JSON.stringify(store, null, 2), "utf8");
    return store;
  }
}

async function writeLocalStore(store: LocalStore) {
  await ensureLocalStore();
  await writeFile(localStorePath, JSON.stringify(store, null, 2), "utf8");
}

async function resolvePersistenceMode(): Promise<"neon" | "file"> {
  if (!sql) {
    if (fallbackAllowed) {
      showFallbackNotice(new Error("DATABASE_URL is not configured"));
      return "file";
    }
    throw new Error("DATABASE_URL is not set");
  }

  try {
    await sql`SELECT 1`;
    return "neon";
  } catch (error) {
    if (!fallbackAllowed) {
      throw error;
    }

    showFallbackNotice(error);
    return "file";
  }
}

async function getPersistenceMode() {
  if (!globalThis.__roadmapGeneratorPersistenceModePromise) {
    globalThis.__roadmapGeneratorPersistenceModePromise = resolvePersistenceMode();
  }

  return globalThis.__roadmapGeneratorPersistenceModePromise;
}

export async function ensureSchema() {
  if (schemaReady) return;

  const mode = await getPersistenceMode();
  if (mode === "file") {
    await ensureLocalStore();
    schemaReady = true;
    return;
  }

  if (!sql) {
    throw new Error("DATABASE_URL is not set");
  }

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS roadmaps (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id_created ON roadmaps(user_id, created_at DESC);`;
  schemaReady = true;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  await ensureSchema();
  const normalizedEmail = email.toLowerCase();

  if ((await getPersistenceMode()) === "file") {
    const store = await readLocalStore();
    return store.users.find((user) => user.email === normalizedEmail) ?? null;
  }

  if (!sql) {
    throw new Error("DATABASE_URL is not set");
  }

  const rows = await sql`
    SELECT id, name, email, password_hash, created_at
    FROM users
    WHERE email = ${normalizedEmail}
    LIMIT 1;
  `;

  return (rows[0] as UserRow | undefined) ?? null;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  await ensureSchema();

  if ((await getPersistenceMode()) === "file") {
    const store = await readLocalStore();
    return store.users.find((user) => user.id === id) ?? null;
  }

  if (!sql) {
    throw new Error("DATABASE_URL is not set");
  }

  const rows = await sql`
    SELECT id, name, email, password_hash, created_at
    FROM users
    WHERE id = ${id}
    LIMIT 1;
  `;

  return (rows[0] as UserRow | undefined) ?? null;
}

export async function createUser({
  name,
  email,
  passwordHash,
}: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<UserRow> {
  await ensureSchema();
  const normalizedEmail = email.toLowerCase();

  if ((await getPersistenceMode()) === "file") {
    const store = await readLocalStore();
    const user: UserRow = {
      id: store.counters.userId + 1,
      name: name.trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };

    store.counters.userId = user.id;
    store.users.push(user);
    await writeLocalStore(store);
    return user;
  }

  if (!sql) {
    throw new Error("DATABASE_URL is not set");
  }

  const inserted = await sql`
    INSERT INTO users (name, email, password_hash)
    VALUES (${name.trim()}, ${normalizedEmail}, ${passwordHash})
    RETURNING id, name, email, password_hash, created_at;
  `;

  return inserted[0] as UserRow;
}

export async function createRoadmap({
  userId,
  title,
  content,
}: {
  userId: number;
  title: string;
  content: RoadmapContent;
}): Promise<RoadmapRow> {
  await ensureSchema();

  if ((await getPersistenceMode()) === "file") {
    const store = await readLocalStore();
    const roadmap: RoadmapRow = {
      id: store.counters.roadmapId + 1,
      user_id: userId,
      title: title.trim(),
      content,
      created_at: new Date().toISOString(),
    };

    store.counters.roadmapId = roadmap.id;
    store.roadmaps.push(roadmap);
    await writeLocalStore(store);
    return roadmap;
  }

  if (!sql) {
    throw new Error("DATABASE_URL is not set");
  }

  const inserted = await sql`
    INSERT INTO roadmaps (user_id, title, content)
    VALUES (${userId}, ${title.trim()}, ${JSON.stringify(content)}::jsonb)
    RETURNING id, user_id, title, content, created_at;
  `;

  return inserted[0] as RoadmapRow;
}

export async function listRoadmapsByUserId(userId: number): Promise<RoadmapRow[]> {
  await ensureSchema();

  if ((await getPersistenceMode()) === "file") {
    const store = await readLocalStore();
    return store.roadmaps
      .filter((roadmap) => roadmap.user_id === userId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  if (!sql) {
    throw new Error("DATABASE_URL is not set");
  }

  const rows = await sql`
    SELECT id, user_id, title, content, created_at
    FROM roadmaps
    WHERE user_id = ${userId}
    ORDER BY created_at DESC;
  `;

  return rows as RoadmapRow[];
}

export async function findRoadmapByIdForUser({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<RoadmapRow | null> {
  await ensureSchema();

  if ((await getPersistenceMode()) === "file") {
    const store = await readLocalStore();
    return store.roadmaps.find((roadmap) => roadmap.id === id && roadmap.user_id === userId) ?? null;
  }

  if (!sql) {
    throw new Error("DATABASE_URL is not set");
  }

  const rows = await sql`
    SELECT id, user_id, title, content, created_at
    FROM roadmaps
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1;
  `;

  return (rows[0] as RoadmapRow | undefined) ?? null;
}
