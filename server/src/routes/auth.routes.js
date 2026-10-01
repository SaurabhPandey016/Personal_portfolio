import { Router } from "express";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { clearAuthCookies, requireAuth, setAuthCookies } from "../middleware/auth.js";

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });

router.post("/login", loginLimiter, async (request, response, next) => {
  try {
    const email = String(request.body?.email ?? "").trim().toLowerCase();
    const password = String(request.body?.password ?? "");
    if (!email || !password) return response.status(400).json({ error: "Email and password are required." });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return response.status(401).json({ error: "Email or password is incorrect." });
    }
    setAuthCookies(response, user);
    return response.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    return next(error);
  }
});

router.post("/refresh", async (request, response) => {
  const token = request.cookies?.portfolio_refresh;
  if (!token) return response.status(401).json({ error: "A refresh session is required." });
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    if (payload.type !== "refresh") throw new Error("Invalid refresh token.");
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new Error("Admin account not found.");
    setAuthCookies(response, user);
    return response.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch {
    clearAuthCookies(response);
    return response.status(401).json({ error: "Session expired. Please sign in again." });
  }
});

router.post("/logout", (_request, response) => {
  clearAuthCookies(response);
  return response.status(204).end();
});

router.get("/me", requireAuth, async (request, response, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: request.user.id }, select: { id: true, name: true, email: true } });
    if (!user) return response.status(401).json({ error: "Admin account not found." });
    return response.json({ user });
  } catch (error) {
    return next(error);
  }
});

export default router;