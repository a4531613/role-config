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
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ ok: false, message: "Internal Server Error" });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${port}`);
});

