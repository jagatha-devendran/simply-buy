<script>
  import { untrack } from 'svelte';
  import { getAutosuggest } from '../lib/api.js';
  import { navigate } from '../lib/router.js';
  import { count } from '../lib/format.js';

  let { initialValue = '' } = $props();

  // The prop seeds the box once; typing is owned by this component afterwards.
  let term = $state(untrack(() => initialValue));
  let suggestions = $state([]);
  let open = $state(false);
  let active = $state(-1);

  let timer;
  let sequence = 0;
  let lastInitial = untrack(() => initialValue);

  // Keep the box in step when the URL changes (search from the listing page).
  $effect(() => {
    if (initialValue === lastInitial) return;
    lastInitial = initialValue;
    term = initialValue;
  });

  function onInput(event) {
    term = event.currentTarget.value;
    active = -1;
    clearTimeout(timer);

    const value = term.trim();
    if (!value) {
      suggestions = [];
      open = false;
      return;
    }

    timer = setTimeout(async () => {
      const mine = ++sequence;
      try {
        const list = await getAutosuggest(value);
        if (mine !== sequence) return;
        suggestions = list;
        open = list.length > 0;
      } catch {
        if (mine !== sequence) return;
        suggestions = [];
        open = false;
      }
    }, 180);
  }

  function submitTerm(value) {
    const trimmed = value.trim();
    if (!trimmed) return;
    open = false;
    navigate(`/products?q=${encodeURIComponent(trimmed)}`);
  }

  function pick(suggestion) {
    open = false;
    submitTerm(suggestion.text);
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      open = false;
      return;
    }
    if (!open) {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitTerm(term);
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = (active + 1) % suggestions.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = (active - 1 + suggestions.length) % suggestions.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (active >= 0) pick(suggestions[active]);
      else submitTerm(term);
    }
  }

  function onFocusOut(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    open = false;
  }
</script>

<div class="search" onfocusout={onFocusOut}>
  <form
    class="search-field"
    onsubmit={(event) => {
      event.preventDefault();
      submitTerm(term);
    }}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
    <input
      type="search"
      placeholder="Search for tshirts, watches, shoes"
      aria-label="Search products"
      autocomplete="off"
      value={term}
      oninput={onInput}
      onkeydown={onKeyDown}
      onfocus={() => {
        if (suggestions.length > 0) open = true;
      }}
    />
  </form>

  {#if open}
    <ul class="suggestions">
      {#each suggestions as suggestion, index (suggestion.text)}
        <li>
          <button
            type="button"
            class="suggestion"
            data-active={index === active}
            onclick={() => pick(suggestion)}
            onmouseenter={() => (active = index)}
          >
            <span>{suggestion.text}</span>
            <span class="suggestion-type">{count(suggestion.count)} products</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
