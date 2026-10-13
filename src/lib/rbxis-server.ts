import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export type SessionRole = "user" | "admin";
export type AppSession = {
  role: SessionRole;
  expiresAt: number;
  licenseId?: string;
  deviceId?: string;
  username?: string;
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
};

export const SESSION_COOKIE = "rbxis_session_v3";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const MOCKAPI_URL = (process.env.MOCKAPI_KEYS_URL?.trim() || "https://6ac92b96fd7c536b1bda8e99.mockapi.io/androidkeys").replace(/\/$/, "");

function sessionSecret() {
  return process.env.RBXIS_SESSION_SECRET?.trim() || "";
}

export function hasSessionSecret() {
  return sessionSecret().length >= 32;
}

function sign(encoded: string) {
  return createHmac("sha256", sessionSecret()).update(encoded).digest("base64url");
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

export function normalizeKey(row: Record<string, unknown>): MockKey {
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
  };
}

export async function listKeys(): Promise<MockKey[]> {
  const all: Record<string, unknown>[] = [];
  for (let page = 1; page <= 100; page++) {
    const batch = await mockRequest<Record<string, unknown>[]>(`?page=${page}&limit=100`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all.map(normalizeKey);
}

export async function getKeyById(id: string) {
  try {
    return normalizeKey(await mockRequest<Record<string, unknown>>(`/${encodeURIComponent(id)}`));
  } catch {
    return undefined;
  }
}

export async function updateKey(id: string, patch: Partial<MockKey>) {
  const row: Record<string, unknown> = {};
  for (const field of ["key", "username", "used", "device", "expire", "type", "createdAt", "activatedAt", "expiresAt", "status", "onlineAt"] as const) {
    if (patch[field] !== undefined) row[field] = patch[field];
  }
  return normalizeKey(await mockRequest<Record<string, unknown>>(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(row) }));
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
  };
  return normalizeKey(await mockRequest<Record<string, unknown>>("", { method: "POST", body: JSON.stringify(value) }));
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
