import express from "express";
import { z } from "zod";
import { getDb } from "../db.js";
import { ok, fail } from "../http.js";
import { parseBody, zId } from "../validate.js";

const router = express.Router();

const menuCreateSchema = z.object({
  parentId: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().min(1),
  code: z.string().min(1),
  path: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sort: z.coerce.number().int().optional().default(0),
  enabled: z.coerce.number().int().optional().default(1),
});

const menuUpdateSchema = menuCreateSchema.partial().extend({
  parentId: z.coerce.number().int().positive().nullable().optional(),
});

router.get("/", async (req, res) => {
  const db = await getDb();
  const rows = await db.all(
    "SELECT id, parent_id as parentId, name, code, path, icon, sort, enabled, created_at as createdAt, updated_at as updatedAt FROM menu ORDER BY sort ASC, id ASC"
  );
  ok(res, rows);
});

router.post("/", parseBody(menuCreateSchema), async (req, res) => {
  const db = await getDb();
  const b = req.validatedBody;
  try {
    const result = await db.run(
      `INSERT INTO menu (parent_id, name, code, path, icon, sort, enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
      b.parentId ?? null,
      b.name,
      b.code,
      b.path ?? null,
      b.icon ?? null,
      b.sort ?? 0,
      b.enabled ?? 1
    );
    const created = await db.get(
      "SELECT id, parent_id as parentId, name, code, path, icon, sort, enabled, created_at as createdAt, updated_at as updatedAt FROM menu WHERE id = ?",
      result.lastID
    );
    ok(res, created);
  } catch (e) {
    fail(res, 400, e?.message || "Failed to create menu");
  }
});

router.put("/:id", parseBody(menuUpdateSchema), async (req, res) => {
  const id = zId.parse(req.params.id);
  const db = await getDb();
  const b = req.validatedBody;

  const current = await db.get("SELECT * FROM menu WHERE id = ?", id);
  if (!current) return fail(res, 404, "Menu not found");

  const next = {
    parentId: b.parentId ?? current.parent_id,
    name: b.name ?? current.name,
    code: b.code ?? current.code,
    path: b.path === undefined ? current.path : b.path,
    icon: b.icon === undefined ? current.icon : b.icon,
    sort: b.sort ?? current.sort,
    enabled: b.enabled ?? current.enabled,
  };

  try {
    await db.run(
      `UPDATE menu
       SET parent_id = ?, name = ?, code = ?, path = ?, icon = ?, sort = ?, enabled = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ?`,
      next.parentId ?? null,
      next.name,
      next.code,
      next.path ?? null,
      next.icon ?? null,
      next.sort,
      next.enabled,
      id
    );
    const updated = await db.get(
      "SELECT id, parent_id as parentId, name, code, path, icon, sort, enabled, created_at as createdAt, updated_at as updatedAt FROM menu WHERE id = ?",
      id
    );
    ok(res, updated);
  } catch (e) {
    fail(res, 400, e?.message || "Failed to update menu");
  }
});

router.delete("/:id", async (req, res) => {
  const id = zId.parse(req.params.id);
  const db = await getDb();
  const current = await db.get("SELECT id FROM menu WHERE id = ?", id);
  if (!current) return fail(res, 404, "Menu not found");
  await db.run("DELETE FROM menu WHERE id = ?", id);
  ok(res, { id });
});

export default router;

