import "express-async-errors";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import menusRouter from "./routes/menus.js";
import permissionsRouter from "./routes/permissions.js";
import rolesRouter from "./routes/roles.js";
import transferRouter from "./routes/transfer.js";
import { getDb } from "./db.js";

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", async (req, res) => {
  await getDb();
  res.json({ ok: true });
});

app.use("/api/menus", menusRouter);
app.use("/api/permissions", permissionsRouter);
app.use("/api/roles", rolesRouter);
app.use("/api", transferRouter);

app.use((err, req, res, next) => {
  const isZodError = err?.name === "ZodError";
  const status = isZodError ? 400 : 500;
  const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(status).json({
    ok: false,
    message: isZodError ? "Invalid request" : "Internal Server Error",
    details: isZodError
      ? err.flatten?.()
      : isProd
        ? undefined
        : {
            name: err?.name,
            message: err?.message,
            code: err?.code,
            stack: err?.stack,
          },
  });
});

const port = Number(process.env.PORT || 3001);
const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${port}`);
});

server.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error(`[server] listen error on port ${port}:`, err);
  process.exit(1);
});
