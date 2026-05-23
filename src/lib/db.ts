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

type ReminderRow = {
  id: number;
  user_id?: number | null;
  kind: string;
  schedule: string;
  enabled: boolean;
  payload: unknown;
  created_at: string;
};

type LocalStore = {
  users: UserRow[];
  roadmaps: RoadmapRow[];
  counters: {
    userId: number;
    roadmapId: number;
  };
  reminders?: ReminderRow[];
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

function setPersistenceMode(mode: "neon" | "file") {
  globalThis.__roadmapGeneratorPersistenceModePromise = Promise.resolve(mode);
}

function isNeonConnectivityIssue(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("connect timeout") ||
    message.includes("connection") ||
    message.includes("network")
  );
}

async function switchToFilePersistence(error: unknown) {
  if (!fallbackAllowed || !isNeonConnectivityIssue(error)) {
    return false;
  }

  showFallbackNotice(error);
  setPersistenceMode("file");
  schemaReady = false;
  await ensureLocalStore();
  return true;
}

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
    reminders: [],
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

  try {
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

    await sql`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        kind TEXT NOT NULL,
        schedule TEXT NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        payload JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id_created ON roadmaps(user_id, created_at DESC);`;
    schemaReady = true;
  } catch (error) {
    if (await switchToFilePersistence(error)) {
      schemaReady = true;
      return;
    }
    throw error;
  }
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

  try {
    const rows = await sql`
      SELECT id, name, email, password_hash, created_at
      FROM users
      WHERE email = ${normalizedEmail}
      LIMIT 1;
    `;

    return (rows[0] as UserRow | undefined) ?? null;
  } catch (error) {
    if (await switchToFilePersistence(error)) {
      const store = await readLocalStore();
      return store.users.find((user) => user.email === normalizedEmail) ?? null;
    }
    throw error;
  }
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

  try {
    const rows = await sql`
      SELECT id, name, email, password_hash, created_at
      FROM users
      WHERE id = ${id}
      LIMIT 1;
    `;

    return (rows[0] as UserRow | undefined) ?? null;
  } catch (error) {
    if (await switchToFilePersistence(error)) {
      const store = await readLocalStore();
      return store.users.find((user) => user.id === id) ?? null;
    }
    throw error;
  }
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

  try {
    const inserted = await sql`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name.trim()}, ${normalizedEmail}, ${passwordHash})
      RETURNING id, name, email, password_hash, created_at;
    `;

    return inserted[0] as UserRow;
  } catch (error) {
    if (await switchToFilePersistence(error)) {
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
    throw error;
  }
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

  try {
    const inserted = await sql`
      INSERT INTO roadmaps (user_id, title, content)
      VALUES (${userId}, ${title.trim()}, ${JSON.stringify(content)}::jsonb)
      RETURNING id, user_id, title, content, created_at;
    `;

    return inserted[0] as RoadmapRow;
  } catch (error) {
    if (await switchToFilePersistence(error)) {
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
    throw error;
  }
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

  try {
    const rows = await sql`
      SELECT id, user_id, title, content, created_at
      FROM roadmaps
      WHERE user_id = ${userId}
      ORDER BY created_at DESC;
    `;

    return rows as RoadmapRow[];
  } catch (error) {
    if (await switchToFilePersistence(error)) {
      const store = await readLocalStore();
      return store.roadmaps
        .filter((roadmap) => roadmap.user_id === userId)
        .sort((left, right) => right.created_at.localeCompare(left.created_at));
    }
    throw error;
  }
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

  try {
    const rows = await sql`
      SELECT id, user_id, title, content, created_at
      FROM roadmaps
      WHERE id = ${id} AND user_id = ${userId}
      LIMIT 1;
    `;

    return (rows[0] as RoadmapRow | undefined) ?? null;
  } catch (error) {
    if (await switchToFilePersistence(error)) {
      const store = await readLocalStore();
      return store.roadmaps.find((roadmap) => roadmap.id === id && roadmap.user_id === userId) ?? null;
    }
    throw error;
  }
}

export async function updateRoadmapByIdForUser({
  id,
  userId,
  title,
  content,
}: {
  id: number;
  userId: number;
  title: string;
  content: RoadmapContent;
}): Promise<RoadmapRow | null> {
  await ensureSchema();

  if ((await getPersistenceMode()) === "file") {
    const store = await readLocalStore();
    const index = store.roadmaps.findIndex((roadmap) => roadmap.id === id && roadmap.user_id === userId);

    if (index === -1) {
      return null;
    }

    const existing = store.roadmaps[index];
    const updated: RoadmapRow = {
      ...existing,
      title: title.trim(),
      content,
    };

    store.roadmaps[index] = updated;
    await writeLocalStore(store);
    return updated;
  }

  if (!sql) {
    throw new Error("DATABASE_URL is not set");
  }

  try {
    const rows = await sql`
      UPDATE roadmaps
      SET title = ${title.trim()},
          content = ${JSON.stringify(content)}::jsonb
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, user_id, title, content, created_at;
    `;

    return (rows[0] as RoadmapRow | undefined) ?? null;
  } catch (error) {
    if (await switchToFilePersistence(error)) {
      const store = await readLocalStore();
      const index = store.roadmaps.findIndex((roadmap) => roadmap.id === id && roadmap.user_id === userId);

      if (index === -1) {
        return null;
      }

      const existing = store.roadmaps[index];
      const updated: RoadmapRow = {
        ...existing,
        title: title.trim(),
        content,
      };

      store.roadmaps[index] = updated;
      await writeLocalStore(store);
      return updated;
    }
    throw error;
  }
}

export async function createReminder({
  userId,
  kind,
  schedule,
  enabled = true,
  payload = {},
}: {
  userId?: number | null;
  kind: string;
  schedule: string;
  enabled?: boolean;
  payload?: unknown;
}): Promise<ReminderRow> {
  await ensureSchema();

  if ((await getPersistenceMode()) === "file") {
    const store = await readLocalStore();
    const reminder: ReminderRow = {
      id: Date.now(),
      user_id: userId ?? null,
      kind,
      schedule,
      enabled: !!enabled,
      payload: payload ?? {},
      created_at: new Date().toISOString(),
    };

    store.reminders = store.reminders || [];
    store.reminders.push(reminder);
    await writeLocalStore(store);
    return reminder;
  }

  if (!sql) throw new Error("DATABASE_URL is not set");

  try {
    const inserted = await sql`
      INSERT INTO reminders (user_id, kind, schedule, enabled, payload)
      VALUES (${userId ?? null}, ${kind}, ${schedule}, ${enabled}, ${JSON.stringify(payload)}::jsonb)
      RETURNING id, user_id, kind, schedule, enabled, payload, created_at;
    `;

    return inserted[0] as ReminderRow;
  } catch (error) {
    if (await switchToFilePersistence(error)) {
      const store = await readLocalStore();
      const reminder: ReminderRow = {
        id: Date.now(),
        user_id: userId ?? null,
        kind,
        schedule,
        enabled: !!enabled,
        payload: payload ?? {},
        created_at: new Date().toISOString(),
      };

      store.reminders = store.reminders || [];
      store.reminders.push(reminder);
      await writeLocalStore(store);
      return reminder;
    }
    throw error;
  }
}

export async function listRemindersByUserId(userId?: number): Promise<ReminderRow[]> {
  await ensureSchema();

  if ((await getPersistenceMode()) === "file") {
    const store = await readLocalStore();
    const all = store.reminders || [];
    if (typeof userId === "undefined") return all;
    return all.filter((r) => r.user_id === userId);
  }

  if (!sql) throw new Error("DATABASE_URL is not set");

  try {
    if (typeof userId === "undefined") {
      const rows = await sql`SELECT id, user_id, kind, schedule, enabled, payload, created_at FROM reminders ORDER BY created_at DESC;`;
      return rows as ReminderRow[];
    }

    const rows = await sql`
      SELECT id, user_id, kind, schedule, enabled, payload, created_at
      FROM reminders
      WHERE user_id = ${userId}
      ORDER BY created_at DESC;
    `;

    return rows as ReminderRow[];
  } catch (error) {
    if (await switchToFilePersistence(error)) {
      const store = await readLocalStore();
      const all = store.reminders || [];
      if (typeof userId === "undefined") return all;
      return all.filter((r) => r.user_id === userId);
    }
    throw error;
  }
}

export async function deleteReminder(id: number, userId?: number) {
  await ensureSchema();

  if ((await getPersistenceMode()) === "file") {
    const store = await readLocalStore();
    store.reminders = (store.reminders || []).filter((r) => r.id !== id || (userId && r.user_id !== userId));
    await writeLocalStore(store);
    return;
  }

  if (!sql) throw new Error("DATABASE_URL is not set");

  try {
    await sql`DELETE FROM reminders WHERE id = ${id} AND (${userId} IS NULL OR user_id = ${userId});`;
  } catch (error) {
    if (await switchToFilePersistence(error)) {
      const store = await readLocalStore();
      store.reminders = (store.reminders || []).filter((r) => r.id !== id || (userId && r.user_id !== userId));
      await writeLocalStore(store);
      return;
    }
    throw error;
  }
}
