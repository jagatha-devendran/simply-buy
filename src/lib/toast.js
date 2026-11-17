import { writable } from 'svelte/store';

export const toasts = writable([]);

let nextId = 1;

export function showToast(message, { type = 'info', duration = 3000, action = null } = {}) {
  const id = nextId++;
  const toast = { id, message, type, action };

  toasts.update((current) => [...current, toast]);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

export function removeToast(id) {
  toasts.update((current) => current.filter((item) => item.id !== id));
}
