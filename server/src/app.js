import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import contentRoutes from "./routes/content.routes.js";
import portfolioRoutes from "./routes/portfolio.routes.js";
import uploadRoutes, { uploadDirectory } from "./routes/upload.routes.js";

const app = express();
const clientOrigins = new Set((process.env.CLIENT_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000").split(",").map((origin) => origin.trim()));

app.disable("x-powered-by");
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || clientOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS."));
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadDirectory, { maxAge: "1d", immutable: true }));

app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api", contactRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/media", uploadRoutes);
app.use("/api", contentRoutes);
app.use("/api/upload", uploadRoutes);

app.use((error, request, response, _next) => {
  const errorCode = typeof error?.code === "string" ? error.code : "UNKNOWN";
  console.error("API request failed.", { method: request.method, path: request.path, code: errorCode });
  if (response.headersSent) return;
  if (error.code === "P2002") return response.status(409).json({ error: "That unique value is already in use." });
  if (error.code === "P2022" && /Media.*(?:data|originalName)|(?:data|originalName).*Media|About.*profileImageUrl/i.test(String(error.meta?.column ?? ""))) {
    return response.status(503).json({ error: "The database is missing media fields. Deploy the latest server migrations, then retry this action." });
  }
  if (error.code === "P2021" && /Media/i.test(String(error.meta?.table ?? ""))) {
    return response.status(503).json({ error: "The media table is not ready. Apply the pending database migrations, then try again." });
  }
  if (["P1001", "P1002", "P1017"].includes(error.code)) {
    return response.status(503).json({ error: "The database is temporarily unavailable. Please try again shortly." });
  }
  if (["P2000", "P2006"].includes(error.code)) {
    return response.status(400).json({ error: "The uploaded file or its details are not supported." });
  }
  return response.status(500).json({ error: "The request could not be completed." });
});

export default app;