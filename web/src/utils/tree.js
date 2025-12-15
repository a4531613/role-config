export function buildTree(rows, { idKey = "id", parentKey = "parentId" } = {}) {
  const byId = new Map(rows.map((r) => [r[idKey], { ...r, children: [] }]));
  const roots = [];
  for (const item of byId.values()) {
    const parentId = item[parentKey];
    if (parentId && byId.has(parentId)) byId.get(parentId).children.push(item);
    else roots.push(item);
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

