import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Portfolio Admin";
  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) before running db:seed.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({ where: { email }, create: { email, name, passwordHash }, update: { name, passwordHash } });
  console.info(`Admin account ready for ${email}.`);
} finally {
  await prisma.$disconnect();
}