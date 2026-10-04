import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:net";
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

async function createSmtpTestServer() {
  const recipients = [];
  let messageData = "";
  const smtpServer = createServer((socket) => {
    socket.setEncoding("utf8");
    socket.write("220 local-test SMTP ready\r\n");
    let buffer = "";
    let receivingData = false;
    let authStep = 0;
    socket.on("data", (chunk) => {
      buffer += chunk;
      let lineEnd;
      while ((lineEnd = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, lineEnd).replace(/\r$/, "");
        buffer = buffer.slice(lineEnd + 1);
        if (receivingData) {
          if (line === ".") {
            receivingData = false;
            socket.write("250 2.0.0 Message accepted\r\n");
          } else {
            messageData += `${line}\n`;
          }
        } else if (/^EHLO|^HELO/i.test(line)) {
          socket.write("250-local-test\r\n250-AUTH LOGIN\r\n250 SIZE 10485760\r\n");
        } else if (/^AUTH LOGIN/i.test(line)) {
          authStep = 1;
          socket.write("334 VXNlcm5hbWU6\r\n");
        } else if (authStep === 1) {
          authStep = 2;
          socket.write("334 UGFzc3dvcmQ6\r\n");
        } else if (authStep === 2) {
          authStep = 0;
          socket.write("235 2.7.0 Authenticated\r\n");
        } else if (/^MAIL FROM:/i.test(line)) {
          socket.write("250 2.1.0 Sender accepted\r\n");
        } else if (/^RCPT TO:/i.test(line)) {
          recipients.push(line.match(/<([^>]+)>/)?.[1] ?? "");
          socket.write("250 2.1.5 Recipient accepted\r\n");
        } else if (/^DATA$/i.test(line)) {
          receivingData = true;
          socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
        } else if (/^QUIT$/i.test(line)) {
          socket.write("221 2.0.0 Bye\r\n");
          socket.end();
        } else {
          socket.write("250 2.0.0 OK\r\n");
        }
      }
    });
  });
  smtpServer.listen(0, "127.0.0.1");
  await once(smtpServer, "listening");
  return {
    port: smtpServer.address().port,
    recipients,
    get messageData() { return messageData; },
    close: () => new Promise((resolve, reject) => smtpServer.close((error) => error ? reject(error) : resolve())),
  };
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

test("admins can delete messages and missing messages return 404", async (context) => {
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
  let deletedId;
  const restoreDelete = replacePrismaMethod(prisma.message, "delete", async ({ where }) => {
    deletedId = where.id;
    return {};
  });
  context.after(() => {
    restoreDelete();
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.jwtSecret;
    if (previous.refreshSecret === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = previous.refreshSecret;
  });

  const headers = { Cookie: Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; ") };
  const unauthorized = await fetch(`${origin}/api/messages/message-1`, { method: "DELETE" });
  assert.equal(unauthorized.status, 401);

  const response = await fetch(`${origin}/api/messages/message-1`, { method: "DELETE", headers });
  assert.equal(response.status, 204);
  assert.equal(deletedId, "message-1");

  Object.defineProperty(prisma.message, "delete", {
    ...Object.getOwnPropertyDescriptor(prisma.message, "delete"),
    value: async () => { throw { code: "P2025" }; },
  });
  const missing = await fetch(`${origin}/api/messages/missing`, { method: "DELETE", headers });
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "Message not found." });
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

test("contact email is sent to CONTACT_TO with visitor reply-to and delivery status", async (context) => {
  const keys = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "CONTACT_TO"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const smtp = await createSmtpTestServer();
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = String(smtp.port);
  process.env.SMTP_SECURE = "false";
  process.env.SMTP_USER = "test-sender";
  process.env.SMTP_PASS = "test-password";
  process.env.SMTP_FROM = "verified-sender@example.test";
  process.env.CONTACT_TO = "developersaurabh04@gmail.com";
  const savedMessages = [];
  const restoreCreate = replacePrismaMethod(prisma.message, "create", async ({ data }) => {
    const saved = { id: "smtp-test-message", ...data };
    savedMessages.push(saved);
    return saved;
  });
  context.after(async () => {
    restoreCreate();
    await smtp.close();
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  const response = await fetch(`${origin}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Contact Test", email: "visitor@example.test", message: "SMTP routing test." }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    message: "Message received.",
    id: "smtp-test-message",
    emailSent: true,
    emailStatus: "sent",
  });
  assert.equal(savedMessages.length, 1);
  assert.deepEqual(smtp.recipients, ["developersaurabh04@gmail.com"]);
  assert.match(smtp.messageData, /Reply-To: visitor@example\.test/i);
});

test("contact email failure is bounded and the message is still saved", async (context) => {
  const keys = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "CONTACT_TO"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const smtp = await createSmtpTestServer();
  const closedPort = smtp.port;
  await smtp.close();
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = String(closedPort);
  process.env.SMTP_SECURE = "false";
  process.env.SMTP_USER = "test-sender";
  process.env.SMTP_PASS = "test-password";
  process.env.SMTP_FROM = "verified-sender@example.test";
  process.env.CONTACT_TO = "owner@example.test";
  const restoreCreate = replacePrismaMethod(prisma.message, "create", async ({ data }) => ({ id: "saved-despite-smtp-failure", ...data }));
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
    body: JSON.stringify({ name: "Contact Test", email: "visitor@example.test", message: "Delivery failure test." }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    message: "Message received.",
    id: "saved-despite-smtp-failure",
    emailSent: false,
    emailStatus: "failed",
  });
});