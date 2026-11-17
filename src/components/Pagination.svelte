<script>
  let { page, pageSize, total, onpage } = $props();

  const pageCount = $derived(Math.max(1, Math.ceil(total / pageSize)));

  const numbers = $derived.by(() => {
    const start = Math.max(1, Math.min(page - 2, pageCount - 4));
    const end = Math.min(pageCount, start + 4);
    const list = [];
    for (let i = start; i <= end; i += 1) list.push(i);
    return list;
  });
</script>

{#if pageCount > 1}
  <nav class="pagination" aria-label="Pagination">
    <button class="page-btn" type="button" disabled={page <= 1} onclick={() => onpage(page - 1)}>
      ← Prev
    </button>

    {#if numbers[0] > 1}
      <button class="page-btn" type="button" onclick={() => onpage(1)}>1</button>
      {#if numbers[0] > 2}<span class="page-gap">…</span>{/if}
    {/if}

    {#each numbers as number (number)}
      <button
        class="page-btn"
        type="button"
        aria-current={number === page ? 'page' : undefined}
        onclick={() => onpage(number)}
      >
        {number}
      </button>
    {/each}

    {#if numbers[numbers.length - 1] < pageCount}
      {#if numbers[numbers.length - 1] < pageCount - 1}<span class="page-gap">…</span>{/if}
      <button class="page-btn" type="button" onclick={() => onpage(pageCount)}>{pageCount}</button>
    {/if}

    <button
      class="page-btn"
      type="button"
      disabled={page >= pageCount}
      onclick={() => onpage(page + 1)}
    >
      Next →
    </button>
  </nav>
{/if}
