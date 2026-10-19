// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config, middleware, sessionToken } from "./middleware";

const PASSWORD = "s3cret-pass";

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://example.test/", { headers });
}

function basic(user: string, pass: string): Record<string, string> {
  const bytes = new TextEncoder().encode(`${user}:${pass}`);
  const b64 = btoa(String.fromCharCode(...bytes));
  return { authorization: `Basic ${b64}` };
}

const isPass = (res: Response): boolean => res.headers.get("x-middleware-next") === "1";

beforeEach(() => {
  vi.stubEnv("SITE_PASSWORD", PASSWORD);
  vi.stubEnv("NODE_ENV", "development");
});
afterEach(() => vi.unstubAllEnvs());

describe("middleware", () => {
  it("passes a valid session cookie with no Authorization header", async () => {
    const token = await sessionToken(PASSWORD);
    const res = await middleware(req({ cookie: `session=${token}` }));
    expect(isPass(res)).toBe(true);
  });

  it.each(["alice", ""])("accepts the right password with username %j and sets the cookie", async (user) => {
    const res = await middleware(req(basic(user, PASSWORD)));
    expect(isPass(res)).toBe(true);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie.split(";")[0]).toBe(`session=${await sessionToken(PASSWORD)}`);
    expect(setCookie).toMatch(/;\s*HttpOnly/i);
    expect(setCookie).toMatch(/;\s*SameSite=Lax/i);
    expect(setCookie).toMatch(/;\s*Path=\//i);
    expect(setCookie).toMatch(/;\s*Max-Age=604800/i);
    expect(setCookie).not.toMatch(/;\s*Secure/i);
  });

  it("marks the cookie Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await middleware(req(basic("u", PASSWORD)));
    expect(res.headers.get("set-cookie")).toMatch(/;\s*Secure/i);
  });

  it("rejects a wrong password with a Basic challenge", async () => {
    const res = await middleware(req(basic("u", "nope")));
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toBe('Basic realm="Reports"');
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects requests with no credentials", async () => {
    expect((await middleware(req())).status).toBe(401);
  });

  it("rejects a tampered cookie", async () => {
    const token = await sessionToken(PASSWORD);
    const flipped = (token[0] === "a" ? "b" : "a") + token.slice(1);
    expect((await middleware(req({ cookie: `session=${flipped}` }))).status).toBe(401);
  });

  it.each(["abc123", "zzzzzzzzzzzzzzzz", "not hex at all!!"])("rejects bad cookie %j", async (value) => {
    expect((await middleware(req({ cookie: `session=${value}` }))).status).toBe(401);
  });

  it.each(["Basic !!!not-base64!!!", "Basic", "Bearer abc", "Basic bm9jb2xvbg=="])(
    "rejects malformed Authorization %j without throwing",
    async (authorization) => {
      expect((await middleware(req({ authorization }))).status).toBe(401);
    },
  );

  it("rejects invalid UTF-8 credentials", async () => {
    expect((await middleware(req({ authorization: `Basic ${btoa("u:\xff\xfe")}` }))).status).toBe(401);
  });

  it("is public in development when SITE_PASSWORD is unset", async () => {
    vi.stubEnv("SITE_PASSWORD", "");
    expect(isPass(await middleware(req()))).toBe(true);
  });

  it("is public in production when SITE_PASSWORD is unset", async () => {
    vi.stubEnv("SITE_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(isPass(await middleware(req()))).toBe(true);
  });

  it("supports passwords containing colons and non-ASCII characters", async () => {
    vi.stubEnv("SITE_PASSWORD", "pa:ss:wörd");
    expect(isPass(await middleware(req(basic("u", "pa:ss:wörd"))))).toBe(true);
  });
});

describe("config.matcher", () => {
  const re = new RegExp(`^${config.matcher[0]}$`);
  it.each(["/_next/static/x.js", "/_next/image", "/favicon.ico"])("excludes %s", (path) => {
    expect(re.test(path)).toBe(false);
  });
  it("includes /", () => {
    expect(re.test("/")).toBe(true);
  });
});
