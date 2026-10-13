import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export type SessionRole = "user" | "admin";
export type AppSession = {
  role: SessionRole;
  expiresAt: number;
  licenseId?: string;
  deviceId?: string;
  username?: string;
  adminIp?: string;
};

export type MockKey = {
  id: string;
  key: string;
  username: string;
  used: boolean;
  device: string;
  expire: number;
  type: string;
  createdAt: number;
  activatedAt: number;
  expiresAt: number;
  status: "active" | "revoked" | "blocked";
  onlineAt: number;
  removerTremedeiraActive: boolean;
  estabilizarMiraActive: boolean;
  sensiSemCongelamentoActive: boolean;
  cleanActive: boolean;
};

export type AdminIpLogin = {
  id: string;
  ip: string;
  firstSeenAt: number;
  lastLoginAt: number;
  blocked: boolean;
};

type RawRecord = Record<string, unknown>;
type AdminIpState = Omit<AdminIpLogin, "id">;

export const SESSION_COOKIE = "rbxis_session_v3";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const MOCKAPI_URL = (process.env.MOCKAPI_KEYS_URL?.trim() || "https://6ac92b96fd7c536b1bda8e99.mockapi.io/androidkeys").replace(/\/$/, "");
const SYSTEM_KEY_PREFIX = "__PURPOU_SYSTEM_V1__";
const NOTICE_RECORD_KEY = `${SYSTEM_KEY_PREFIX}GLOBAL_NOTICE`;
const ADMIN_IP_RECORD_PREFIX = `${SYSTEM_KEY_PREFIX}ADMIN_IP_`;
const ADMIN_IP_LABEL = "Endereços de login administrativo";

function sessionSecret() {
  return process.env.RBXIS_SESSION_SECRET?.trim() || "";
}

export function hasSessionSecret() {
  return sessionSecret().length >= 32;
}

function sign(encoded: string) {
  return createHmac("sha256", sessionSecret()).update(encoded).digest("base64url");
}

function encryptionKey() {
  if (!hasSessionSecret()) throw new Error("RBXIS_SESSION_SECRET não configurado ou inválido");
  return createHash("sha256").update("purpou-system-records-v1:").update(sessionSecret()).digest();
}

function seal(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url")}`;
}

