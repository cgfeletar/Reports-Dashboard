/**
 * Site-wide password gate, off unless SITE_PASSWORD is set. A valid session cookie passes; otherwise HTTP Basic
 * auth (username ignored) is checked against SITE_PASSWORD and, on success,
 * a signed session cookie is issued so browsers stop re-prompting.
 * Runs on the Edge runtime: Web APIs only (no node:crypto, no Buffer).
 */
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SESSION_MESSAGE = "reports-session-v1";

const encoder = new TextEncoder();

/** Hex HMAC-SHA256 of a fixed message, keyed by the site password. */
export async function sessionToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(SESSION_MESSAGE));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** XOR-accumulating compare; different lengths still do the work, then fail. */
function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < x.length; i++) diff |= (x[i] ?? 0) ^ (y[i % Math.max(y.length, 1)] ?? 0);
  return diff === 0;
}

/** Password from a Basic header, or null if absent or malformed. Splits on the first colon only. */
function basicPassword(header: string | null): string | null {
  const encoded = header?.match(/^Basic\s+(.+)$/i)?.[1];
  if (!encoded) return null;
  try {
    const bytes = Uint8Array.from(atob(encoded.trim()), (c) => c.charCodeAt(0));
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const idx = decoded.indexOf(":");
    return idx === -1 ? null : decoded.slice(idx + 1);
  } catch {
    return null;
  }
}

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Reports"', "Cache-Control": "no-store" },
  });
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Read at request time so the value can change without a reload.
  const password = process.env.SITE_PASSWORD;
  const isProd = process.env.NODE_ENV === "production";

  // No password configured: the site is public.
  if (!password) return NextResponse.next();

  const token = await sessionToken(password);

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie && safeEqual(cookie, token)) return NextResponse.next();

  const supplied = basicPassword(request.headers.get("authorization"));
  if (supplied !== null && safeEqual(supplied, password)) {
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      secure: isProd,
    });
    return response;
  }

  return unauthorized();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
