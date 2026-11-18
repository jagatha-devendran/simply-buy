<script>
  import { inr } from '../lib/format.js';
  import { bagItems, bagSummary, clearBag } from '../lib/bag.js';
  import { user } from '../lib/session.js';
  import { navigate } from '../lib/router.js';
  import { recordOrder } from '../lib/orders.js';

  let { open = false, onclose = () => {} } = $props();

  let step = $state('shipping'); // 'shipping' | 'payment' | 'confirmed'
  let orderId = $state('');

  // Shipping form fields
  let fullName = $state($user?.username ?? 'Jagatha D');
  let phone = $state($user?.phone || '9876543210');
  let address = $state('402, High Street Residencies, Indiranagar');
  let city = $state('Bengaluru');
  let pincode = $state('560038');

  // Phone validation state
  let phoneError = $state('');
  let phoneTouched = $state(false);

  // Payment method selection
  let paymentMethod = $state('upi'); // 'upi' | 'card' | 'netbanking' | 'cod'

  // Payment details
  let upiId = $state('9876543210@upi');
  let cardNumber = $state('4532 •••• •••• 8821');
  let cardExpiry = $state('08/29');
  let cardCvv = $state('•••');
  let cardName = $state($user?.username ?? 'Jagatha D');
  let selectedBank = $state('HDFC Bank');

  let placingOrder = $state(false);

  // Sanitize & format phone input to only 10 digits
  function handlePhoneInput(e) {
    phoneTouched = true;
    let raw = e.target.value || '';
    // Strip everything that is not a digit
    let digits = raw.replace(/\D/g, '');

    // Strip country code if pasted (e.g. 919876543210 -> 9876543210)
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

  function handleShippingSubmit(e) {
    e.preventDefault();
    phoneTouched = true;
    const isValid = validatePhone(phone);
    if (!isValid) {
      return;
    }
    phoneError = '';
    step = 'payment';
  }

  function handlePlaceOrder() {
    placingOrder = true;
    setTimeout(() => {
      const generatedId = 'SB-' + Math.floor(100000 + Math.random() * 900000);
      orderId = generatedId;

      recordOrder({
        id: generatedId,
        items: $bagItems,
        totalAmount: $bagSummary.total,
        shippingAddress: {
          fullName,
          phone,
          address,
          city,
          pincode
        },
        paymentMethod:
          paymentMethod === 'upi'
            ? `UPI (${upiId})`
            : paymentMethod === 'card'
              ? 'Credit/Debit Card'
              : paymentMethod === 'netbanking'
                ? `Net Banking (${selectedBank})`
                : 'Cash on Delivery'
      });

      step = 'confirmed';
      placingOrder = false;
      clearBag();
    }, 1200);
  }

  function handleFinish() {
    onclose();
    step = 'shipping';
    navigate('/products');
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
              Payment Gateway
            {:else}
              Delivery Address
            {/if}
          </h2>
        </div>
        {#if step !== 'confirmed'}
          <button type="button" class="close-btn" onclick={onclose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        {/if}
      </div>

      {#if step === 'shipping'}
        <form class="checkout-form" onsubmit={handleShippingSubmit} novalidate>
          <div class="form-grid">
            <label class="field">
              <span>Full Name</span>
              <input type="text" required bind:value={fullName} placeholder="Enter your full name" />
            </label>

            <div class="field phone-field">
              <label for="checkout-phone-input">
                <span>Phone Number</span>
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
                <span class="field-error-msg" role="alert">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  {phoneError}
                </span>
              {/if}
            </div>

            <label class="field full">
              <span>Street Address</span>
              <input type="text" required bind:value={address} placeholder="Flat / House No., Apartment, Street" />
            </label>

            <label class="field">
              <span>City</span>
              <input type="text" required bind:value={city} placeholder="City name" />
            </label>

            <label class="field">
              <span>Pincode</span>
              <input
                type="text"
                required
                maxlength="6"
                pattern="[0-9]{6}"
                bind:value={pincode}
                placeholder="6-digit Pincode"
                oninput={(e) => {
                  pincode = e.target.value.replace(/\D/g, '').slice(0, 6);
                }}
              />
            </label>
          </div>

          <div class="checkout-recap">
            <div class="recap-row">
              <span>Order Total ({$bagSummary.itemCount} items)</span>
              <strong>{inr($bagSummary.total)}</strong>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn" onclick={onclose}>Cancel</button>
            <button type="submit" class="btn primary">
              Proceed to Payment
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </form>
      {:else if step === 'payment'}
        <div class="payment-step">
          <div class="address-preview">
            <span class="preview-badge">Delivering to</span>
            <p class="preview-name"><strong>{fullName}</strong> · +91 {phone}</p>
            <p class="preview-addr">{address}, {city} - {pincode}</p>
            <button type="button" class="btn link small" onclick={() => (step = 'shipping')}>
              Change address
            </button>
          </div>

          <div class="payment-options">
            <h3>Select Payment Option</h3>

            <!-- UPI Option -->
            <div class="payment-opt" class:selected={paymentMethod === 'upi'}>
              <input type="radio" id="pay-upi" name="payment" value="upi" bind:group={paymentMethod} />
              <div class="opt-content">
                <label for="pay-upi" class="opt-label">
                  <strong>UPI (Instant & Free)</strong>
                  <span class="opt-sub">Google Pay, PhonePe, Paytm, BHIM</span>
                </label>
                {#if paymentMethod === 'upi'}
                  <div class="pay-subfield">
                    <input
                      type="text"
                      bind:value={upiId}
                      placeholder="e.g. yourname@oksbi"
                      class="upi-input"
                    />
                    <span class="upi-hint">Verified UPI ID</span>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Card Option -->
            <div class="payment-opt" class:selected={paymentMethod === 'card'}>
              <input type="radio" id="pay-card" name="payment" value="card" bind:group={paymentMethod} />
              <div class="opt-content">
                <label for="pay-card" class="opt-label">
                  <strong>Credit / Debit Card</strong>
                  <span class="opt-sub">Visa, Mastercard, RuPay, Amex</span>
                </label>
                {#if paymentMethod === 'card'}
                  <div class="pay-subfield card-grid">
                    <input type="text" bind:value={cardNumber} placeholder="Card Number" class="card-num" />
                    <div class="card-subgrid">
                      <input type="text" bind:value={cardExpiry} placeholder="MM/YY" />
                      <input type="password" maxlength="4" bind:value={cardCvv} placeholder="CVV" />
                    </div>
                    <input type="text" bind:value={cardName} placeholder="Name on Card" />
                  </div>
                {/if}
              </div>
            </div>

            <!-- Netbanking Option -->
            <div class="payment-opt" class:selected={paymentMethod === 'netbanking'}>
              <input type="radio" id="pay-nb" name="payment" value="netbanking" bind:group={paymentMethod} />
              <div class="opt-content">
                <label for="pay-nb" class="opt-label">
                  <strong>Net Banking</strong>
                  <span class="opt-sub">All Indian scheduled banks supported</span>
                </label>
                {#if paymentMethod === 'netbanking'}
                  <div class="pay-subfield">
                    <select bind:value={selectedBank} class="bank-select">
                      <option>HDFC Bank</option>
                      <option>State Bank of India</option>
                      <option>ICICI Bank</option>
                      <option>Axis Bank</option>
                      <option>Kotak Mahindra Bank</option>
                    </select>
                  </div>
                {/if}
              </div>
            </div>

            <!-- COD Option -->
            <div class="payment-opt" class:selected={paymentMethod === 'cod'}>
              <input type="radio" id="pay-cod" name="payment" value="cod" bind:group={paymentMethod} />
              <div class="opt-content">
                <label for="pay-cod" class="opt-label">
                  <strong>Cash on Delivery (COD)</strong>
                  <span class="opt-sub">Pay via cash or UPI QR upon delivery</span>
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
                Processing Payment…
              {:else}
                Pay & Place Order ({inr($bagSummary.total)})
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
              <span>{fullName}, {city}</span>
            </div>
            <div class="confirmed-row">
              <span class="muted">Payment Method</span>
              <span class="status-badge-paid">{paymentMethod.toUpperCase()}</span>
            </div>
          </div>

          <p class="confirmation-note">
            A confirmation email with real-time tracking updates has been sent.
          </p>

          <button type="button" class="btn primary" onclick={handleFinish}>
            Continue Shopping
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
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
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.78rem;
    color: #dc2626;
    margin-top: 5px;
    font-weight: 500;
  }
</style>
