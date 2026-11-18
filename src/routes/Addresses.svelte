<script>
  import { onMount } from 'svelte';
  import {
    addresses,
    fetchUserAddresses,
    saveNewAddress,
    updateExistingAddress,
    deleteUserAddress,
    setDefaultAddress
  } from '../lib/addresses.js';
  import { user } from '../lib/session.js';
  import { showToast } from '../lib/toast.js';

  let showFormModal = $state(false);
  let editingId = $state(null);

  // Form fields
  let formName = $state('');
  let formMobile = $state('');
  let formHouseNo = $state('');
  let formStreet = $state('');
  let formLocality = $state('');
  let formCity = $state('');
  let formState = $state('');
  let formPincode = $state('');
  let formType = $state('HOME'); // 'HOME' | 'OFFICE'
  let formDefault = $state(false);

  let mobileError = $state('');
  let submitting = $state(false);
  let deleteConfirmId = $state(null);

  onMount(() => {
    fetchUserAddresses();
  });

  function resetForm() {
    formName = $user?.username || 'Jagatha D';
    formMobile = $user?.phone || '9876543210';
    formHouseNo = '';
    formStreet = '';
    formLocality = '';
    formCity = 'Bengaluru';
    formState = 'Karnataka';
    formPincode = '560038';
    formType = 'HOME';
    formDefault = false;
    mobileError = '';
    editingId = null;
  }

  function openCreateModal() {
    resetForm();
    if ($addresses.length === 0) formDefault = true;
    showFormModal = true;
  }

  function openEditModal(addr) {
    editingId = addr.id;
    formName = addr.name || addr.recipientName || '';
    formMobile = addr.mobile || addr.phone || '';
    formHouseNo = addr.houseNumber || '';
    formStreet = addr.streetAddress || '';
    formLocality = addr.locality || '';
    formCity = addr.city || '';
    formState = addr.state || '';
    formPincode = addr.pincode || '';
    formType = addr.addressType || 'HOME';
    formDefault = !!addr.isDefault;
    mobileError = '';
    showFormModal = true;
  }

  function handleMobileInput(e) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    formMobile = raw;
    if (raw.length === 10 && /^[6-9]/.test(raw)) {
      mobileError = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(formMobile)) {
      mobileError = 'Enter a valid 10-digit mobile number starting with 6-9';
      return;
    }

    submitting = true;
    const payload = {
      name: formName.trim(),
      mobile: formMobile.trim(),
      email: $user?.email || 'user@simplybuy.com',
      houseNumber: formHouseNo.trim(),
      streetAddress: formStreet.trim(),
      locality: formLocality.trim(),
      city: formCity.trim(),
      state: formState.trim(),
      pincode: formPincode.trim(),
      addressType: formType,
      isDefault: formDefault
    };

    try {
      if (editingId) {
        await updateExistingAddress(editingId, payload);
        showToast('Address updated successfully.');
      } else {
        await saveNewAddress(payload);
        showToast('New delivery address added.');
      }
      showFormModal = false;
      resetForm();
    } catch (err) {
      showToast('Could not save address: ' + (err.message || 'Error occurred'));
    } finally {
      submitting = false;
    }
  }

  async function handleDelete(id) {
    try {
      await deleteUserAddress(id);
      showToast('Address removed.');
      deleteConfirmId = null;
    } catch (err) {
      showToast('Failed to delete address.');
    }
  }

  function handleSetDefault(id) {
    setDefaultAddress(id);
    showToast('Default delivery address updated.');
  }
</script>

