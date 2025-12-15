import express from "express";
import { z } from "zod";
import { getDb } from "../db.js";
import { ok, fail } from "../http.js";
import { withTransaction } from "../tx.js";
import { parseBody, zId } from "../validate.js";

const router = express.Router();

const menuReorderSchema = z.object({
  parentId: z.coerce.number().int().positive().nullable(),
  orderedIds: z.array(z.coerce.number().int().positive()),
});

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

router.put("/reorder", parseBody(menuReorderSchema), async (req, res) => {
  const db = await getDb();
  const { parentId, orderedIds } = req.validatedBody;

  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length) return fail(res, 400, "orderedIds must be unique");

  if (parentId != null) {
    const parent = await db.get("SELECT id FROM menu WHERE id = ?", parentId);
    if (!parent) return fail(res, 400, "Parent menu not found");
  }

  if (orderedIds.length === 0) return ok(res, { parentId, orderedIds });

  const placeholders = orderedIds.map(() => "?").join(",");
  const found = await db.all(
    `SELECT id, parent_id as parentId FROM menu WHERE id IN (${placeholders})`,
    ...orderedIds
  );
  if (found.length !== orderedIds.length) return fail(res, 400, "Some menu ids not found");

  const sameParent = found.every((m) =>
    parentId == null ? m.parentId == null : m.parentId === parentId
  );
  if (!sameParent) {
    return fail(res, 400, "All orderedIds must already have the given parentId");
  }

  try {
    const result = await withTransaction(db, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.run(
          `UPDATE menu
           SET sort = ?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
           WHERE id = ?`,
          i * 10,
          orderedIds[i]
        );
      }
      return { parentId, orderedIds };
    });
    ok(res, result);
  } catch (e) {
    fail(res, 400, e?.message || "Failed to reorder menus");
  }
});

router.post("/", parseBody(menuCreateSchema), async (req, res) => {
  const db = await getDb();
  const b = req.validatedBody;
  try {
    const createdId = await withTransaction(db, async () => {
      const result = await db.run(
        `INSERT INTO menu (parent_id, name, code, path, icon, sort, enabled, updated_at)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
        b.name,
        b.code,
        b.path ?? null,
        b.icon ?? null,
        b.sort ?? 0,
        b.enabled ?? 1
      );
      const id = result.lastID;
      if (b.parentId != null) {
        if (b.parentId === id) throw new Error("parentId cannot be self");
        const parent = await db.get("SELECT id FROM menu WHERE id = ?", b.parentId);
        if (!parent) throw new Error("Parent menu not found");
        await db.run(
          `UPDATE menu
           SET parent_id = ?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
           WHERE id = ?`,
          b.parentId,
          id
        );
      }
      return id;
    });
    const created = await db.get(
      "SELECT id, parent_id as parentId, name, code, path, icon, sort, enabled, created_at as createdAt, updated_at as updatedAt FROM menu WHERE id = ?",
      createdId
    );
    ok(res, created);
  } catch (e) {
    fail(res, 400, e?.message || "Failed to create menu");
  }
});

async function wouldCreateCycle(db, id, parentId) {
  let cursor = parentId;
  const seen = new Set();
  while (cursor != null) {
    if (cursor === id) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    const row = await db.get("SELECT parent_id as parentId FROM menu WHERE id = ?", cursor);
    if (!row) return false;
    cursor = row.parentId;
  }
  return false;
}

router.put("/:id", parseBody(menuUpdateSchema), async (req, res) => {
  const id = zId.parse(req.params.id);
  const db = await getDb();
  const b = req.validatedBody;

  const current = await db.get("SELECT * FROM menu WHERE id = ?", id);
  if (!current) return fail(res, 404, "Menu not found");

  if (b.parentId !== undefined) {
    if (b.parentId === id) return fail(res, 400, "parentId cannot be self");
    if (b.parentId != null) {
      const parent = await db.get("SELECT id FROM menu WHERE id = ?", b.parentId);
      if (!parent) return fail(res, 400, "Parent menu not found");
      if (await wouldCreateCycle(db, id, b.parentId)) return fail(res, 400, "parentId would create cycle");
    }
  }

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
