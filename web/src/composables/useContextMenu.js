import { onBeforeUnmount, onMounted, ref } from "vue";

export function useContextMenu() {
  const open = ref(false);
  const x = ref(0);
  const y = ref(0);
  const items = ref([]);

  function close() {
    open.value = false;
  }

  function show(event, nextItems) {
    event?.preventDefault?.();
    const list = Array.isArray(nextItems) ? nextItems : [];
    if (list.length === 0) return;
    x.value = event?.clientX ?? 0;
    y.value = event?.clientY ?? 0;
    items.value = list;
    open.value = true;
  }

  function onKeyDown(e) {
    if (e.key === "Escape") close();
  }

  function onWindowChange() {
    close();
  }

  onMounted(() => window.addEventListener("keydown", onKeyDown));
  onMounted(() => window.addEventListener("resize", onWindowChange));
  onMounted(() => window.addEventListener("scroll", onWindowChange, true));
  onMounted(() => window.addEventListener("blur", onWindowChange));
  onBeforeUnmount(() => window.removeEventListener("keydown", onKeyDown));
  onBeforeUnmount(() => window.removeEventListener("resize", onWindowChange));
  onBeforeUnmount(() => window.removeEventListener("scroll", onWindowChange, true));
  onBeforeUnmount(() => window.removeEventListener("blur", onWindowChange));

  return { open, x, y, items, show, close };
}
