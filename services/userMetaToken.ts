"use client";

const TOKEN_KEY = "cert_user_meta_token_override";

export function getUserMetaTokenOverride(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setUserMetaTokenOverride(token: string): void {
  try {
    const next = token.trim();
    if (!next) {
      sessionStorage.removeItem(TOKEN_KEY);
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, next);
  } catch {
    // ignore storage failures
  }
}

