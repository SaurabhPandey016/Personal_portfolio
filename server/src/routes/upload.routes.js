import { Router } from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const uploadDirectory = fileURLToPath(new URL("../../uploads/", import.meta.url));
const extensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif" };
const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => fs.mkdir(uploadDirectory, { recursive: true }).then(() => callback(null, uploadDirectory), callback),
    filename: (_request, file, callback) => callback(null, `${crypto.randomUUID()}${extensions[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => callback(null, Boolean(extensions[file.mimetype])),
});

const router = Router();

router.post("/image", requireAuth, (request, response, next) => {
  upload.single("image")(request, response, async (error) => {
    if (error) return response.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Images must be 5 MB or smaller." : "Choose a JPEG, PNG, WebP, GIF, or AVIF image." });
    if (!request.file) return response.status(400).json({ error: "Choose an image to upload." });
    try {
      const media = await prisma.media.create({
        data: { filename: request.file.filename, url: `/uploads/${request.file.filename}`, mimeType: request.file.mimetype, size: request.file.size },
      });
      return response.status(201).json({ media });
    } catch (databaseError) {
      await fs.rm(path.join(uploadDirectory, request.file.filename), { force: true });
      return next(databaseError);
    }
  });
});

router.get("/", requireAuth, async (_request, response, next) => {
  try {
    const items = await prisma.media.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return response.json({ items });
  } catch (error) {
    return next(error);
  }
});

export { uploadDirectory };
export default router;