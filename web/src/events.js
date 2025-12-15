export const DATA_CHANGED_EVENT = "role-config:dataChanged";

export function emitDataChanged() {
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

