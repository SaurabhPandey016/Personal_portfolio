import { Router } from "express";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: "draft-8", legacyHeaders: false });

router.post("/contact", contactLimiter, async (request, response, next) => {
  const name = String(request.body?.name ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  const email = String(request.body?.email ?? "").trim().toLowerCase();
  const subject = String(request.body?.subject ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  const message = String(request.body?.message ?? "").trim();
  if (name.length < 2 || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || message.length < 5 || message.length > 10000) {
    return response.status(400).json({ error: "Enter a valid name, email address, and message." });
  }

  try {
    const saved = await prisma.message.create({ data: { name, email, subject: subject.slice(0, 180) || null, message } });
    let emailSent = false;
    let emailStatus = "not_configured";
    const smtpConfigured = ["SMTP_HOST", "SMTP_USER", "SMTP_FROM", "CONTACT_TO"].every((key) => process.env[key]?.trim()) && Boolean(process.env.SMTP_PASS);
    if (smtpConfigured) {
      const port = Number(process.env.SMTP_PORT) || 587;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE === "true" || port === 465,
        requireTLS: port === 587,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      let timeout;
      try {
        await Promise.race([
          transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.CONTACT_TO,
            replyTo: email,
            subject: subject || `Portfolio message from ${name}`,
            text: `From: ${name} <${email}>\n\n${message}`,
          }),
          new Promise((_, reject) => {
            timeout = setTimeout(() => {
              const error = new Error("Contact email delivery timed out.");
              error.code = "ETIMEDOUT";
              reject(error);
            }, 20_000);
            timeout.unref();
          }),
        ]);
        emailSent = true;
        emailStatus = "sent";
      } catch (error) {
        emailStatus = "failed";
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : "UNKNOWN";
        const responseCode = typeof error === "object" && error && "responseCode" in error ? String(error.responseCode) : undefined;
        const command = typeof error === "object" && error && "command" in error ? String(error.command) : undefined;
        console.error("Contact email delivery failed.", { code, responseCode, command });
      } finally {
        clearTimeout(timeout);
        transporter.close();
      }
    }
    return response.status(201).json({ message: "Message received.", id: saved.id, emailSent, emailStatus });
  } catch (error) {
    return next(error);
  }
});

router.get("/messages", requireAuth, async (_request, response, next) => {
  try {
    const items = await prisma.message.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return response.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.patch("/messages/:id", requireAuth, async (request, response, next) => {
  const status = String(request.body?.status ?? "").toUpperCase();
  if (!["NEW", "READ", "ARCHIVED"].includes(status)) return response.status(400).json({ error: "Invalid message status." });
  try {
    const item = await prisma.message.update({ where: { id: request.params.id }, data: { status } });
    return response.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.delete("/messages/:id", requireAuth, async (request, response, next) => {
  try {
    await prisma.message.delete({ where: { id: request.params.id } });
    return response.status(204).end();
  } catch (error) {
    if (error?.code === "P2025") return response.status(404).json({ error: "Message not found." });
    return next(error);
  }
});

export default router;