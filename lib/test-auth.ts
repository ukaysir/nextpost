"use client";

export type TestUser = {
  id: string;
  name: string;
  signedInAt: string;
};

export const TEST_AUTH_STORAGE_KEY = "nextpost:test-auth";
export const TEST_ACCOUNT_ID = "test";
export const TEST_ACCOUNT_PASSWORD = "test";

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function isTestCredential(identifier: string, password: string) {
  return identifier.trim() === TEST_ACCOUNT_ID && password === TEST_ACCOUNT_PASSWORD;
}

export function signInTestUser() {
  if (!hasBrowserStorage()) return null;

  const user: TestUser = {
    id: TEST_ACCOUNT_ID,
    name: "테스트 사용자",
    signedInAt: new Date().toISOString(),
  };

  window.localStorage.setItem(TEST_AUTH_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("nextpost-auth-change"));
  return user;
}

export function getCurrentTestUser() {
  if (!hasBrowserStorage()) return null;

  try {
    const raw = window.localStorage.getItem(TEST_AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<TestUser>;
    if (parsed.id !== TEST_ACCOUNT_ID || !parsed.signedInAt) return null;

    return {
      id: TEST_ACCOUNT_ID,
      name: parsed.name || "테스트 사용자",
      signedInAt: parsed.signedInAt,
    } satisfies TestUser;
  } catch {
    window.localStorage.removeItem(TEST_AUTH_STORAGE_KEY);
    return null;
  }
}

export function signOutTestUser() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(TEST_AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event("nextpost-auth-change"));
}
