<script>
  import { toasts, removeToast } from '../lib/toast.js';
</script>

<div class="toast-stack" aria-live="polite">
  {#each $toasts as toast (toast.id)}
    <div class="toast toast-{toast.type}">
      {#if toast.type === 'success'}
        <span class="toast-icon">✓</span>
      {:else}
        <span class="toast-icon">ℹ</span>
      {/if}
      <span class="toast-msg">{toast.message}</span>
      <button
        type="button"
        class="toast-dismiss"
        onclick={() => removeToast(toast.id)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  {/each}
</div>
