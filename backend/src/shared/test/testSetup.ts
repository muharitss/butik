import { prisma } from "../../infrastructure/prisma/client.js";
import { signSessionToken, SESSION_COOKIE_NAME } from "../../modules/auth/auth.service.js";

let cachedDefaultToken: string | null = null;
let isInitialized = false;

export async function getDefaultTestToken(): Promise<string> {
  if (!cachedDefaultToken) {
    let userId = "36480e9d-f9ff-47ae-8d78-0f460c032900";
    try {
      const op = await prisma.user.findFirst({ where: { isActive: true } });
      if (op) {
        userId = op.id;
      }
    } catch {
      // fallback to seeded operator id
    }

    cachedDefaultToken = await signSessionToken(
      {
        userId,
        role: "owner"
      },
      "24h"
    );
  }
  return cachedDefaultToken;
}

export function initTestAuthHelper(): void {
  if (isInitialized || typeof globalThis.fetch !== "function") {
    return;
  }
  isInitialized = true;

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // Only apply to local test server calls
    if (urlStr.includes("127.0.0.1") || urlStr.includes("localhost")) {
      const headers = new Headers(init?.headers);

      // Explicit opt-out for testing 401 unauthenticated behavior
      if (headers.has("x-test-unauthenticated") || headers.has("x-anonymous")) {
        headers.delete("x-test-unauthenticated");
        headers.delete("x-anonymous");
        return originalFetch(input, { ...init, headers });
      }

      // If test didn't provide session cookie or authorization header, inject valid session token
      if (!headers.has("cookie") && !headers.has("Cookie") && !headers.has("authorization") && !headers.has("Authorization")) {
        const actorHeader = headers.get("x-actor-id");
        let token: string;
        if (actorHeader) {
          // Bridge legacy test actor header to a signed JWT in test mode
          token = await signSessionToken({ userId: actorHeader, role: "owner" }, "1h");
        } else {
          token = await getDefaultTestToken();
        }
        headers.set("Cookie", `${SESSION_COOKIE_NAME}=${token}`);
      }

      return originalFetch(input, { ...init, headers });
    }

    return originalFetch(input, init);
  };
}

initTestAuthHelper();

