import { ref, watch } from "vue";

export function useTreeSearch({ treeRef, getAllKeys, filterNode }) {
  const keyword = ref("");

  watch(keyword, (v) => {
    treeRef.value?.filter?.(v);
  });

  function expandAll() {
    const keys = typeof getAllKeys === "function" ? getAllKeys() : [];
    treeRef.value?.setExpandedKeys?.(keys);
  }

  function collapseAll() {
    treeRef.value?.setExpandedKeys?.([]);
  }

  return { keyword, filterNode, expandAll, collapseAll };
}

