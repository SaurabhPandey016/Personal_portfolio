import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db.js";

const models = {
  about: { delegate: "about", fields: ["fullName", "headline", "intro", "biography", "email", "location", "availability", "linkedInUrl", "githubUrl", "resumeUrl", "profileImageUrl"] },
  skills: { delegate: "skill", fields: ["name", "category", "level", "sortOrder", "published"] },
  projects: { delegate: "project", fields: ["title", "slug", "summary", "description", "role", "stack", "imageUrl", "websiteUrl", "sourceUrl", "featured", "published", "sortOrder"] },
  blogs: { delegate: "blog", fields: ["title", "slug", "excerpt", "content", "category", "coverImage", "published", "publishedAt"], orderBy: { createdAt: "desc" } },
  experience: { delegate: "experience", fields: ["title", "company", "location", "employment", "description", "startDate", "endDate", "sortOrder", "published"] },
  testimonials: { delegate: "testimonial", fields: ["quote", "author", "role", "company", "imageUrl", "sortOrder", "published"] },
  services: { delegate: "service", fields: ["title", "description", "icon", "sortOrder", "published"] },
};

function getModel(resource, response) {
  const config = models[resource];
  if (!config) {
    response.status(404).json({ error: "Content type not found." });
    return null;
  }
  return { config, delegate: prisma[config.delegate] };
}

function cleanBody(body, allowedFields) {
  const result = Object.fromEntries(Object.entries(body ?? {}).filter(([key]) => allowedFields.includes(key)));
  if ("sortOrder" in result) result.sortOrder = Number(result.sortOrder) || 0;
  for (const field of ["published", "featured"]) {
    if (typeof result[field] === "string") result[field] = result[field] === "true";
  }
  if (typeof result.stack === "string") result.stack = result.stack.split(",").map((item) => item.trim()).filter(Boolean);
  if (typeof result.publishedAt === "string" && result.publishedAt) result.publishedAt = new Date(result.publishedAt);
  if (result.publishedAt === "") result.publishedAt = null;
  return result;
}

function sendDatabaseError(error, response) {
  if (error?.code === "P2025") return response.status(404).json({ error: "Content item not found." });
  if (error?.code === "P2002") return response.status(409).json({ error: "That unique value is already in use." });
  if (error?.code === "P2000" || error?.code === "P2006") return response.status(400).json({ error: "One or more fields have an invalid value." });
  return response.status(500).json({ error: "The content request could not be completed." });
}

const router = Router();

router.get("/:resource", (request, response, next) => {
  if (request.params.resource === "about" || request.query.admin !== "true") return next();
  return requireAuth(request, response, next);
}, async (request, response) => {
  const model = getModel(request.params.resource, response);
  if (!model) return;
  try {
    if (request.params.resource === "about") {
      const item = await model.delegate.findUnique({ where: { id: "portfolio" } });
      return response.json({ item });
    }
    const where = request.query.admin === "true" ? {} : { published: true };
    const items = await model.delegate.findMany({
      where,
      orderBy: model.config.orderBy ?? { sortOrder: "asc" },
      take: 100,
    });
    return response.json({ items });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
});

router.post("/:resource", requireAuth, async (request, response) => {
  const model = getModel(request.params.resource, response);
  if (!model) return;
  if (request.params.resource === "about") return response.status(405).json({ error: "Use PUT to save the profile." });
  try {
    const item = await model.delegate.create({ data: cleanBody(request.body, model.config.fields) });
    return response.status(201).json({ item });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
});

router.put("/about", requireAuth, async (request, response) => {
  const model = getModel("about", response);
  const data = cleanBody(request.body, model.config.fields);
  if (!data.fullName || !data.email || !data.headline) return response.status(400).json({ error: "Name, headline, and email are required." });
  try {
    const item = await model.delegate.upsert({ where: { id: "portfolio" }, create: { id: "portfolio", ...data }, update: data });
    return response.json({ item });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
});

router.put("/:resource/:id", requireAuth, async (request, response) => {
  const model = getModel(request.params.resource, response);
  if (!model) return;
  if (request.params.resource === "about") return response.status(405).json({ error: "Use PUT /about to save the profile." });
  try {
    const item = await model.delegate.update({ where: { id: request.params.id }, data: cleanBody(request.body, model.config.fields) });
    return response.json({ item });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
});

router.delete("/:resource/:id", requireAuth, async (request, response) => {
  const model = getModel(request.params.resource, response);
  if (!model) return;
  if (request.params.resource === "about") return response.status(405).json({ error: "The profile cannot be deleted." });
  try {
    await model.delegate.delete({ where: { id: request.params.id } });
    return response.status(204).end();
  } catch (error) {
    return sendDatabaseError(error, response);
  }
});

export default router;