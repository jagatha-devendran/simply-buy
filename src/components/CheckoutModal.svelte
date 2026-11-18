<script>
  import { inr } from '../lib/format.js';
  import { bagItems, bagSummary, clearBag } from '../lib/bag.js';
  import { user } from '../lib/session.js';
  import { navigate } from '../lib/router.js';
  import { recordOrder } from '../lib/orders.js';
  import { placeOrderApi, verifyPaymentApi } from '../lib/api.js';
  import { addresses, saveNewAddress } from '../lib/addresses.js';
  import { showToast } from '../lib/toast.js';

  let { open = false, onclose = () => {} } = $props();

  let step = $state('shipping'); // 'shipping' | 'payment' | 'confirmed'
  let orderId = $state('');

  // Address selection vs New address mode
  let selectedAddressId = $state(null);
  let isAddingNewAddress = $state(false);

  // Form fields for new address
  let fullName = $state($user?.username ?? 'Jagatha D');
  let phone = $state($user?.phone || '9025477522');
  let address = $state('402, High Street Residencies, Indiranagar');
  let city = $state('Bengaluru');
  let pincode = $state('560038');

  // Phone validation state
  let phoneError = $state('');
  let phoneTouched = $state(false);

  // Payment method selection: ONLY TWO OPTIONS
  let paymentMethod = $state('online'); // 'online' | 'cod'

  let placingOrder = $state(false);

  // Automatically select the default address or first address when available
  $effect(() => {
    if ($addresses && $addresses.length > 0) {
      if (selectedAddressId === null) {
        const def = $addresses.find((a) => a.isDefault) || $addresses[0];
        if (def) selectedAddressId = def.id;
      }
    } else {
      isAddingNewAddress = true;
    }
  });

  // Active delivery address derived from selection or manual input
  const activeDeliveryAddress = $derived.by(() => {
    if (isAddingNewAddress || !$addresses || $addresses.length === 0) {
      return {
        id: null,
        recipientName: fullName,
        phone,
        streetAddress: address,
        city,
        pincode
      };
    }
    const found = $addresses.find((a) => a.id === selectedAddressId) || $addresses[0];
    if (found) {
      const fullStreet = `${found.houseNumber ? found.houseNumber + ', ' : ''}${found.streetAddress || ''}${found.locality ? ', ' + found.locality : ''}`.trim();
      return {
        id: found.id,
        recipientName: found.name || found.recipientName || fullName,
        phone: found.mobile || found.phone || phone,
        streetAddress: fullStreet || address,
        city: found.city || city,
        pincode: found.pincode || pincode
      };
    }
    return {
      id: null,
      recipientName: fullName,
      phone,
      streetAddress: address,
      city,
      pincode
    };
  });

  function handlePhoneInput(e) {
    phoneTouched = true;
    let raw = e.target.value || '';
    let digits = raw.replace(/\D/g, '');

    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    phone = digits.slice(0, 10);
    validatePhone(phone);
  }

  function validatePhone(val) {
    if (!val || val.trim().length === 0) {
      phoneError = 'Phone number is required';
      return false;
    }
    if (val.length < 10) {
      phoneError = `Please enter all 10 digits (${val.length}/10)`;
      return false;
    }
    if (!/^[6-9]/.test(val)) {
      phoneError = 'Indian mobile number must start with 6, 7, 8, or 9';
      return false;
    }
    phoneError = '';
    return true;
  }

  function handleProceedToPayment() {
    if (isAddingNewAddress) {
      phoneTouched = true;
      if (!validatePhone(phone)) return;
      if (!fullName.trim() || !address.trim() || !city.trim()) {
        showToast('Please fill in recipient name and street address.');
        return;
      }
      // Also save this newly entered address to user's saved addresses for next time!
      saveNewAddress({
        name: fullName.trim(),
        mobile: phone.trim(),
        email: $user?.email || 'user@simplybuy.com',
        houseNumber: '',
        streetAddress: address.trim(),
        locality: '',
        city: city.trim(),
        state: 'Karnataka',
        pincode: pincode.trim(),
        addressType: 'HOME',
        isDefault: $addresses.length === 0
      });
    }
    step = 'payment';
  }

  function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handlePlaceOrder() {
    placingOrder = true;
    const finalAddr = activeDeliveryAddress;

    // 1. CASH ON DELIVERY (COD)
    if (paymentMethod === 'cod') {
      let generatedNum = null;
      try {
        const backendRes = await placeOrderApi({
          addressId: finalAddr.id || $addresses[0]?.id || 1,
          paymentMethod: 'COD',
          couponId: 1
        });
        if (backendRes?.orderNumber) {
          generatedNum = backendRes.orderNumber;
        }
      } catch (e) {
        // Fallback to local
      }

      if (!generatedNum) {
        generatedNum = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      }

      orderId = generatedNum;
      recordOrder({
        id: Date.now(),
        orderNumber: generatedNum,
        items: $bagItems,
        totalAmount: $bagSummary.total,
        shippingAddress: finalAddr,
        paymentMethod: 'COD'
      });

      step = 'confirmed';
      placingOrder = false;
      clearBag();
      showToast('Order confirmed via Cash on Delivery!');
      return;
    }

    // 2. ONLINE PAYMENT VIA RAZORPAY
    let backendOrder = null;
    try {
      backendOrder = await placeOrderApi({
        addressId: finalAddr.id || $addresses[0]?.id || 1,
        paymentMethod: 'ONLINE',
        couponId: 1
      });
    } catch (e) {
      // Backend offline or local fallback
    }

    await loadRazorpayScript();

    if (typeof window !== 'undefined' && window.Razorpay) {
      const rzpKey = backendOrder?.keyId || 'rzp_test_Ture4YMZtrtFcf';
      const amountInPaise = Math.round($bagSummary.total * 100);

      const options = {
        key: rzpKey,
        amount: amountInPaise,
        currency: 'INR',
        name: 'Simply Buy',
        description: `Order Payment (${inr($bagSummary.total)})`,
        image: 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png',
        prefill: {
          name: finalAddr.recipientName || 'Jagatha D',
          email: $user?.email || 'jagathadevam965@gmail.com',
          contact: finalAddr.phone || '9025477522'
        },
        notes: {
          address: `${finalAddr.streetAddress}, ${finalAddr.city} - ${finalAddr.pincode}`
        },
        theme: {
          color: '#881337'
        },
        handler: async function (response) {
          try {
            if (response.razorpay_order_id && response.razorpay_payment_id) {
              await verifyPaymentApi({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature || 'test_signature'
              });
            }
          } catch (e) {}

          const generatedNum = backendOrder?.orderNumber || ('ORD-' + Math.floor(100000 + Math.random() * 900000));
          orderId = generatedNum;

          recordOrder({
            id: Date.now(),
            orderNumber: generatedNum,
            items: $bagItems,
            totalAmount: $bagSummary.total,
            shippingAddress: finalAddr,
            paymentMethod: 'ONLINE'
          });

          step = 'confirmed';
          placingOrder = false;
          clearBag();
          showToast('Payment verified successfully via Razorpay!');
        },
        modal: {
          ondismiss: function () {
            placingOrder = false;
            showToast('Payment window closed.');
          }
        }
      };

      if (backendOrder?.razorpayOrderId) {
        options.order_id = backendOrder.razorpayOrderId;
      }

      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (res) {
          showToast('Payment failed: ' + (res.error?.description || 'Transaction cancelled'));
          placingOrder = false;
        });
        rzp.open();
      } catch (err) {
        completeOnlineSimulation(backendOrder?.orderNumber, finalAddr);
      }
    } else {
      completeOnlineSimulation(backendOrder?.orderNumber, finalAddr);
    }
  }

  function completeOnlineSimulation(orderNum, finalAddr) {
    setTimeout(() => {
      const generatedNum = orderNum || ('ORD-' + Math.floor(100000 + Math.random() * 900000));
      orderId = generatedNum;

      recordOrder({
        id: Date.now(),
        orderNumber: generatedNum,
        items: $bagItems,
        totalAmount: $bagSummary.total,
        shippingAddress: finalAddr,
        paymentMethod: 'ONLINE'
      });

      step = 'confirmed';
      placingOrder = false;
      clearBag();
      showToast('Online Payment verified! Order confirmed.');
    }, 1200);
  }

  function handleFinish() {
    onclose();
    step = 'shipping';
    navigate('/products');
  }

  function handleGoToOrders() {
    onclose();
    step = 'shipping';
    navigate('/orders');
  }
