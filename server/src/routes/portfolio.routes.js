import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

router.get("/", async (_request, response, next) => {
  try {
    const [about, skills, projects, blogs, experience, testimonials, services] = await Promise.all([
      prisma.about.findUnique({ where: { id: "portfolio" } }),
      prisma.skill.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
      prisma.project.findMany({ where: { published: true }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }] }),
      prisma.blog.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" } }),
      prisma.experience.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
      prisma.testimonial.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
      prisma.service.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    ]);
    return response.json({ about, skills, projects, blogs, experience, testimonials, services });
  } catch (error) {
    return next(error);
  }
});

export default router;