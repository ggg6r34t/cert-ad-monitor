"use client";

export function getInternalApiKey(): string {
  try {
    return localStorage.getItem("cert_internal_api_key") ?? "";
  } catch {
    return "";
  }
}

export function withInternalApiKey(headers?: HeadersInit): HeadersInit {
  const key = getInternalApiKey();
  if (!key) return headers ?? {};
  return {
    ...(headers ?? {}),
    "x-internal-api-key": key,
  };
}

