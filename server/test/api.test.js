import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import app from "../src/app.js";
import { setAuthCookies } from "../src/middleware/auth.js";

let server;
let origin;

before(async () => {
  server = app.listen(0);
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health endpoint is public", async () => {
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("CORS allows the local client origin with credentials", async () => {
  const response = await fetch(`${origin}/api/health`, { headers: { Origin: "http://127.0.0.1:3000" } });
  assert.equal(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:3000");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("draft collection reads require the admin cookie", async () => {
  const response = await fetch(`${origin}/api/projects?admin=true`);
  assert.equal(response.status, 401);
});

test("content writes require the admin cookie", async () => {
  const response = await fetch(`${origin}/api/projects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(response.status, 401);
});

test("contact form rejects an incomplete payload", async () => {
  const response = await fetch(`${origin}/api/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(response.status, 400);
});

test("image uploads require the admin cookie", async () => {
  const response = await fetch(`${origin}/api/upload/image`, { method: "POST" });
  assert.equal(response.status, 401);
});

test("auth cookies use cross-site settings in production and lax settings locally", () => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  };
  const cookies = {};
  const response = {
    cookie(name, value, options) {
      cookies[name] = { value, options };
      return this;
    },
  };
  process.env.JWT_SECRET = "test-access-secret-that-is-long-enough";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";

  try {
    process.env.NODE_ENV = "production";
    setAuthCookies(response, { id: "admin" });
    assert.equal(cookies.portfolio_access.options.sameSite, "none");
    assert.equal(cookies.portfolio_access.options.secure, true);
    assert.equal(cookies.portfolio_access.options.httpOnly, true);

    process.env.NODE_ENV = "development";
    setAuthCookies(response, { id: "admin" });
    assert.equal(cookies.portfolio_access.options.sameSite, "lax");
    assert.equal(cookies.portfolio_access.options.secure, false);
  } finally {
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.jwtSecret;
    if (previous.refreshSecret === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = previous.refreshSecret;
  }
});