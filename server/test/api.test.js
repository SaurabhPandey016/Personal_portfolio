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

test("profile image URL is accepted by authenticated profile updates", async (context) => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  };
  process.env.NODE_ENV = "development";
  process.env.JWT_SECRET = "test-access-secret-that-is-long-enough";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";
  const cookies = {};
  setAuthCookies({ cookie(name, value) { cookies[name] = value; return this; } }, { id: "test-admin" });
  let upsertData;
  const restoreUpsert = replacePrismaMethod(prisma.about, "upsert", async (args) => {
    upsertData = args;
    return args.update;
  });
  context.after(() => {
    restoreUpsert();
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.jwtSecret;
    if (previous.refreshSecret === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = previous.refreshSecret;
  });

  const profile = {
    fullName: "Test Admin",
    headline: "Developer",
    intro: "Intro",
    biography: "Biography",
    email: "admin@example.test",
    profileImageUrl: "https://media.example.test/profile.png",
    unexpected: "ignored",
  };
  const response = await fetch(`${origin}/api/about`, {
    method: "PUT",
    headers: {
      Cookie: Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; "),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });
  assert.equal(response.status, 200);
  assert.equal(upsertData.where.id, "portfolio");
  assert.equal(upsertData.update.profileImageUrl, profile.profileImageUrl);
  assert.equal("unexpected" in upsertData.update, false);
});

test("authenticated testimonial management supports listing, creation, update, and deletion", async (context) => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  };
  process.env.NODE_ENV = "development";
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
  let createdData;
  let updatedData;
  let deleteId;
  const testimonial = {
    id: "testimonial-1",
    quote: "Thoughtful collaborator.",
    author: "Alex Example",
    role: "Founder",
    company: "Example Co.",
    imageUrl: null,
    sortOrder: 0,
    published: true,
  };
  const restoreFindMany = replacePrismaMethod(prisma.testimonial, "findMany", async (query) => {
    assert.deepEqual(query.orderBy, { sortOrder: "asc" });
    return [testimonial];
  });
  const restoreCreate = replacePrismaMethod(prisma.testimonial, "create", async ({ data }) => {
    createdData = data;
    return { id: "testimonial-2", ...data };
  });
  const restoreUpdate = replacePrismaMethod(prisma.testimonial, "update", async ({ where, data }) => {
    assert.equal(where.id, "testimonial-2");
    updatedData = data;
    return { id: where.id, ...data };
  });
  const restoreDelete = replacePrismaMethod(prisma.testimonial, "delete", async ({ where }) => {
    deleteId = where.id;
    return {};
  });
  context.after(() => {
    restoreFindMany();
    restoreCreate();
    restoreUpdate();
    restoreDelete();
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.jwtSecret;
    if (previous.refreshSecret === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = previous.refreshSecret;
  });

  const headers = {
    Cookie: Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; "),
    "Content-Type": "application/json",
  };
  const listResponse = await fetch(`${origin}/api/testimonials?admin=true`, { headers });
  assert.equal(listResponse.status, 200);
  assert.deepEqual((await listResponse.json()).items, [testimonial]);

  const createResponse = await fetch(`${origin}/api/testimonials`, {
    method: "POST",
    headers,
    body: JSON.stringify({ quote: "A great partner.", author: "Jamie Example", published: true, unexpected: "ignored" }),
  });
  assert.equal(createResponse.status, 201);
  assert.deepEqual(createdData, { quote: "A great partner.", author: "Jamie Example", published: true });

  const updateResponse = await fetch(`${origin}/api/testimonials/testimonial-2`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ quote: "An even better partner.", published: false }),
  });
  assert.equal(updateResponse.status, 200);
  assert.deepEqual(updatedData, { quote: "An even better partner.", published: false });

  const deleteResponse = await fetch(`${origin}/api/testimonials/testimonial-2`, { method: "DELETE", headers });
  assert.equal(deleteResponse.status, 204);
  assert.equal(deleteId, "testimonial-2");
});

test("blog admin reads use a supported timestamp sort field", async (context) => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  };
  process.env.NODE_ENV = "development";
  process.env.JWT_SECRET = "test-access-secret-that-is-long-enough";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";
  const cookies = {};
  setAuthCookies({ cookie(name, value) { cookies[name] = value; return this; } }, { id: "test-admin" });
  const restoreFindMany = replacePrismaMethod(prisma.blog, "findMany", async (query) => {
    assert.deepEqual(query.orderBy, { createdAt: "desc" });
    return [];
  });
  context.after(() => {
    restoreFindMany();
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.jwtSecret;
    if (previous.refreshSecret === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = previous.refreshSecret;
  });

  const response = await fetch(`${origin}/api/blogs?admin=true`, {
    headers: { Cookie: Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; ") },
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).items, []);
});

test("logout expires both authentication cookies", async () => {
  const response = await fetch(`${origin}/api/auth/logout`, { method: "POST" });
  assert.equal(response.status, 204);
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /portfolio_access=/);
  assert.match(setCookie, /portfolio_refresh=/);
  assert.match(setCookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i);
});

test("contact form rejects an incomplete payload", async () => {
  const response = await fetch(`${origin}/api/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(response.status, 400);
});

test("file uploads require the admin cookie", async () => {
  const response = await fetch(`${origin}/api/upload/image`, { method: "POST" });
  assert.equal(response.status, 401);
});

test("media upload reports a pending storage migration clearly", async (context) => {
  const previous = {
    jwtSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  };
  process.env.JWT_SECRET = "test-access-secret-that-is-long-enough";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";
  const cookies = {};
  setAuthCookies({ cookie(name, value) { cookies[name] = value; return this; } }, { id: "test-admin" });
  const restoreCreate = replacePrismaMethod(prisma.media, "create", async () => {
    throw { code: "P2022", meta: { column: '"Media"."data"' } };
  });
  context.after(() => {
    restoreCreate();
    if (previous.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.jwtSecret;
    if (previous.refreshSecret === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = previous.refreshSecret;
  });

  const form = new FormData();
  form.append("image", new Blob(["sample image"]), "sample.png");
  const response = await fetch(`${origin}/api/upload/image`, {
    method: "POST",
    headers: { Cookie: Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; ") },
    body: form,
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "The database is missing media fields. Deploy the latest server migrations, then retry this action.",
  });
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