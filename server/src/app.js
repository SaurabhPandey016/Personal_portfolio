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

app.use((error, _request, response, _next) => {
  console.error("API request failed.");
  if (response.headersSent) return;
  if (error.code === "P2002") return response.status(409).json({ error: "That unique value is already in use." });
  return response.status(500).json({ error: "The request could not be completed." });
});

export default app;