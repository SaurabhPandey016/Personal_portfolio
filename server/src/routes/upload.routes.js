import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const maxFileSize = 10 * 1024 * 1024;
const inlineImageTypes = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]);
const uploadDirectory = fileURLToPath(new URL("../../uploads/", import.meta.url));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: 1 },
});

const router = Router();

router.post("/image", requireAuth, (request, response, next) => {
  upload.single("image")(request, response, async (error) => {
    if (error) return response.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Files must be 10 MB or smaller." : "Choose a single file to upload." });
    if (!request.file) return response.status(400).json({ error: "Choose a file to upload." });

    try {
      const id = crypto.randomUUID();
      const originalName = request.file.originalname
        .replace(/\\/g, "/")
        .split("/")
        .at(-1)
        ?.replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .slice(0, 255) || "download";
      const extension = originalName.match(/\.[a-z0-9]{1,12}$/i)?.[0] ?? "";
      const mimeType = /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(request.file.mimetype)
        ? request.file.mimetype.toLowerCase()
        : "application/octet-stream";
      const media = await prisma.media.create({
        select: {
          id: true,
          filename: true,
          originalName: true,
          url: true,
          mimeType: true,
          size: true,
          altText: true,
          createdAt: true,
        },
        data: {
          id,
          filename: `${id}${extension}`,
          originalName,
          url: `${request.protocol}://${request.get("host")}/api/media/files/${id}`,
          mimeType,
          size: request.file.size,
          data: request.file.buffer,
        },
      });
      return response.status(201).json({ media });
    } catch (uploadError) {
      return next(uploadError);
    }
  });
});

router.get("/", requireAuth, async (_request, response, next) => {
  try {
    const items = await prisma.media.findMany({
      select: {
        id: true,
        filename: true,
        originalName: true,
        url: true,
        mimeType: true,
        size: true,
        altText: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return response.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get("/files/:id", async (request, response, next) => {
  try {
    const media = await prisma.media.findUnique({
      where: { id: request.params.id },
      select: { data: true, filename: true, originalName: true, mimeType: true },
    });
    if (!media?.data) return response.status(404).json({ error: "File not found." });

    response.set("X-Content-Type-Options", "nosniff");
    response.set("Cache-Control", "public, max-age=31536000, immutable");
    if (inlineImageTypes.has(media.mimeType)) {
      return response.type(media.mimeType).send(media.data);
    }
    response.attachment(media.originalName || media.filename);
    return response.type("application/octet-stream").send(media.data);
  } catch (error) {
    return next(error);
  }
});

export { uploadDirectory };
export default router;