function unseal(value: string) {
  if (!value.startsWith("v1.")) return "";
  const packed = Buffer.from(value.slice(3), "base64url");
  if (packed.length < 28) return "";
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function createSessionToken(session: Omit<AppSession, "expiresAt">) {
  if (!hasSessionSecret()) throw new Error("RBXIS_SESSION_SECRET não configurado ou inválido");
  const payload = Buffer.from(JSON.stringify({ ...session, expiresAt: Date.now() + SESSION_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token?: string | null): AppSession | null {
  if (!token || !hasSessionSecret()) return null;
  const [payload, provided] = token.split(".");
  if (!payload || !provided) return null;
  try {
    const expected = Buffer.from(sign(payload));
    const supplied = Buffer.from(provided);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AppSession;
    if (!session || !["admin", "user"].includes(session.role) || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function sessionFromRequest(request: NextRequest) {
  return readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || request.headers.get("x-real-ip")?.trim() || request.headers.get("cf-connecting-ip")?.trim() || "unknown";
  return candidate.slice(0, 100);
}

async function mockRequest<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(`${MOCKAPI_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`MockAPI respondeu ${response.status}${details ? `: ${details.slice(0, 140)}` : ""}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function isSystemRecord(row: RawRecord) {
  return String(row.key ?? "").startsWith(SYSTEM_KEY_PREFIX);
}

async function listRawRecords(): Promise<RawRecord[]> {
  const all: RawRecord[] = [];
  for (let page = 1; page <= 100; page++) {
    const batch = await mockRequest<RawRecord[]>(`?page=${page}&limit=100`);
    if (!Array.isArray(batch)) throw new Error("Resposta inesperada da MockAPI.");
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

async function findRawRecord(key: string) {
  let matches: RawRecord[];
  try {
    matches = await mockRequest<RawRecord[]>(`?key=${encodeURIComponent(key)}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MockAPI respondeu 404")) return undefined;
    throw error;
  }
  if (!Array.isArray(matches)) throw new Error("Resposta inesperada da MockAPI.");
  return matches.find((record) => record.key === key);
}

async function upsertSystemRecord(key: string, fields: { device: string; status?: string }) {
  const existing = await findRawRecord(key);
  const now = Math.floor(Date.now() / 1000);
  const row: RawRecord = {
    key,
    username: ADMIN_IP_LABEL,
    used: true,
    device: fields.device,
    expire: 0,
    type: "system",
    createdAt: existing ? toNumber(existing.createdAt) || now : now,
    activatedAt: now,
    expiresAt: 0,
    status: fields.status ?? "active",
    onlineAt: now,
  };
  if (existing?.id) return mockRequest<RawRecord>(`/${encodeURIComponent(String(existing.id))}`, { method: "PATCH", body: JSON.stringify(row) });
  return mockRequest<RawRecord>("", { method: "POST", body: JSON.stringify(row) });
}

function adminIpRecordKey(ip: string) {
  return `${ADMIN_IP_RECORD_PREFIX}${createHash("sha256").update(ip).digest("hex")}`;
}

async function readAdminIpRecord(record: RawRecord): Promise<AdminIpLogin | null> {
  try {
    const state = JSON.parse(unseal(String(record.device ?? ""))) as AdminIpState;
    if (!state || typeof state.ip !== "string" || !state.ip) return null;
    return { id: String(record.id ?? ""), ip: state.ip, firstSeenAt: toNumber(state.firstSeenAt), lastLoginAt: toNumber(state.lastLoginAt), blocked: Boolean(state.blocked) };
  } catch {
    return null;
  }
}

export async function registerAdminLogin(ip: string) {
  const key = adminIpRecordKey(ip);
  const existing = await findRawRecord(key);
  let current: AdminIpState | undefined;
  if (existing) {
    try { current = JSON.parse(unseal(String(existing.device ?? ""))) as AdminIpState; } catch { current = undefined; }
  }
  if (current?.blocked) return false;
  const now = Math.floor(Date.now() / 1000);
  const state: AdminIpState = { ip, firstSeenAt: current?.firstSeenAt || now, lastLoginAt: now, blocked: false };
  const encrypted = seal(JSON.stringify(state));
  const row: RawRecord = { key, username: ADMIN_IP_LABEL, used: true, device: encrypted, expire: 0, type: "system", createdAt: state.firstSeenAt, activatedAt: now, expiresAt: 0, status: "active", onlineAt: now };
  if (existing?.id) await mockRequest(`/${encodeURIComponent(String(existing.id))}`, { method: "PATCH", body: JSON.stringify(row) });
  else await mockRequest("", { method: "POST", body: JSON.stringify(row) });
  return true;
}

export async function isAdminIpAllowed(ip: string) {
  if (!ip) return false;
  const key = adminIpRecordKey(ip);
  const record = await findRawRecord(key);
  if (!record) return false;
  const state = await readAdminIpRecord(record);
  return Boolean(state && !state.blocked);
}

export async function hasAuthorizedAdminSession(request: NextRequest) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "admin" || !session.adminIp) return false;
  try { return await isAdminIpAllowed(session.adminIp); } catch { return false; }
}

export async function listAdminIpLogins() {
  const rows = (await listRawRecords()).filter((record) => String(record.key ?? "").startsWith(ADMIN_IP_RECORD_PREFIX));
  const entries = (await Promise.all(rows.map(readAdminIpRecord))).filter((entry): entry is AdminIpLogin => Boolean(entry));
  return entries.sort((a, b) => b.lastLoginAt - a.lastLoginAt);
}

export async function setAdminIpBlocked(ip: string, blocked: boolean) {
  const entries = await listAdminIpLogins();
  const current = entries.find((entry) => entry.ip === ip);
  if (!current) throw new Error("Endereço IP não encontrado.");
  if (blocked && !current.blocked && entries.filter((entry) => !entry.blocked).length <= 1) {
    throw new Error("Mantenha pelo menos um IP liberado para evitar bloquear o único acesso administrativo.");
  }
  const now = Math.floor(Date.now() / 1000);
  const state: AdminIpState = { ip, firstSeenAt: current.firstSeenAt, lastLoginAt: current.lastLoginAt, blocked };
  const encrypted = seal(JSON.stringify(state));
  const key = adminIpRecordKey(ip);
  const row = await findRawRecord(key);
  if (!row?.id) throw new Error("Registro de IP não encontrado.");
  await mockRequest(`/${encodeURIComponent(String(row.id))}`, { method: "PATCH", body: JSON.stringify({ device: encrypted, status: blocked ? "blocked" : "active", onlineAt: now }) });
  return { ...current, blocked };
}

export async function getGlobalNotice() {
  const record = await findRawRecord(NOTICE_RECORD_KEY);
  return typeof record?.device === "string" ? record.device.slice(0, 500) : "";
}

export async function setGlobalNotice(message: string) {
  const value = message.trim().slice(0, 500);
  await upsertSystemRecord(NOTICE_RECORD_KEY, { device: value });
  return value;
}

export function normalizeKey(row: RawRecord): MockKey {
  const rawStatus = String(row.status ?? "").toLowerCase();
  const status = rawStatus === "blocked" ? "blocked" : rawStatus === "revoked" ? "revoked" : !rawStatus || rawStatus === "active" ? "active" : "revoked";
  return {
    id: String(row.id ?? row.key ?? ""),
    key: String(row.key ?? row.accessKey ?? ""),
    username: String(row.username ?? row.user ?? "Usuário"),
    used: Boolean(row.used ?? row.device),
    device: String(row.device ?? row.deviceId ?? ""),
    expire: toNumber(row.expire ?? row.duration),
    type: String(row.type ?? row.planId ?? "daily"),
    createdAt: toNumber(row.createdAt),
    activatedAt: toNumber(row.activatedAt ?? row.lastLoginAt),
    expiresAt: toNumber(row.expiresAt),
    status,
    onlineAt: toNumber(row.onlineAt),
    removerTremedeiraActive: Boolean(row.removerTremedeiraActive),
    estabilizarMiraActive: Boolean(row.estabilizarMiraActive),
    sensiSemCongelamentoActive: Boolean(row.sensiSemCongelamentoActive),
    cleanActive: Boolean(row.cleanActive),
  };
}

export async function listKeys(): Promise<MockKey[]> {
  return (await listRawRecords()).filter((row) => !isSystemRecord(row)).map(normalizeKey);
}

export async function getKeyById(id: string) {
  try {
    const record = await mockRequest<RawRecord>(`/${encodeURIComponent(id)}`);
    if (isSystemRecord(record)) return undefined;
    return normalizeKey(record);
  } catch {
    return undefined;
  }
}

export async function updateKey(id: string, patch: Partial<MockKey>) {
  const row: RawRecord = {};
  for (const field of ["key", "username", "used", "device", "expire", "type", "createdAt", "activatedAt", "expiresAt", "status", "onlineAt", "removerTremedeiraActive", "estabilizarMiraActive", "sensiSemCongelamentoActive", "cleanActive"] as const) {
    if (patch[field] !== undefined) row[field] = patch[field];
  }
  return normalizeKey(await mockRequest<RawRecord>(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(row) }));
}

export async function createKey(input: { username: string; type: string; expire: number }) {
  const now = Math.floor(Date.now() / 1000);
  const value = {
    key: `PURPOU-${input.type.toUpperCase()}-${randomBytes(6).toString("hex").toUpperCase()}`,
    username: input.username,
    used: false,
    device: "",
    expire: input.expire,
    type: input.type,
    createdAt: now,
    activatedAt: 0,
    expiresAt: 0,
    status: "active",
    onlineAt: 0,
    removerTremedeiraActive: false,
    estabilizarMiraActive: false,
    sensiSemCongelamentoActive: false,
    cleanActive: false,
  };
  return normalizeKey(await mockRequest<RawRecord>("", { method: "POST", body: JSON.stringify(value) }));
}

export async function deleteKey(id: string) {
  await mockRequest(`/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function expiryForActivation(type: string, expire: number, activatedAt: number) {
  if (type === "perm" || type === "permanent") return 0;
  const unit = type === "hourly" ? 60 * 60 : 24 * 60 * 60;
  return activatedAt + Math.max(1, expire || 1) * unit;
}

export function isExpired(key: MockKey, now = Math.floor(Date.now() / 1000)) {
  return key.expiresAt > 0 && key.expiresAt <= now;
}

export function planTitle(type: string) {
  return ({ hourly: "1 hora", daily: "1 dia", weekly: "1 semana", monthly: "1 mês", perm: "Permanente", permanent: "Permanente" } as Record<string, string>)[type] ?? type;
}

export type { NextRequest, NextResponse };
