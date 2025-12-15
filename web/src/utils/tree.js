export function buildTree(rows, { idKey = "id", parentKey = "parentId" } = {}) {
  const byId = new Map(rows.map((r) => [r[idKey], { ...r, children: [] }]));
  const roots = [];
  const createsCycle = (childId, parentId) => {
    let cursor = parentId;
    const seen = new Set();
    while (cursor != null && byId.has(cursor)) {
      if (cursor === childId) return true;
      if (seen.has(cursor)) return true;
      seen.add(cursor);
      cursor = byId.get(cursor)[parentKey];
    }
    return false;
  };
  for (const item of byId.values()) {
    const parentId = item[parentKey];
    if (
      parentId &&
      parentId !== item[idKey] &&
      byId.has(parentId) &&
      !createsCycle(item[idKey], parentId)
    ) {
      byId.get(parentId).children.push(item);
    } else {
      roots.push(item);
    }
  }
  const sortRec = (nodes) => {
    nodes.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id);
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}

export function collectIds(tree, idKey = "id") {
  const out = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      out.push(n[idKey]);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(tree);
  return out;
}
