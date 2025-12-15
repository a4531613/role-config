import express from "express";
import { z } from "zod";
import { getDb } from "../db.js";
import { ok, fail } from "../http.js";
import { withTransaction } from "../tx.js";
import { parseBody, zId } from "../validate.js";

const router = express.Router();

const roleCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().nullable().optional(),
  enabled: z.coerce.number().int().optional().default(1),
});

const roleUpdateSchema = roleCreateSchema.partial();

router.get("/", async (req, res) => {
  const db = await getDb();
  const rows = await db.all(
    "SELECT id, name, code, description, enabled, created_at as createdAt, updated_at as updatedAt FROM role ORDER BY id DESC"
  );
  ok(res, rows);
});

router.post("/", parseBody(roleCreateSchema), async (req, res) => {
  const db = await getDb();
  const b = req.validatedBody;
  try {
    const result = await db.run(
      `INSERT INTO role (name, code, description, enabled, updated_at)
       VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
      b.name,
      b.code,
      b.description ?? null,
      b.enabled ?? 1
    );
    const created = await db.get(
      "SELECT id, name, code, description, enabled, created_at as createdAt, updated_at as updatedAt FROM role WHERE id = ?",
      result.lastID
    );
    ok(res, created);
  } catch (e) {
    fail(res, 400, e?.message || "Failed to create role");
  }
});

router.put("/:id", parseBody(roleUpdateSchema), async (req, res) => {
  const id = zId.parse(req.params.id);
  const db = await getDb();
  const b = req.validatedBody;

  const current = await db.get("SELECT * FROM role WHERE id = ?", id);
  if (!current) return fail(res, 404, "Role not found");

  const next = {
    name: b.name ?? current.name,
    code: b.code ?? current.code,
    description: b.description === undefined ? current.description : b.description,
    enabled: b.enabled ?? current.enabled,
  };

  try {
    await db.run(
      `UPDATE role
       SET name = ?, code = ?, description = ?, enabled = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ?`,
      next.name,
      next.code,
      next.description ?? null,
      next.enabled,
      id
    );
    const updated = await db.get(
      "SELECT id, name, code, description, enabled, created_at as createdAt, updated_at as updatedAt FROM role WHERE id = ?",
      id
    );
    ok(res, updated);
  } catch (e) {
    fail(res, 400, e?.message || "Failed to update role");
  }
});

router.delete("/:id", async (req, res) => {
  const id = zId.parse(req.params.id);
  const db = await getDb();
  const current = await db.get("SELECT id FROM role WHERE id = ?", id);
  if (!current) return fail(res, 404, "Role not found");
  await db.run("DELETE FROM role WHERE id = ?", id);
  ok(res, { id });
});

router.get("/:id/menus", async (req, res) => {
  const roleId = zId.parse(req.params.id);
  const db = await getDb();
  const rows = await db.all("SELECT menu_id as menuId FROM role_menu WHERE role_id = ?", roleId);
  ok(res, rows.map((r) => r.menuId));
});

router.put("/:id/menus", parseBody(z.object({ menuIds: z.array(z.coerce.number().int().positive()) })), async (req, res) => {
  const roleId = zId.parse(req.params.id);
  const db = await getDb();
  const { menuIds } = req.validatedBody;

  try {
    const result = await withTransaction(db, async () => {
      await db.run("DELETE FROM role_menu WHERE role_id = ?", roleId);
      for (const menuId of menuIds) {
        await db.run("INSERT INTO role_menu (role_id, menu_id) VALUES (?, ?)", roleId, menuId);
      }
      return { roleId, menuIds };
    });
    ok(res, result);
  } catch (e) {
    fail(res, 400, e?.message || "Failed to update role menus");
  }
});

router.get("/:id/permissions", async (req, res) => {
  const roleId = zId.parse(req.params.id);
  const db = await getDb();
  const rows = await db.all(
    "SELECT permission_id as permissionId FROM role_permission WHERE role_id = ?",
    roleId
  );
  ok(res, rows.map((r) => r.permissionId));
});

router.put(
  "/:id/permissions",
  parseBody(z.object({ permissionIds: z.array(z.coerce.number().int().positive()) })),
  async (req, res) => {
    const roleId = zId.parse(req.params.id);
    const db = await getDb();
    const { permissionIds } = req.validatedBody;

    try {
      const result = await withTransaction(db, async () => {
        await db.run("DELETE FROM role_permission WHERE role_id = ?", roleId);
        for (const permissionId of permissionIds) {
          await db.run(
            "INSERT INTO role_permission (role_id, permission_id) VALUES (?, ?)",
            roleId,
            permissionId
          );
        }
        return { roleId, permissionIds };
      });
      ok(res, result);
    } catch (e) {
      fail(res, 400, e?.message || "Failed to update role permissions");
    }
  }
);

router.post(
  "/bulk/menus",
  parseBody(
    z.object({
      roleIds: z.array(z.coerce.number().int().positive()).min(1),
      menuIds: z.array(z.coerce.number().int().positive()).min(1),
      action: z.enum(["bind", "unbind"]),
    })
  ),
  async (req, res) => {
    const db = await getDb();
    const { roleIds, menuIds, action } = req.validatedBody;

    try {
      const result = await withTransaction(db, async () => {
        if (action === "bind") {
          let inserted = 0;
          for (const roleId of roleIds) {
            for (const menuId of menuIds) {
              const r = await db.run(
                "INSERT OR IGNORE INTO role_menu (role_id, menu_id) VALUES (?, ?)",
                roleId,
                menuId
              );
              inserted += r.changes || 0;
            }
          }
          return { action, roleIds, menuIds, inserted, deleted: 0 };
        }

        const rolePlaceholders = roleIds.map(() => "?").join(",");
        const menuPlaceholders = menuIds.map(() => "?").join(",");
        const r = await db.run(
          `DELETE FROM role_menu
           WHERE role_id IN (${rolePlaceholders}) AND menu_id IN (${menuPlaceholders})`,
          ...roleIds,
          ...menuIds
        );
        return { action, roleIds, menuIds, inserted: 0, deleted: r.changes || 0 };
      });

      ok(res, result);
    } catch (e) {
      fail(res, 400, e?.message || "Failed to bulk update role menus");
    }
  }
);

router.post(
  "/bulk/permissions",
  parseBody(
    z.object({
      roleIds: z.array(z.coerce.number().int().positive()).min(1),
      permissionIds: z.array(z.coerce.number().int().positive()).min(1),
      action: z.enum(["bind", "unbind"]),
    })
  ),
  async (req, res) => {
    const db = await getDb();
    const { roleIds, permissionIds, action } = req.validatedBody;

    try {
      const result = await withTransaction(db, async () => {
        if (action === "bind") {
          let inserted = 0;
          for (const roleId of roleIds) {
            for (const permissionId of permissionIds) {
              const r = await db.run(
                "INSERT OR IGNORE INTO role_permission (role_id, permission_id) VALUES (?, ?)",
                roleId,
                permissionId
              );
              inserted += r.changes || 0;
            }
          }
          return { action, roleIds, permissionIds, inserted, deleted: 0 };
        }

        const rolePlaceholders = roleIds.map(() => "?").join(",");
        const permPlaceholders = permissionIds.map(() => "?").join(",");
        const r = await db.run(
          `DELETE FROM role_permission
           WHERE role_id IN (${rolePlaceholders}) AND permission_id IN (${permPlaceholders})`,
          ...roleIds,
          ...permissionIds
        );
        return { action, roleIds, permissionIds, inserted: 0, deleted: r.changes || 0 };
      });

      ok(res, result);
    } catch (e) {
      fail(res, 400, e?.message || "Failed to bulk update role permissions");
    }
  }
);

export default router;