<div class="shell addresses-page">
  <div class="page-header">
    <div class="header-titles">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span class="sep">/</span>
        <span class="curr">Saved Addresses</span>
      </nav>
      <h1>Saved Delivery Addresses</h1>
      <p class="muted">Manage and select shipping addresses for quick, one-click checkout.</p>
    </div>

    <button type="button" class="btn primary add-btn" onclick={openCreateModal}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add New Address
    </button>
  </div>

  {#if $addresses.length === 0}
    <div class="empty-address-card">
      <div class="empty-icon-wrap">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
      <h2>No delivery address saved</h2>
      <p class="muted">Add a shipping address to ensure smooth deliveries for your orders.</p>
      <button type="button" class="btn primary" onclick={openCreateModal}>
        Add Your First Address
      </button>
    </div>
  {:else}
    <div class="address-grid">
      {#each $addresses as addr (addr.id)}
        <div class="address-card" class:default-card={addr.isDefault}>
          <div class="card-top-strip">
            <div class="type-pill-wrap">
              <span class="type-pill">
                {#if addr.addressType === 'OFFICE' || addr.addressType === 'WORK'}
                  🏢 WORK
                {:else}
                  🏠 HOME
                {/if}
              </span>
              {#if addr.isDefault}
                <span class="default-badge">DEFAULT</span>
              {/if}
            </div>

            <div class="card-menu-btns">
              <button
                type="button"
                class="icon-action-btn"
                title="Edit Address"
                onclick={() => openEditModal(addr)}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>

              {#if deleteConfirmId === addr.id}
                <div class="delete-confirm-popup">
                  <span>Delete?</span>
                  <button type="button" class="del-yes" onclick={() => handleDelete(addr.id)}>Yes</button>
                  <button type="button" class="del-no" onclick={() => (deleteConfirmId = null)}>No</button>
                </div>
              {:else}
                <button
                  type="button"
                  class="icon-action-btn del"
                  title="Delete Address"
                  onclick={() => (deleteConfirmId = addr.id)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              {/if}
            </div>
          </div>

          <div class="card-details">
            <h3 class="recipient-name">{addr.name || addr.recipientName}</h3>
            <p class="address-line">
              {#if addr.houseNumber}{addr.houseNumber}, {/if}
              {addr.streetAddress || ''}
              {#if addr.locality}, {addr.locality}{/if}
            </p>
            <p class="city-line">
              {addr.city}, {addr.state} - <strong>{addr.pincode}</strong>
            </p>
            <p class="mobile-line">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Mobile: <strong>+91 {addr.mobile || addr.phone}</strong>
            </p>
          </div>

          <div class="card-bottom-actions">
            {#if !addr.isDefault}
              <button
                type="button"
                class="make-default-btn"
                onclick={() => handleSetDefault(addr.id)}
              >
                Set as Default
              </button>
            {:else}
              <span class="active-default-text">✓ Primary shipping destination</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Add / Edit Address Modal -->
{#if showFormModal}
  <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Address Form" tabindex="-1">
    <div class="modal-card address-modal">
      <div class="modal-head">
        <div class="modal-title-wrap">
          <span class="logo-mark small">SB</span>
          <h2>{editingId ? 'Edit Address' : 'Add New Delivery Address'}</h2>
        </div>
        <button type="button" class="close-btn" onclick={() => (showFormModal = false)} aria-label="Close">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <form class="address-form" onsubmit={handleSubmit}>
        <div class="form-grid">
          <label class="field">
            <span>Recipient Full Name *</span>
            <input type="text" required bind:value={formName} placeholder="e.g. Jagatha Devendran" />
          </label>

          <div class="field phone-field">
            <label for="form-mobile-input">
              <span>Mobile Number *</span>
            </label>
            <div class="phone-input-wrap" class:has-error={mobileError}>
              <span class="country-prefix">+91</span>
              <input
                id="form-mobile-input"
                type="tel"
                required
                maxlength="10"
                placeholder="9876543210"
                value={formMobile}
                oninput={handleMobileInput}
              />
            </div>
            {#if mobileError}
              <span class="field-error-msg">{mobileError}</span>
            {/if}
          </div>

          <label class="field">
            <span>House / Flat No.</span>
            <input type="text" bind:value={formHouseNo} placeholder="e.g. 402, High Street" />
          </label>

          <label class="field">
            <span>Locality / Area</span>
            <input type="text" bind:value={formLocality} placeholder="e.g. Indiranagar" />
          </label>

          <label class="field full">
            <span>Street Address *</span>
            <input type="text" required bind:value={formStreet} placeholder="Street name, landmark, near..." />
          </label>

          <label class="field">
            <span>City *</span>
            <input type="text" required bind:value={formCity} placeholder="e.g. Bengaluru" />
          </label>

          <label class="field">
            <span>State *</span>
            <input type="text" required bind:value={formState} placeholder="e.g. Karnataka" />
          </label>

          <label class="field">
            <span>Pincode *</span>
            <input
              type="text"
              required
              maxlength="6"
              pattern="[0-9]{6}"
              bind:value={formPincode}
              placeholder="e.g. 560038"
              oninput={(e) => {
                formPincode = e.target.value.replace(/\D/g, '').slice(0, 6);
              }}
            />
          </label>

          <div class="field">
            <span class="field-label-text">Address Type</span>
            <div class="type-radio-group">
              <label class="radio-chip" class:selected={formType === 'HOME'}>
                <input type="radio" name="addrType" value="HOME" bind:group={formType} />
                <span>🏠 Home</span>
              </label>
              <label class="radio-chip" class:selected={formType === 'OFFICE'}>
                <input type="radio" name="addrType" value="OFFICE" bind:group={formType} />
                <span>🏢 Work / Office</span>
              </label>
            </div>
          </div>
        </div>

        <label class="default-checkbox-wrap">
          <input type="checkbox" bind:checked={formDefault} />
          <span>Make this my default delivery address</span>
        </label>

        <div class="modal-actions">
          <button type="button" class="btn" onclick={() => (showFormModal = false)}>Cancel</button>
          <button type="submit" class="btn primary" disabled={submitting}>
            {submitting ? 'Saving…' : editingId ? 'Update Address' : 'Save Address'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .addresses-page {
    padding: 32px 0 60px;
    max-width: 1040px;
    margin: 0 auto;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--muted);
    margin-bottom: 8px;
  }

  .breadcrumb a {
    color: var(--muted);
    text-decoration: none;
  }

  .breadcrumb a:hover {
    color: var(--accent);
  }

  .breadcrumb .curr {
    color: var(--ink);
    font-weight: 600;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 32px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .header-titles h1 {
    font-size: 1.85rem;
    color: var(--ink);
    margin: 0 0 4px;
    letter-spacing: -0.02em;
  }

  .add-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .empty-address-card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 60px 24px;
    text-align: center;
  }

  .empty-icon-wrap {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #f0fdf4;
    color: #16a34a;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
  }

  .empty-address-card h2 {
    margin: 0 0 8px;
    font-size: 1.4rem;
  }

  .empty-address-card .muted {
    margin-bottom: 24px;
  }

  .address-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  .address-card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    padding: 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .address-card:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  }

  .address-card.default-card {
    border-color: #881337;
    background: #fffdfd;
  }

  .card-top-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .type-pill-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .type-pill {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 2px 8px;
    background: #f4f2ee;
    border-radius: 4px;
    color: var(--ink);
  }

  .default-badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 8px;
    background: #fdf2f2;
    color: #991b1b;
    border-radius: 4px;
    border: 1px solid #fecaca;
  }

  .card-menu-btns {
    display: flex;
    align-items: center;
    gap: 6px;
    position: relative;
  }

  .icon-action-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .icon-action-btn:hover {
    background: #f4f2ee;
    color: var(--ink);
  }

  .icon-action-btn.del:hover {
    background: #fef2f2;
    color: #dc2626;
  }

  .delete-confirm-popup {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #fff;
    border: 1px solid #fecaca;
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 0.75rem;
    color: #b91c1c;
  }

  .del-yes {
    background: #dc2626;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 1px 6px;
    cursor: pointer;
    font-weight: 600;
  }

  .del-no {
    background: #f1f5f9;
    color: #475569;
    border: none;
    border-radius: 4px;
    padding: 1px 6px;
    cursor: pointer;
  }

  .recipient-name {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--ink);
    margin: 0 0 6px;
  }

  .address-line {
    font-size: 0.9rem;
    color: #444;
    line-height: 1.45;
    margin: 0 0 4px;
  }

  .city-line {
    font-size: 0.88rem;
    color: var(--muted);
    margin: 0 0 10px;
  }

  .city-line strong {
    color: var(--ink);
  }

  .mobile-line {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.84rem;
    color: var(--muted);
    margin: 0;
  }

  .mobile-line strong {
    color: var(--ink);
  }

  .card-bottom-actions {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px dashed var(--line);
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .make-default-btn {
    border: none;
    background: transparent;
    color: var(--accent);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }

  .make-default-btn:hover {
    text-decoration: underline;
  }

  .active-default-text {
    font-size: 0.78rem;
    font-weight: 600;
    color: #15803d;
  }

  /* Form Modal */
  .address-modal {
    max-width: 600px;
    width: 95%;
  }

  .address-form {
    padding: 24px;
  }

  .field-label-text {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
    margin-bottom: 6px;
  }

  .type-radio-group {
    display: flex;
    gap: 12px;
  }

  .radio-chip {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 9px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: #fff;
    cursor: pointer;
    font-size: 0.88rem;
    font-weight: 500;
    transition: all 0.15s ease;
  }

  .radio-chip input {
    display: none;
  }

  .radio-chip.selected {
    border-color: var(--burgundy);
    background: #fdf8f8;
    color: var(--burgundy);
    font-weight: 700;
  }

  .phone-input-wrap {
    display: flex;
    align-items: center;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: #fff;
    overflow: hidden;
  }

  .phone-input-wrap.has-error {
    border-color: #dc2626;
  }

  .country-prefix {
    padding: 9px 12px;
    background: #f8f6f2;
    border-right: 1px solid var(--line);
    font-size: 0.88rem;
    font-weight: 600;
  }

  .phone-input-wrap input {
    border: none !important;
    outline: none !important;
    flex: 1;
    padding: 9px 12px;
    font-size: 0.95rem;
  }

  .field-error-msg {
    display: block;
    font-size: 0.78rem;
    color: #dc2626;
    margin-top: 4px;
  }

  .default-checkbox-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 18px 0;
    font-size: 0.88rem;
    color: var(--ink);
    cursor: pointer;
  }
</style>
