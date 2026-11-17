<script>
  import { inr } from '../lib/format.js';
  import { bagItems, bagSummary, clearBag } from '../lib/bag.js';
  import { user } from '../lib/session.js';
  import { navigate } from '../lib/router.js';

  let { open = false, onclose = () => {} } = $props();

  let step = $state('shipping'); // 'shipping' | 'payment' | 'confirmed'
  let orderId = $state('');

  // Shipping form fields
  let fullName = $state($user?.username ?? 'Aditi Sharma');
  let phone = $state('9876543210');
  let address = $state('402, High Street Residencies, Indiranagar');
  let city = $state('Bengaluru');
  let pincode = $state('560038');

  // Payment method selection
  let paymentMethod = $state('upi'); // 'upi' | 'card' | 'netbanking' | 'cod'

  // Payment details
  let upiId = $state('9876543210@upi');
  let cardNumber = $state('4532 •••• •••• 8821');
  let cardExpiry = $state('08/29');
  let cardCvv = $state('•••');
  let cardName = $state($user?.username ?? 'Aditi Sharma');
  let selectedBank = $state('HDFC Bank');

  let placingOrder = $state(false);

  function handleShippingSubmit(e) {
    e.preventDefault();
    step = 'payment';
  }

  function handlePlaceOrder() {
    placingOrder = true;
    setTimeout(() => {
      orderId = 'SB-' + Math.floor(100000 + Math.random() * 900000);
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
        <form class="checkout-form" onsubmit={handleShippingSubmit}>
          <div class="form-grid">
            <label class="field">
              <span>Full Name</span>
              <input type="text" required bind:value={fullName} />
            </label>
            <label class="field">
              <span>Phone Number</span>
              <input type="tel" required pattern="[0-9]{10}" bind:value={phone} />
            </label>
            <label class="field full">
              <span>Street Address</span>
              <input type="text" required bind:value={address} />
            </label>
            <label class="field">
              <span>City</span>
              <input type="text" required bind:value={city} />
            </label>
            <label class="field">
              <span>Pincode</span>
              <input type="text" required pattern="[0-9]{6}" bind:value={pincode} />
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
            <p class="preview-name"><strong>{fullName}</strong> · {phone}</p>
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
                <label for="pay-upi" class="opt-title">
                  <span>UPI / QR Code</span>
                  <span class="badge-fast">FASTEST</span>
                </label>
                <p class="opt-desc">Instant transfer via PhonePe, Paytm, BHIM or any UPI App</p>

                {#if paymentMethod === 'upi'}
                  <div class="upi-input-box">
                    <label class="field">
                      <span>UPI ID / VPA</span>
                      <input type="text" placeholder="username@upi" bind:value={upiId} />
                    </label>
                    <span class="secure-badge">🔒 256-Bit Encrypted & Verified</span>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Card Option -->
            <div class="payment-opt" class:selected={paymentMethod === 'card'}>
              <input type="radio" id="pay-card" name="payment" value="card" bind:group={paymentMethod} />
              <div class="opt-content">
                <label for="pay-card" class="opt-title">
                  <span>Credit / Debit Card</span>
                  <span class="badge-cards">VISA · MC · RUPAY</span>
                </label>
                <p class="opt-desc">Secure checkout via your credit or debit card</p>

                {#if paymentMethod === 'card'}
                  <div class="card-input-box">
                    <div class="form-grid">
                      <label class="field full">
                        <span>Card Number</span>
                        <input type="text" placeholder="4532 0000 0000 8821" bind:value={cardNumber} />
                      </label>
                      <label class="field">
                        <span>Expiry Date</span>
                        <input type="text" placeholder="MM/YY" bind:value={cardExpiry} />
                      </label>
                      <label class="field">
                        <span>CVV</span>
                        <input type="password" maxlength="4" placeholder="123" bind:value={cardCvv} />
                      </label>
                    </div>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Net Banking Option -->
            <div class="payment-opt" class:selected={paymentMethod === 'netbanking'}>
              <input type="radio" id="pay-nb" name="payment" value="netbanking" bind:group={paymentMethod} />
              <div class="opt-content">
                <label for="pay-nb" class="opt-title">
                  <span>Net Banking</span>
                </label>
                <p class="opt-desc">All major Indian banks supported</p>

                {#if paymentMethod === 'netbanking'}
                  <div class="netbanking-box">
                    <select class="bank-select" bind:value={selectedBank}>
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

            <!-- Cash on Delivery -->
            <div class="payment-opt" class:selected={paymentMethod === 'cod'}>
              <input type="radio" id="pay-cod" name="payment" value="cod" bind:group={paymentMethod} />
              <div class="opt-content">
                <label for="pay-cod" class="opt-title">
                  <span>Pay on Delivery</span>
                </label>
                <p class="opt-desc">Pay cash or UPI to delivery agent at your doorstep</p>
              </div>
            </div>
          </div>

          <div class="checkout-recap">
            <div class="recap-row">
              <span>Total Payable</span>
              <strong class="recap-total">{inr($bagSummary.total)}</strong>
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
