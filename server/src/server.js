import "dotenv/config";
import app from "./app.js";
import { prisma } from "./db.js";

const requiredSecrets = ["JWT_SECRET", "JWT_REFRESH_SECRET"];
const missingSecrets = requiredSecrets.filter((key) => !process.env[key] || process.env[key].length < 32);
if (missingSecrets.length) throw new Error(`Set ${missingSecrets.join(" and ")} to random values of at least 32 characters.`);

const port = Number(process.env.PORT) || 5000;
const server = app.listen(port, () => console.info(`Portfolio API listening on http://localhost:${port}`));

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);