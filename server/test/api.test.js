import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import app from "../src/app.js";
import { prisma } from "../src/db.js";
import { setAuthCookies } from "../src/middleware/auth.js";

let server;
let origin;

function replacePrismaMethod(delegate, name, implementation) {
  const original = Object.getOwnPropertyDescriptor(delegate, name);
  Object.defineProperty(delegate, name, { ...original, value: implementation });
  return () => Object.defineProperty(delegate, name, original);
}

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

test("file uploads require the admin cookie", async () => {
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

test("authenticated uploads store arbitrary files in PostgreSQL without returning bytes", async (context) => {
  const previous = {
    jwtSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  };
  process.env.JWT_SECRET = "test-access-secret-that-is-long-enough";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";
  const cookies = {};
  const cookieResponse = {
    cookie(name, value) {
      cookies[name] = value;
      return this;
    },
  };
  setAuthCookies(cookieResponse, { id: "test-admin" });
  const fileBytes = Buffer.from("test PDF content");
  let storedData;
  const restoreCreate = replacePrismaMethod(prisma.media, "create", async ({ data }) => {
    storedData = data;
    const { data: _bytes, ...media } = data;
    return { ...media, createdAt: new Date() };
  });
  const restoreFindMany = replacePrismaMethod(prisma.media, "findMany", async () => [{
    id: "test-file",
    filename: "test-file.pdf",
    originalName: "resume.pdf",
    url: `${origin}/api/media/files/test-file`,
    mimeType: "application/pdf",
    size: fileBytes.length,
    altText: null,
    createdAt: new Date(),
  }]);
  const restoreFindUnique = replacePrismaMethod(prisma.media, "findUnique", async () => ({
    data: fileBytes,
    filename: "test-file.pdf",
    originalName: "resume.pdf",
    mimeType: "application/pdf",
  }));
  context.after(() => {
    restoreCreate();
    restoreFindMany();
    restoreFindUnique();
    if (previous.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.jwtSecret;
    if (previous.refreshSecret === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = previous.refreshSecret;
  });

  const form = new FormData();
  form.append("image", new Blob([fileBytes], { type: "application/pdf" }), "resume.pdf");
  const uploadResponse = await fetch(`${origin}/api/upload/image`, {
    method: "POST",
    headers: { Cookie: Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; ") },
    body: form,
  });
  assert.equal(uploadResponse.status, 201);
  const { media } = await uploadResponse.json();
  assert.equal(media.originalName, "resume.pdf");
  assert.equal(media.mimeType, "application/pdf");
  assert.equal("data" in media, false);
  assert.deepEqual(storedData.data, fileBytes);

  const listResponse = await fetch(`${origin}/api/media`, {
    headers: { Cookie: Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; ") },
  });
  assert.equal(listResponse.status, 200);
  assert.equal("data" in (await listResponse.json()).items[0], false);

  const downloadResponse = await fetch(`${origin}/api/media/files/${media.id}`);
  assert.equal(downloadResponse.status, 200);
  assert.equal(downloadResponse.headers.get("content-type"), "application/octet-stream");
  assert.match(downloadResponse.headers.get("content-disposition"), /attachment/);
  assert.deepEqual(Buffer.from(await downloadResponse.arrayBuffer()), fileBytes);
});

test("contact submissions are saved when SMTP credentials are missing", async (context) => {
  const keys = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "CONTACT_TO"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.SMTP_HOST = "smtp.example.test";
  process.env.SMTP_USER = "sender@example.test";
  delete process.env.SMTP_PASS;
  process.env.SMTP_FROM = "sender@example.test";
  process.env.CONTACT_TO = "owner@example.test";
  const restoreCreate = replacePrismaMethod(prisma.message, "create", async ({ data }) => ({ id: "test-message", ...data }));
  context.after(() => {
    restoreCreate();
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  const response = await fetch(`${origin}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test Visitor", email: "visitor@example.test", message: "Hello there." }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    message: "Message received.",
    id: "test-message",
    emailSent: false,
    emailStatus: "not_configured",
  });
});