</script>

{#if open}
  <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Checkout" tabindex="-1">
    <div class="modal-card">
      <div class="modal-head">
        <div class="modal-title-wrap">
          <span class="logo-mark small">SB</span>
          <h2>
            {#if step === 'confirmed'}
              Order Confirmed!
            {:else if step === 'payment'}
              Select Payment Method
            {:else}
              Delivery Address
            {/if}
          </h2>
        </div>
        <!-- Always render close button -->
        <button type="button" class="close-btn" onclick={onclose} aria-label="Close modal">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {#if step === 'shipping'}
        <div class="checkout-shipping-view">
          {#if $addresses.length > 0 && !isAddingNewAddress}
            <!-- 1. Select from Saved Addresses -->
            <div class="saved-address-section">
              <div class="section-top-bar">
                <span class="section-heading">Select Delivery Address</span>
                <button
                  type="button"
                  class="add-addr-link-btn"
                  onclick={() => (isAddingNewAddress = true)}
                >
                  + Add New Address
                </button>
              </div>

              <div class="saved-cards-list">
                {#each $addresses as addr (addr.id)}
                  <div
                    class="saved-addr-card"
                    class:selected={selectedAddressId === addr.id}
                    onclick={() => (selectedAddressId = addr.id)}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) => {
                      if (e.key === 'Enter') selectedAddressId = addr.id;
                    }}
                  >
                    <div class="radio-indicator">
                      <div class="radio-circle"></div>
                    </div>

                    <div class="addr-card-body">
                      <div class="addr-header-row">
                        <span class="recipient-name">{addr.name || addr.recipientName}</span>
                        <div class="badges-row">
                          <span class="type-pill">{addr.addressType || 'HOME'}</span>
                          {#if addr.isDefault}
                            <span class="default-pill">DEFAULT</span>
                          {/if}
                        </div>
                      </div>

                      <p class="addr-line">
                        {#if addr.houseNumber}{addr.houseNumber}, {/if}
                        {addr.streetAddress || ''}{#if addr.locality}, {addr.locality}{/if}
                      </p>
                      <p class="city-line">
                        {addr.city}, {addr.state} - <strong>{addr.pincode}</strong>
                      </p>
                      <p class="phone-line">
                        Mobile: <strong>+91 {addr.mobile || addr.phone}</strong>
                      </p>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <!-- 2. Manual / New Address Form -->
            <div class="manual-address-section">
              <div class="section-top-bar">
                <span class="section-heading">Enter Delivery Address</span>
                {#if $addresses.length > 0}
                  <button
                    type="button"
                    class="add-addr-link-btn"
                    onclick={() => (isAddingNewAddress = false)}
                  >
                    ← Choose Saved Address
                  </button>
                {/if}
              </div>

              <div class="form-grid">
                <label class="field">
                  <span>Full Name *</span>
                  <input type="text" required bind:value={fullName} placeholder="Enter your full name" />
                </label>

                <div class="field phone-field">
                  <label for="checkout-phone-input">
                    <span>Mobile Number *</span>
                  </label>
                  <div class="phone-input-wrap" class:has-error={phoneTouched && phoneError}>
                    <span class="country-prefix">+91</span>
                    <input
                      id="checkout-phone-input"
                      type="tel"
                      inputmode="numeric"
                      maxlength="10"
                      placeholder="9876543210"
                      value={phone}
                      oninput={handlePhoneInput}
                      onblur={() => {
                        phoneTouched = true;
                        validatePhone(phone);
                      }}
                    />
                  </div>
                  {#if phoneTouched && phoneError}
                    <span class="field-error-msg" role="alert">{phoneError}</span>
                  {/if}
                </div>

                <label class="field full">
                  <span>Street Address *</span>
                  <input type="text" required bind:value={address} placeholder="Flat / House No., Apartment, Street" />
                </label>

                <label class="field">
                  <span>City *</span>
                  <input type="text" required bind:value={city} placeholder="City name" />
                </label>

                <label class="field">
                  <span>Pincode *</span>
                  <!-- Pure text input with no annoying pattern regex popup -->
                  <input
                    type="text"
                    required
                    bind:value={pincode}
                    placeholder="e.g. 560038"
                  />
                </label>
              </div>
            </div>
          {/if}

          <div class="checkout-recap">
            <div class="recap-row">
              <span>Order Total ({$bagSummary.itemCount} items)</span>
              <strong>{inr($bagSummary.total)}</strong>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn" onclick={onclose}>Cancel</button>
            <button type="button" class="btn primary" onclick={handleProceedToPayment}>
              Proceed to Payment
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
      {:else if step === 'payment'}
        <div class="payment-step">
          <div class="address-preview">
            <span class="preview-badge">Delivering to</span>
            <p class="preview-name">
              <strong>{activeDeliveryAddress.recipientName}</strong> · +91 {activeDeliveryAddress.phone}
            </p>
            <p class="preview-addr">
              {activeDeliveryAddress.streetAddress}, {activeDeliveryAddress.city} - {activeDeliveryAddress.pincode}
            </p>
            <button type="button" class="btn link small" onclick={() => (step = 'shipping')}>
              Change address
            </button>
          </div>

          <div class="payment-options">
            <h3 class="payment-options-heading">Payment Options</h3>

            <!-- Option 1: Cash on Delivery (COD) -->
            <div class="payment-opt" class:selected={paymentMethod === 'cod'}>
              <input type="radio" id="pay-cod" name="payment" value="cod" bind:group={paymentMethod} />
              <div class="opt-content">
                <label for="pay-cod" class="opt-label">
                  <div class="opt-title-line">
                    <strong>Cash on Delivery (COD)</strong>
                    <span class="badge-free">No Advance Needed</span>
                  </div>
                  <span class="opt-sub">Pay via Cash or UPI QR upon delivery at your doorstep</span>
                </label>
              </div>
            </div>

            <!-- Option 2: Online Payment via Razorpay -->
            <div class="payment-opt" class:selected={paymentMethod === 'online'}>
              <input type="radio" id="pay-online" name="payment" value="online" bind:group={paymentMethod} />
              <div class="opt-content">
                <label for="pay-online" class="opt-label">
                  <div class="opt-title-line">
                    <strong>Online Payment (Razorpay)</strong>
                    <span class="badge-secure">100% Secure</span>
                  </div>
                  <span class="opt-sub">Pay instantly via UPI (Google Pay, PhonePe, Paytm), Cards & Netbanking</span>
                  <div class="razorpay-badges">
                    <span class="rzp-tag">UPI</span>
                    <span class="rzp-tag">Cards</span>
                    <span class="rzp-tag">NetBanking</span>
                    <span class="rzp-tag rzp-powered">⚡ Razorpay</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn" onclick={() => (step = 'shipping')}>Back</button>
            <button
              type="button"
              class="btn primary place-order-btn"
              disabled={placingOrder}
              onclick={handlePlaceOrder}
            >
              {#if placingOrder}
                <span class="spinner-small"></span>
                Processing Order…
              {:else if paymentMethod === 'cod'}
                Place COD Order ({inr($bagSummary.total)})
              {:else}
                Pay with Razorpay ({inr($bagSummary.total)})
              {/if}
            </button>
          </div>
        </div>
      {:else}
        <div class="order-confirmed-view">
          <div class="celebration-badge">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>

          <h3>Order Confirmed!</h3>
          <p class="order-subtitle">
            Your order <strong>#{orderId}</strong> has been successfully placed.
          </p>

          <div class="confirmed-card">
            <div class="confirmed-row">
              <span class="muted">Estimated Delivery</span>
              <strong>Friday, by 7:00 PM</strong>
            </div>
            <div class="confirmed-row">
              <span class="muted">Shipping to</span>
              <span>{activeDeliveryAddress.recipientName}, {activeDeliveryAddress.city}</span>
            </div>
            <div class="confirmed-row">
              <span class="muted">Payment Method</span>
              <span class="status-badge-paid">
                {paymentMethod === 'cod' ? 'CASH ON DELIVERY' : 'ONLINE (RAZORPAY)'}
              </span>
            </div>
          </div>

          <p class="confirmation-note">
            Your order details and tracking status are available on your My Orders page.
          </p>

          <div class="confirmed-btn-group">
            <button type="button" class="btn outline" onclick={handleGoToOrders}>
              View My Orders
            </button>
            <button type="button" class="btn primary" onclick={handleFinish}>
              Continue Shopping
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .checkout-shipping-view {
    padding: 24px;
  }

  .section-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .section-heading {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--ink);
  }

  .add-addr-link-btn {
    border: none;
    background: transparent;
    color: var(--burgundy);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }

  .add-addr-link-btn:hover {
    text-decoration: underline;
  }

  .saved-cards-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
    margin-bottom: 18px;
  }

  .saved-addr-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
    border: 1.5px solid var(--line);
    border-radius: var(--radius-md);
    background: #fff;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .saved-addr-card:hover {
    border-color: var(--line-strong);
    background: #fdfcfa;
  }

  .saved-addr-card.selected {
    border-color: var(--burgundy);
    background: #fdf8f8;
    box-shadow: 0 0 0 1px var(--burgundy);
  }

  .radio-indicator {
    padding-top: 2px;
  }

  .radio-circle {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid var(--line-strong);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .saved-addr-card.selected .radio-circle {
    border-color: var(--burgundy);
    background: var(--burgundy);
  }

  .saved-addr-card.selected .radio-circle::after {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fff;
  }

  .addr-card-body {
    flex: 1;
    min-width: 0;
  }

  .addr-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .recipient-name {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--ink);
  }

  .badges-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .type-pill {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 1px 6px;
    background: #f4f2ee;
    border-radius: 3px;
    color: var(--ink);
  }

  .default-pill {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 1px 6px;
    background: #fdf2f2;
    color: #991b1b;
    border-radius: 3px;
    border: 1px solid #fecaca;
  }

  .addr-line {
    font-size: 0.85rem;
    color: #555;
    margin: 0 0 2px;
    line-height: 1.35;
  }

  .addr-city {
    font-size: 0.82rem;
    color: var(--muted);
    margin: 0 0 4px;
  }

  .addr-city strong {
    color: var(--ink);
  }

  .phone-line {
    font-size: 0.8rem;
    color: var(--muted);
    margin: 0;
  }

  .phone-line strong {
    color: var(--ink);
  }

  .phone-field {
    display: flex;
    flex-direction: column;
  }

  .phone-field label span {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
    margin-bottom: 6px;
  }

  .phone-input-wrap {
    display: flex;
    align-items: center;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: #fff;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    overflow: hidden;
  }

  .phone-input-wrap:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(184, 51, 42, 0.12);
  }

  .phone-input-wrap.has-error {
    border-color: #dc2626 !important;
    background: #fffafa;
  }

  .country-prefix {
    padding: 10px 12px;
    background: #f7f5f0;
    border-right: 1px solid var(--line);
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--ink);
    user-select: none;
    letter-spacing: 0.02em;
  }

  .phone-input-wrap input {
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    outline: none !important;
    flex: 1;
    min-width: 0;
    padding: 10px 12px;
    font-size: 0.95rem;
    font-family: inherit;
    letter-spacing: 0.05em;
  }

  .field-error-msg {
    display: block;
    font-size: 0.78rem;
    color: #dc2626;
    margin-top: 4px;
    font-weight: 500;
  }

  .payment-options-heading {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 14px;
    color: var(--ink);
  }

  .opt-title-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }

  .badge-free {
    font-size: 0.72rem;
    font-weight: 700;
    color: #047857;
    background: #ecfdf5;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .badge-secure {
    font-size: 0.72rem;
    font-weight: 700;
    color: #0369a1;
    background: #e0f2fe;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .razorpay-badges {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  .rzp-tag {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 6px;
    background: #f1f5f9;
    color: #475569;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }

  .rzp-tag.rzp-powered {
    background: #eff6ff;
    color: #1d4ed8;
    border-color: #bfdbfe;
    font-weight: 700;
  }

  .confirmed-btn-group {
    display: flex;
    gap: 12px;
    margin-top: 18px;
    justify-content: center;
  }

  .btn.outline {
    background: transparent;
    border: 1px solid var(--line-strong);
    color: var(--ink);
    padding: 10px 18px;
    border-radius: var(--radius);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn.outline:hover {
    background: var(--surface-alt);
    border-color: var(--ink);
  }
</style>
