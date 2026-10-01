import { Router } from "express";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: "draft-8", legacyHeaders: false });

router.post("/contact", contactLimiter, async (request, response, next) => {
  const name = String(request.body?.name ?? "").trim();
  const email = String(request.body?.email ?? "").trim().toLowerCase();
  const subject = String(request.body?.subject ?? "").trim();
  const message = String(request.body?.message ?? "").trim();
  if (name.length < 2 || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || message.length < 5 || message.length > 10000) {
    return response.status(400).json({ error: "Enter a valid name, email address, and message." });
  }

  try {
    const saved = await prisma.message.create({ data: { name, email, subject: subject.slice(0, 180) || null, message } });
    let emailSent = false;
    if (process.env.SMTP_HOST && process.env.CONTACT_TO) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: process.env.CONTACT_TO,
          replyTo: email,
          subject: subject || `Portfolio message from ${name}`,
          text: `From: ${name} <${email}>\n\n${message}`,
        });
        emailSent = true;
      } catch {
        console.error("Contact email delivery failed.");
      }
    }
    return response.status(201).json({ message: "Message received.", id: saved.id, emailSent });
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

export default router;