import { onBeforeUnmount, onMounted } from "vue";
import { DATA_CHANGED_EVENT } from "../events.js";

export function useDataChanged(handler) {
  onMounted(() => {
    window.addEventListener(DATA_CHANGED_EVENT, handler);
  });
  onBeforeUnmount(() => {
    window.removeEventListener(DATA_CHANGED_EVENT, handler);
  });
}

