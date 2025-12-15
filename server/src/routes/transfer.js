import express from "express";
import multer from "multer";
import { z } from "zod";
import { getDb } from "../db.js";
import { ok, fail } from "../http.js";
import { withTransaction } from "../tx.js";
import { parseBody } from "../validate.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/export", async (req, res) => {
  const db = await getDb();

  const menus = await db.all(
    `SELECT m.id, m.parent_id as parentId, pm.code as parentCode,
            m.name, m.code, m.path, m.icon, m.sort, m.enabled
     FROM menu m
     LEFT JOIN menu pm ON pm.id = m.parent_id
     ORDER BY m.sort ASC, m.id ASC`
  );

  const permissions = await db.all(
    `SELECT p.id, p.parent_id as parentId, pp.code as parentCode,
            p.level, p.name, p.code, p.path, p.description, p.sort, p.enabled
     FROM permission p
     LEFT JOIN permission pp ON pp.id = p.parent_id
     ORDER BY p.sort ASC, p.id ASC`
  );

  const roles = await db.all(
    "SELECT id, name, code, owner, description, enabled FROM role ORDER BY id ASC"
  );

  const roleMenus = await db.all(
    `SELECT r.code as roleCode, m.code as menuCode
     FROM role_menu rm
     JOIN role r ON r.id = rm.role_id
     JOIN menu m ON m.id = rm.menu_id
     ORDER BY r.code ASC, m.code ASC`
  );

  const rolePermissions = await db.all(
    `SELECT r.code as roleCode, p.code as permissionCode
     FROM role_permission rp
     JOIN role r ON r.id = rp.role_id
     JOIN permission p ON p.id = rp.permission_id
     ORDER BY r.code ASC, p.code ASC`
  );

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    menus,
    permissions,
    roles,
    roleMenus,
    rolePermissions,
  };

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="role-config-export-${Date.now()}.json"`
  );
  res.send(JSON.stringify(payload, null, 2));
});

const importSchema = z.object({
  version: z.number().int().optional(),
  menus: z.array(
    z.object({
      code: z.string().min(1),
      parentCode: z.string().min(1).nullable().optional(),
      name: z.string().min(1),
      path: z.string().nullable().optional(),
      icon: z.string().nullable().optional(),
      sort: z.number().int().optional(),
      enabled: z.number().int().optional(),
    })
  ).optional(),
  permissions: z.array(
    z.object({
      code: z.string().min(1),
      parentCode: z.string().min(1).nullable().optional(),
      level: z.enum(["class","method"]),
      name: z.string().min(1),
      path: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      sort: z.number().int().optional(),
      enabled: z.number().int().optional(),
    })
  ).optional(),
  roles: z.array(
    z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      owner: z.string().min(1).nullable().optional(),
      description: z.string().nullable().optional(),
      enabled: z.number().int().optional(),
    })
  ).optional(),
  roleMenus: z.array(
    z.object({
      roleCode: z.string().min(1),
      menuCode: z.string().min(1),
    })
  ).optional(),
  rolePermissions: z.array(
    z.object({
      roleCode: z.string().min(1),
      permissionCode: z.string().min(1),
    })
  ).optional(),
});

async function parseImportPayload(req) {
  if (req.body && Object.keys(req.body).length) return req.body;
  if (!req.file) return null;
  const text = req.file.buffer.toString("utf-8");
  return JSON.parse(text);
}

router.post(
  "/import",
  upload.single("file"),
  async (req, res) => {
    let payload;
    try {
      payload = await parseImportPayload(req);
    } catch (e) {
      return fail(res, 400, "Invalid JSON file", e?.message);
    }
    if (!payload) return fail(res, 400, "Missing import payload");

    const parsed = importSchema.safeParse(payload);
    if (!parsed.success) return fail(res, 400, "Invalid import payload", parsed.error.flatten());

    const db = await getDb();
    const p = parsed.data;

    try {
      await withTransaction(db, async () => {
        if (p.menus?.length) {
          for (const m of p.menus) {
            await db.run(
              `INSERT INTO menu (parent_id, name, code, path, icon, sort, enabled, updated_at)
               VALUES (NULL, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
               ON CONFLICT(code) DO UPDATE SET
                 name=excluded.name, path=excluded.path, icon=excluded.icon,
                 sort=excluded.sort, enabled=excluded.enabled,
                 updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
              m.name,
              m.code,
              m.path ?? null,
              m.icon ?? null,
              m.sort ?? 0,
              m.enabled ?? 1
            );
          }
          const menuMap = new Map(
            (await db.all("SELECT id, code FROM menu")).map((r) => [r.code, r.id])
          );
          for (const m of p.menus) {
            const parentId = m.parentCode ? menuMap.get(m.parentCode) ?? null : null;
            await db.run(
              `UPDATE menu SET parent_id = ?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE code = ?`,
              parentId,
              m.code
            );
          }
        }

        if (p.permissions?.length) {
          for (const perm of p.permissions) {
            await db.run(
              `INSERT INTO permission (parent_id, level, name, code, path, description, sort, enabled, updated_at)
               VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
               ON CONFLICT(code) DO UPDATE SET
                 level=excluded.level, name=excluded.name, path=excluded.path, description=excluded.description,
                 sort=excluded.sort, enabled=excluded.enabled,
                 updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
              perm.level,
              perm.name,
              perm.code,
              perm.path ?? null,
              perm.description ?? null,
              perm.sort ?? 0,
              perm.enabled ?? 1
            );
          }
          const permMap = new Map(
            (await db.all("SELECT id, code FROM permission")).map((r) => [r.code, r.id])
          );
          for (const perm of p.permissions) {
            const parentId = perm.parentCode ? permMap.get(perm.parentCode) ?? null : null;
            await db.run(
              `UPDATE permission SET parent_id = ?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE code = ?`,
              parentId,
              perm.code
            );
          }
        }

      if (p.roles?.length) {
        for (const r of p.roles) {
          await db.run(
            `INSERT INTO role (name, code, owner, description, enabled, updated_at)
             VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
             ON CONFLICT(code) DO UPDATE SET
               name=excluded.name, owner=excluded.owner, description=excluded.description, enabled=excluded.enabled,
               updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
            r.name,
            r.code,
            r.owner ?? null,
            r.description ?? null,
            r.enabled ?? 1
          );
        }
      }

        const roleMap = new Map(
          (await db.all("SELECT id, code FROM role")).map((r) => [r.code, r.id])
        );
        const menuMap2 = new Map(
          (await db.all("SELECT id, code FROM menu")).map((r) => [r.code, r.id])
        );
        const permMap2 = new Map(
          (await db.all("SELECT id, code FROM permission")).map((r) => [r.code, r.id])
        );

        if (p.roleMenus?.length) {
          const roleCodes = [...new Set(p.roleMenus.map((x) => x.roleCode))];
          for (const roleCode of roleCodes) {
            const roleId = roleMap.get(roleCode);
            if (!roleId) continue;
            await db.run("DELETE FROM role_menu WHERE role_id = ?", roleId);
          }
          for (const rm of p.roleMenus) {
            const roleId = roleMap.get(rm.roleCode);
            const menuId = menuMap2.get(rm.menuCode);
            if (!roleId || !menuId) continue;
            await db.run("INSERT INTO role_menu (role_id, menu_id) VALUES (?, ?)", roleId, menuId);
          }
        }

        if (p.rolePermissions?.length) {
          const roleCodes = [...new Set(p.rolePermissions.map((x) => x.roleCode))];
          for (const roleCode of roleCodes) {
            const roleId = roleMap.get(roleCode);
            if (!roleId) continue;
            await db.run("DELETE FROM role_permission WHERE role_id = ?", roleId);
          }
          for (const rp of p.rolePermissions) {
            const roleId = roleMap.get(rp.roleCode);
            const permissionId = permMap2.get(rp.permissionCode);
            if (!roleId || !permissionId) continue;
            await db.run(
              "INSERT INTO role_permission (role_id, permission_id) VALUES (?, ?)",
              roleId,
              permissionId
            );
          }
        }
      });
      ok(res, { imported: true });
    } catch (e) {
      fail(res, 400, e?.message || "Import failed");
    }
  }
);

export default router;
