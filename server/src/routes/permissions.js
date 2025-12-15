import express from "express";
import { z } from "zod";
import { getDb } from "../db.js";
import { ok, fail } from "../http.js";
import { parseBody, zId } from "../validate.js";

const router = express.Router();

const permissionCreateSchema = z.object({
  parentId: z.coerce.number().int().positive().nullable().optional(),
  level: z.enum(["class", "method"]),
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().nullable().optional(),
  sort: z.coerce.number().int().optional().default(0),
  enabled: z.coerce.number().int().optional().default(1),
});

const permissionUpdateSchema = permissionCreateSchema.partial().extend({
  parentId: z.coerce.number().int().positive().nullable().optional(),
});

router.get("/", async (req, res) => {
  const db = await getDb();
  const rows = await db.all(
    "SELECT id, parent_id as parentId, level, name, code, description, sort, enabled, created_at as createdAt, updated_at as updatedAt FROM permission ORDER BY sort ASC, id ASC"
  );
  ok(res, rows);
});

router.post("/", parseBody(permissionCreateSchema), async (req, res) => {
  const db = await getDb();
  const b = req.validatedBody;
  try {
    if (b.level === "class" && b.parentId != null) throw new Error("class permission must not have parentId");
    if (b.level === "method") {
      if (b.parentId == null) throw new Error("method permission must have parentId");
      const parent = await db.get(
        "SELECT id, level FROM permission WHERE id = ?",
        b.parentId
      );
      if (!parent) throw new Error("Parent permission not found");
      if (parent.level !== "class") throw new Error("method parent must be class level");
    }
    const result = await db.run(
      `INSERT INTO permission (parent_id, level, name, code, description, sort, enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
      b.parentId ?? null,
      b.level,
      b.name,
      b.code,
      b.description ?? null,
      b.sort ?? 0,
      b.enabled ?? 1
    );
    const created = await db.get(
      "SELECT id, parent_id as parentId, level, name, code, description, sort, enabled, created_at as createdAt, updated_at as updatedAt FROM permission WHERE id = ?",
      result.lastID
    );
    ok(res, created);
  } catch (e) {
    fail(res, 400, e?.message || "Failed to create permission");
  }
});

router.put("/:id", parseBody(permissionUpdateSchema), async (req, res) => {
  const id = zId.parse(req.params.id);
  const db = await getDb();
  const b = req.validatedBody;

  const current = await db.get("SELECT * FROM permission WHERE id = ?", id);
  if (!current) return fail(res, 404, "Permission not found");

  const nextLevel = b.level ?? current.level;
  const nextParentId = b.parentId ?? current.parent_id;
  if (nextLevel === "class" && nextParentId != null) return fail(res, 400, "class permission must not have parentId");
  if (nextLevel === "method") {
    if (nextParentId == null) return fail(res, 400, "method permission must have parentId");
    if (nextParentId === id) return fail(res, 400, "parentId cannot be self");
    const parent = await db.get("SELECT id, level FROM permission WHERE id = ?", nextParentId);
    if (!parent) return fail(res, 400, "Parent permission not found");
    if (parent.level !== "class") return fail(res, 400, "method parent must be class level");
  }

  const next = {
    parentId: b.parentId ?? current.parent_id,
    level: b.level ?? current.level,
    name: b.name ?? current.name,
    code: b.code ?? current.code,
    description: b.description === undefined ? current.description : b.description,
    sort: b.sort ?? current.sort,
    enabled: b.enabled ?? current.enabled,
  };

  try {
    await db.run(
      `UPDATE permission
       SET parent_id = ?, level = ?, name = ?, code = ?, description = ?, sort = ?, enabled = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ?`,
      next.parentId ?? null,
      next.level,
      next.name,
      next.code,
      next.description ?? null,
      next.sort,
      next.enabled,
      id
    );
    const updated = await db.get(
      "SELECT id, parent_id as parentId, level, name, code, description, sort, enabled, created_at as createdAt, updated_at as updatedAt FROM permission WHERE id = ?",
      id
    );
    ok(res, updated);
  } catch (e) {
    fail(res, 400, e?.message || "Failed to update permission");
  }
});

router.delete("/:id", async (req, res) => {
  const id = zId.parse(req.params.id);
  const db = await getDb();
  const current = await db.get("SELECT id FROM permission WHERE id = ?", id);
  if (!current) return fail(res, 404, "Permission not found");
  await db.run("DELETE FROM permission WHERE id = ?", id);
  ok(res, { id });
});

export default router;
