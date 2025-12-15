<template>
  <teleport to="body">
    <div
      v-if="open"
      class="ctx-mask"
      @mousedown="onMaskDown"
      @click="onMaskDown"
      @wheel.passive="onMaskDown"
      @contextmenu.prevent="onMaskDown"
    >
      <div
        ref="menuRef"
        class="ctx-menu"
        role="menu"
        :style="{ left: `${posX}px`, top: `${posY}px` }"
        @mousedown.stop
        @click.stop
        @contextmenu.prevent
      >
        <button
          v-for="item in items"
          :key="item.key || item.label"
          class="ctx-item"
          :class="{ 'is-danger': item.danger }"
          :disabled="item.disabled"
          type="button"
          @click="() => onItemClick(item)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  open: { type: Boolean, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  items: { type: Array, required: true },
});

const emit = defineEmits(["close"]);

const menuRef = ref(null);
const posX = ref(0);
const posY = ref(0);
let cleanup = null;

function onMaskDown() {
  emit("close");
}

function onItemClick(item) {
  if (item.disabled) return;
  try {
    item.onClick?.();
  } finally {
    emit("close");
  }
}

async function adjustPosition() {
  posX.value = props.x;
  posY.value = props.y;
  await nextTick();
  const el = menuRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const pad = 8;
  const maxX = Math.max(pad, window.innerWidth - rect.width - pad);
  const maxY = Math.max(pad, window.innerHeight - rect.height - pad);
  posX.value = Math.min(Math.max(props.x, pad), maxX);
  posY.value = Math.min(Math.max(props.y, pad), maxY);
}

watch(
  () => [props.open, props.x, props.y, props.items?.length],
  async () => {
    if (!props.open) {
      cleanup?.();
      cleanup = null;
      return;
    }
    cleanup?.();
    const onPointerDownCapture = (e) => {
      const el = menuRef.value;
      if (!el) return emit("close");
      if (!el.contains(e.target)) emit("close");
    };
    const onContextMenuCapture = (e) => {
      const el = menuRef.value;
      if (!el) return emit("close");
      if (!el.contains(e.target)) emit("close");
    };
    window.addEventListener("pointerdown", onPointerDownCapture, true);
    window.addEventListener("contextmenu", onContextMenuCapture, true);
    cleanup = () => {
      window.removeEventListener("pointerdown", onPointerDownCapture, true);
      window.removeEventListener("contextmenu", onContextMenuCapture, true);
    };
    await adjustPosition();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  cleanup?.();
  cleanup = null;
});
</script>

<style scoped>
.ctx-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: transparent;
}

.ctx-menu {
  position: fixed;
  min-width: 160px;
  padding: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}

.ctx-item {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  color: var(--color-text);
}

.ctx-item:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
}

.ctx-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ctx-item.is-danger {
  color: #d92d20;
}
</style>
