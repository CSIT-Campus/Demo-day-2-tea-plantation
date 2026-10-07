/* ==========================================================================
   Mistyhill Ceylon Tea — shared site script
   Product data, currency toggle, cart (localStorage) and form handling.
   Each page only runs the parts whose elements it contains.
   ========================================================================== */

'use strict';

/* ---------- Data ---------- */

const PRODUCTS = [
  {
    id: 'classic-ceylon-black',
    name: 'Classic Ceylon Black',
    description: 'Our signature traditional black tea.',
    size: '100g',
    prices: { LKR: 950, USD: 3.5 },
    color: '#6B3424',
    featured: true,
  },
  {
    id: 'pure-green-tea',
    name: 'Pure Green Tea',
    description: 'Light and refreshing, for the health-conscious.',
    size: '100g',
    prices: { LKR: 1100, USD: 4 },
    color: '#5E8A3A',
  },
  {
    id: 'cinnamon-spice',
    name: 'Cinnamon Spice',
    description: 'Black tea blended with true Ceylon cinnamon.',
    size: '100g',
    prices: { LKR: 1250, USD: 4.5 },
    color: '#A0522D',
    featured: true,
  },
  {
    id: 'ginger-zest',
    name: 'Ginger Zest',
    description: 'Warming black tea with ginger.',
    size: '100g',
    prices: { LKR: 1250, USD: 4.5 },
    color: '#C48A2C',
  },
  {
    id: 'lemongrass-fresh',
    name: 'Lemongrass Fresh',
    description: 'Light tea with fresh lemongrass.',
    size: '100g',
    prices: { LKR: 1250, USD: 4.5 },
    color: '#93A840',
  },
  {
    id: 'vanilla-dream',
    name: 'Vanilla Dream',
    description: 'Smooth black tea with natural vanilla.',
    size: '100g',
    prices: { LKR: 1350, USD: 5 },
    color: '#CDB68A',
  },
  {
    id: 'royal-cardamom',
    name: 'Royal Cardamom',
    description: 'Aromatic black tea with cardamom.',
    size: '100g',
    prices: { LKR: 1400, USD: 5 },
    color: '#3D6B5B',
  },
  {
    id: 'silver-tips',
    name: 'Silver Tips',
    description: 'Our premium hand-crafted white tea.',
    size: '50g',
    prices: { LKR: 4500, USD: 16 },
    color: '#9EA8AB',
    featured: true,
    premium: true,
  },
];

const TOUR_PRICE = { LKR: 2500, USD: 8 };
const TOUR_MAX_PEOPLE = 15;

// Sri Lanka: LKR 400, free from LKR 5,000. International: flat USD 12.
// The other currency of each fee is a conversion so every price can switch.
const DELIVERY = {
  local: { fee: { LKR: 400, USD: 1.5 }, freeFromLKR: 5000 },
  international: { fee: { LKR: 3600, USD: 12 } },
};

const CURRENCIES = ['LKR', 'USD'];
const MAX_QTY = 99;
const STORAGE_KEYS = { cart: 'mistyhill-cart', currency: 'mistyhill-currency' };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9\s()-]{7,20}$/;

/* ---------- Storage (fails quietly in private mode) ---------- */

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage unavailable: the site still works for this visit. */
  }
}

/* ---------- Currency ---------- */

let currency = loadCurrency();
const currencyListeners = [];

function loadCurrency() {
  const saved = readStorage(STORAGE_KEYS.currency, 'LKR');
  return CURRENCIES.includes(saved) ? saved : 'LKR';
}

function formatMoney(amount, code = currency) {
  if (code === 'USD') {
    return `USD ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `LKR ${Math.round(amount).toLocaleString('en-US')}`;
}

function priceIn(prices) {
  return prices[currency];
}

// Any element with data-lkr and data-usd is updated when the currency changes.
function priceAttrs(prices) {
  return `data-lkr="${prices.LKR}" data-usd="${prices.USD}"`;
}

function setMoney(el, prices) {
  el.dataset.lkr = prices.LKR;
  el.dataset.usd = prices.USD;
  el.textContent = formatMoney(priceIn(prices));
}

function onCurrencyChange(listener) {
  currencyListeners.push(listener);
}

function setCurrency(code) {
  if (!CURRENCIES.includes(code) || code === currency) return;
  currency = code;
  writeStorage(STORAGE_KEYS.currency, code);
  applyCurrency();
}

function applyCurrency() {
  document.querySelectorAll('[data-currency]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.currency === currency));
  });
  document.querySelectorAll('[data-lkr][data-usd]').forEach((el) => {
    const amount = Number(currency === 'USD' ? el.dataset.usd : el.dataset.lkr);
    el.textContent = formatMoney(amount);
  });
  currencyListeners.forEach((listener) => listener());
}

/* ---------- Cart ---------- */

let cart = loadCart();
const cartListeners = [];

function findProduct(id) {
  return PRODUCTS.find((product) => product.id === id);
}

function loadCart() {
  const saved = readStorage(STORAGE_KEYS.cart, []);
  if (!Array.isArray(saved)) return [];
  return saved
    .filter((item) => item && findProduct(item.id) && Number.isInteger(item.qty) && item.qty > 0)
    .map((item) => ({ id: item.id, qty: Math.min(item.qty, MAX_QTY) }));
}

function saveCart() {
  writeStorage(STORAGE_KEYS.cart, cart);
  updateCartCount();
  cartListeners.forEach((listener) => listener());
}

function addToCart(id) {
  const item = cart.find((entry) => entry.id === id);
  if (item) {
    item.qty = Math.min(item.qty + 1, MAX_QTY);
  } else {
    cart.push({ id, qty: 1 });
  }
  saveCart();
}

function setQuantity(id, qty) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;
  item.qty = Math.max(1, Math.min(qty, MAX_QTY));
  saveCart();
}

function removeFromCart(id) {
  cart = cart.filter((entry) => entry.id !== id);
  saveCart();
}

function clearCart() {
  cart = [];
  saveCart();
}

function cartItemCount() {
  return cart.reduce((count, item) => count + item.qty, 0);
}

function roundCents(value) {
  return Math.round(value * 100) / 100;
}

function cartTotals(region) {
  const sum = (code) => cart.reduce((total, item) => total + findProduct(item.id).prices[code] * item.qty, 0);
  const subtotal = { LKR: sum('LKR'), USD: roundCents(sum('USD')) };
  const isFree = region === 'local' && subtotal.LKR >= DELIVERY.local.freeFromLKR;
  const delivery = isFree ? { LKR: 0, USD: 0 } : DELIVERY[region].fee;
  const total = { LKR: subtotal.LKR + delivery.LKR, USD: roundCents(subtotal.USD + delivery.USD) };
  return { subtotal, delivery, total, isFree };
}

function updateCartCount() {
  const count = cartItemCount();
  document.querySelectorAll('[data-cart-count]').forEach((badge) => {
    badge.textContent = count > MAX_QTY ? `${MAX_QTY}+` : String(count);
    badge.classList.toggle('is-empty', count === 0);
  });
  document.querySelectorAll('[data-cart-link]').forEach((link) => {
    link.setAttribute('aria-label', `Cart, ${count} ${count === 1 ? 'item' : 'items'}`);
  });
}

function bumpCartCount() {
  document.querySelectorAll('[data-cart-count]').forEach((badge) => {
    badge.classList.remove('bump');
    void badge.offsetWidth; // restart the animation
    badge.classList.add('bump');
  });
}

/* ---------- Header, footer and toast ---------- */

function initHeader() {
  document.querySelectorAll('[data-currency]').forEach((button) => {
    button.addEventListener('click', () => setCurrency(button.dataset.currency));
  });

  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('main-nav');

  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (nav.classList.contains('is-open') && !header.contains(event.target)) setOpen(false);
    });

    window.matchMedia('(min-width: 900px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

let toastTimer;

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12.5 2.5 2.5L16 9.5"/></svg>
      <span class="toast__message"></span>
      <a href="cart.html">View cart</a>`;
    document.body.append(toast);
  }
  toast.querySelector('.toast__message').textContent = message;
  void toast.offsetWidth; // let a newly added toast start from its hidden state
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

/* ---------- Product cards ---------- */

function packMarkup(product, { mini = false } = {}) {
  const classes = ['pack', mini && 'pack--mini', product.premium && 'pack--premium'].filter(Boolean).join(' ');
  return `
    <div class="${classes}" style="--pack: ${product.color}" aria-hidden="true">
      <div class="pack__box">
        <div class="pack__label">
          <svg class="pack__leaf" viewBox="0 0 20 20"><path d="M10 18V9.5m0 0c0-4 2.6-6.8 6.6-6.8 0 4-2.6 6.8-6.6 6.8Zm0 2.4c0-3.2-2.2-5.5-5.6-5.5 0 3.2 2.2 5.5 5.6 5.5Z"/></svg>
          <span class="pack__brand">Mistyhill</span>
          <span class="pack__name">${product.name}</span>
          <span class="pack__weight">${product.size}</span>
        </div>
      </div>
    </div>`;
}

function productCardMarkup(product, mode = 'shop') {
  const price = `<span class="price" ${priceAttrs(product.prices)}>${formatMoney(priceIn(product.prices))}</span>`;
  const badge = product.premium ? '<span class="product-card__badge">Premium white tea</span>' : '';

  if (mode === 'featured') {
    return `
      <article class="product-card" style="--pack: ${product.color}">
        <div class="product-card__media">${badge}${packMarkup(product)}</div>
        <div class="product-card__body">
          <h3 class="product-card__name"><a class="product-card__link" href="shop.html#${product.id}">${product.name}</a></h3>
          <p class="product-card__desc">${product.description}</p>
          <p class="product-card__size">${product.size} pack</p>
          <div class="product-card__foot">${price}<span class="product-card__cta">View in shop</span></div>
        </div>
      </article>`;
  }

  return `
    <article class="product-card" id="${product.id}" style="--pack: ${product.color}">
      <div class="product-card__media">${badge}${packMarkup(product)}</div>
      <div class="product-card__body">
        <h3 class="product-card__name">${product.name}</h3>
        <p class="product-card__desc">${product.description}</p>
        <p class="product-card__size">${product.size} pack</p>
        <div class="product-card__foot">
          ${price}
          <button type="button" class="btn btn--primary btn--small" data-add-to-cart="${product.id}">
            <span>Add<span class="visually-hidden"> ${product.name}</span> to cart</span>
          </button>
        </div>
      </div>
    </article>`;
}

function initFeatured() {
  const grid = document.querySelector('[data-featured-grid]');
  if (!grid) return;
  grid.innerHTML = PRODUCTS.filter((product) => product.featured)
    .map((product) => productCardMarkup(product, 'featured'))
    .join('');
}

function initShop() {
  const grid = document.querySelector('[data-product-grid]');
  if (!grid) return;

  grid.innerHTML = PRODUCTS.map((product) => productCardMarkup(product)).join('');

  grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-to-cart]');
    if (!button) return;
    const product = findProduct(button.dataset.addToCart);
    addToCart(product.id);
    bumpCartCount();
    showToast(`${product.name} added to cart`);
  });

  // Featured teas on the home page link here as shop.html#product-id
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target && target.classList.contains('product-card')) {
    target.classList.add('is-highlighted');
    target.scrollIntoView({ block: 'center', behavior: 'instant' });
    setTimeout(() => target.classList.remove('is-highlighted'), 2600);
  }
}

/* ---------- Form validation ---------- */

const requiredText = (message) => (value) => (value ? '' : message);

function emailRule(value) {
  if (!value) return 'Enter your email address.';
  return EMAIL_PATTERN.test(value) ? '' : 'Enter an email address like name@example.com.';
}

function phoneRule(value) {
  if (!value) return 'Enter your phone number.';
  return PHONE_PATTERN.test(value) && value.replace(/\D/g, '').length >= 7
    ? ''
    : 'Enter a phone number with at least 7 digits, like +94 77 123 4567.';
}

function fieldValue(form, name) {
  const control = form.elements[name];
  return control ? String(control.value).trim() : '';
}

function fieldControls(form, name) {
  const control = form.elements[name];
  return control instanceof RadioNodeList ? [...control] : [control];
}

function showFieldError(form, name, message) {
  const controls = fieldControls(form, name);
  const wrapper = controls[0].closest('.field');
  const isGroup = controls.length > 1 || controls[0].type === 'radio';
  const errorId = `${form.id}-${name}-error`;

  let error = wrapper.querySelector('.field-error');
  if (!error) {
    error = document.createElement('p');
    error.className = 'field-error';
    error.id = errorId;
    wrapper.append(error);
    const described = isGroup ? wrapper : controls[0];
    const existing = described.getAttribute('aria-describedby');
    described.setAttribute('aria-describedby', existing ? `${existing} ${errorId}` : errorId);
  }

  error.textContent = message;
  wrapper.classList.toggle('is-invalid', Boolean(message));
  controls.forEach((control) => {
    if (message) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  });
}

function validateForm(form, rules) {
  let firstInvalid = null;
  Object.entries(rules).forEach(([name, rule]) => {
    const message = rule(fieldValue(form, name), form);
    showFieldError(form, name, message);
    if (message && !firstInvalid) firstInvalid = name;
  });
  if (firstInvalid) {
    const control = fieldControls(form, firstInvalid).find((el) => !el.disabled);
    control?.focus();
  }
  return !firstInvalid;
}

// After a failed submit, re-check a field as soon as the visitor fixes it.
function revalidateOnEdit(form, rules) {
  const recheck = (event) => {
    const name = event.target.name;
    if (!name || !rules[name]) return;
    const wrapper = event.target.closest('.field');
    if (wrapper?.classList.contains('is-invalid')) {
      showFieldError(form, name, rules[name](fieldValue(form, name), form));
    }
  };
  form.addEventListener('input', recheck);
  form.addEventListener('change', recheck);
}

function showSuccess(container, message) {
  container.querySelector('p').textContent = message;
  container.hidden = false;
  container.focus({ preventScroll: true });
  container.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* ---------- Cart page ---------- */

function initCartPage() {
  const page = document.querySelector('[data-cart-page]');
  if (!page) return;

  const layout = page.querySelector('[data-cart-layout]');
  const empty = page.querySelector('[data-cart-empty]');
  const confirmation = page.querySelector('[data-order-confirmation]');
  const list = page.querySelector('[data-cart-list]');
  const listHeading = page.querySelector('[data-cart-heading]');
  const summary = page.querySelector('[data-cart-summary]');
  const formError = page.querySelector('[data-form-error]');
  const paymentNote = page.querySelector('[data-payment-note]');
  const form = document.getElementById('checkout-form');

  const region = () => (form.elements.country.value === 'other' ? 'international' : 'local');

  const rules = {
    fullName: requiredText('Enter your full name.'),
    email: emailRule,
    phone: phoneRule,
    country: requiredText('Choose the country we should deliver to.'),
    address: (value) => {
      if (!value) return 'Enter your delivery address.';
      return value.length < 8 ? 'Enter your full address, including your town or city.' : '';
    },
    payment: (value, theForm) => {
      if (!value) return 'Choose a payment method.';
      if (value === 'cod' && theForm.elements.country.value === 'other') {
        return 'Cash on delivery is only available in Sri Lanka.';
      }
      return '';
    },
  };

  function renderList() {
    // Keep keyboard focus on the same control after re-rendering.
    const active = document.activeElement;
    const focusAction = list.contains(active) ? active.dataset.action : null;
    const focusId = list.contains(active) ? active.dataset.id : null;

    list.innerHTML = cart
      .map((item) => {
        const product = findProduct(item.id);
        const lineTotal = { LKR: product.prices.LKR * item.qty, USD: roundCents(product.prices.USD * item.qty) };
        return `
          <li class="cart-item">
            ${packMarkup(product, { mini: true })}
            <div class="cart-item__info">
              <h3 class="cart-item__name">${product.name}</h3>
              <p class="cart-item__meta"><span ${priceAttrs(product.prices)}>${formatMoney(priceIn(product.prices))}</span> each, ${product.size} pack</p>
            </div>
            <div class="qty" role="group" aria-label="Quantity of ${product.name}">
              <button type="button" data-action="decrease" data-id="${product.id}" aria-label="Remove one ${product.name}" ${item.qty <= 1 ? 'disabled' : ''}>&minus;</button>
              <span class="qty__value" aria-live="polite">${item.qty}</span>
              <button type="button" data-action="increase" data-id="${product.id}" aria-label="Add one more ${product.name}" ${item.qty >= MAX_QTY ? 'disabled' : ''}>+</button>
            </div>
            <p class="cart-item__total" ${priceAttrs(lineTotal)}>${formatMoney(priceIn(lineTotal))}</p>
            <button type="button" class="cart-item__remove" data-action="remove" data-id="${product.id}">
              Remove<span class="visually-hidden"> ${product.name}</span>
            </button>
          </li>`;
      })
      .join('');

    if (!focusAction) return;
    const selector = (action) => `[data-action="${action}"][data-id="${focusId}"]`;
    let next = list.querySelector(selector(focusAction));
    if (next?.disabled) next = list.querySelector(selector(focusAction === 'decrease' ? 'increase' : 'decrease'));
    (next || listHeading).focus();
  }

  function renderSummary() {
    const zone = region();
    const totals = cartTotals(zone);
    const count = cartItemCount();

    summary.querySelector('[data-subtotal-label]').textContent = `Subtotal (${count} ${count === 1 ? 'item' : 'items'})`;
    setMoney(summary.querySelector('[data-subtotal]'), totals.subtotal);
    summary.querySelector('[data-delivery-label]').textContent =
      zone === 'local' ? 'Delivery in Sri Lanka' : 'International delivery';

    const deliveryEl = summary.querySelector('[data-delivery]');
    deliveryEl.classList.toggle('is-free', totals.isFree);
    if (totals.isFree) {
      delete deliveryEl.dataset.lkr;
      delete deliveryEl.dataset.usd;
      deliveryEl.textContent = 'Free';
    } else {
      setMoney(deliveryEl, totals.delivery);
    }
    setMoney(summary.querySelector('[data-total]'), totals.total);

    const note = summary.querySelector('[data-delivery-note]');
    const threshold = DELIVERY.local.freeFromLKR;
    if (zone === 'international') {
      note.textContent = `International orders ship for a flat ${formatMoney(priceIn(DELIVERY.international.fee))}.`;
    } else if (totals.isFree) {
      note.textContent = 'Your order qualifies for free delivery in Sri Lanka.';
    } else if (currency === 'LKR') {
      note.textContent = `Add ${formatMoney(threshold - totals.subtotal.LKR, 'LKR')} more for free delivery in Sri Lanka.`;
    } else {
      note.textContent = `Free delivery in Sri Lanka on orders of ${formatMoney(threshold, 'LKR')} and over.`;
    }
  }

  function render() {
    if (!confirmation.hidden) return;
    const isEmpty = cart.length === 0;
    layout.hidden = isEmpty;
    empty.hidden = !isEmpty;
    if (isEmpty) return;
    renderList();
    renderSummary();
  }

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;
    if (action === 'increase') setQuantity(id, item.qty + 1);
    if (action === 'decrease') setQuantity(id, item.qty - 1);
    if (action === 'remove') removeFromCart(id);
  });

  form.elements.country.addEventListener('change', () => {
    paymentNote.hidden = form.elements.country.value !== 'other';
    // The payment rule depends on the country, so re-check it if it's showing an error.
    if (form.querySelector('.payment-group').classList.contains('is-invalid')) {
      showFieldError(form, 'payment', rules.payment(fieldValue(form, 'payment'), form));
    }
    renderSummary();
  });

  revalidateOnEdit(form, rules);
  form.addEventListener('input', () => {
    formError.textContent = '';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateForm(form, rules)) {
      formError.textContent = 'Check the highlighted details, then place your order again.';
      return;
    }
    formError.textContent = '';

    const zone = region();
    const totals = cartTotals(zone);
    const orderNumber = `MH-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
    const order = {
      orderNumber,
      customer: {
        fullName: fieldValue(form, 'fullName'),
        email: fieldValue(form, 'email'),
        phone: fieldValue(form, 'phone'),
        country: form.elements.country.selectedOptions[0].textContent,
        address: fieldValue(form, 'address'),
      },
      paymentMethod: 'Cash on delivery',
      currency,
      items: cart.map((item) => {
        const product = findProduct(item.id);
        return { id: item.id, name: product.name, qty: item.qty, unitPrice: priceIn(product.prices) };
      }),
      subtotal: priceIn(totals.subtotal),
      delivery: priceIn(totals.delivery),
      total: priceIn(totals.total),
      placedAt: new Date().toISOString(),
    };
    console.log('Order placed:', order);

    confirmation.querySelector('[data-order-name]').textContent = order.customer.fullName.split(' ')[0];
    confirmation.querySelector('[data-order-number]').textContent = orderNumber;
    confirmation.querySelector('[data-order-phone]').textContent = order.customer.phone;
    confirmation.hidden = false;
    layout.hidden = true;
    empty.hidden = true;

    form.reset();
    clearCart();
    window.scrollTo({ top: 0 });
    confirmation.focus();
  });

  cartListeners.push(render);
  onCurrencyChange(render);
  render();
}

/* ---------- Tea tours page ---------- */

function todayISO() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function initTourPage() {
  const form = document.getElementById('tour-form');
  if (!form) return;

  const dateInput = form.elements.date;
  const peopleInput = form.elements.people;
  const totalEl = form.querySelector('[data-tour-total]');
  const breakdownEl = form.querySelector('[data-tour-breakdown]');
  const success = form.querySelector('[data-form-success]');
  const stepButtons = form.querySelectorAll('[data-step]');

  dateInput.min = todayISO();

  const peopleCount = () => {
    const n = Number(peopleInput.value);
    return Number.isInteger(n) && n >= 1 && n <= TOUR_MAX_PEOPLE ? n : null;
  };

  const rules = {
    name: requiredText('Enter your name.'),
    email: emailRule,
    phone: phoneRule,
    date: (value) => {
      if (!value) return 'Choose a date for your tour.';
      return value < todayISO() ? 'Choose today or a later date.' : '';
    },
    slot: requiredText('Choose a time slot.'),
    people: () => (peopleCount() ? '' : `Choose between 1 and ${TOUR_MAX_PEOPLE} people.`),
  };

  function updateTotal() {
    const n = peopleCount();
    const perPerson = priceIn(TOUR_PRICE);
    if (n) {
      breakdownEl.textContent = `${n} ${n === 1 ? 'person' : 'people'} × ${formatMoney(perPerson)}`;
      totalEl.textContent = formatMoney(perPerson * n);
    } else {
      breakdownEl.textContent = `Choose 1 to ${TOUR_MAX_PEOPLE} people`;
      totalEl.textContent = '—';
    }
    const current = Number(peopleInput.value) || 0;
    stepButtons.forEach((button) => {
      const step = Number(button.dataset.step);
      button.disabled = step < 0 ? current <= 1 : current >= TOUR_MAX_PEOPLE;
    });
  }

  stepButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const typed = Math.round(Number(peopleInput.value)) || 1;
      const current = Math.max(1, Math.min(TOUR_MAX_PEOPLE, typed));
      const next = Math.max(1, Math.min(TOUR_MAX_PEOPLE, current + Number(button.dataset.step)));
      peopleInput.value = next;
      peopleInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });

  form.addEventListener('input', () => {
    updateTotal();
    success.hidden = true;
  });
  form.addEventListener('change', updateTotal);
  revalidateOnEdit(form, rules);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateForm(form, rules)) return;

    const people = peopleCount();
    const booking = {
      tour: 'Estate & Factory Tour',
      name: fieldValue(form, 'name'),
      email: fieldValue(form, 'email'),
      phone: fieldValue(form, 'phone'),
      date: fieldValue(form, 'date'),
      timeSlot: fieldValue(form, 'slot'),
      people,
      currency,
      total: priceIn(TOUR_PRICE) * people,
    };
    console.log('Tour booking request:', booking);

    form.reset();
    updateTotal();
    showSuccess(success, "Booking request received! We'll confirm by email within 24 hours.");
  });

  onCurrencyChange(updateTotal);
  updateTotal();
}

/* ---------- Contact page ---------- */

function initContactPage() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const success = form.querySelector('[data-form-success]');

  // The shop's wholesale banner links here with ?inquiry=wholesale
  const preset = new URLSearchParams(location.search).get('inquiry');
  const inquiry = form.elements.inquiry;
  if (preset && [...inquiry.options].some((option) => option.value === preset)) {
    inquiry.value = preset;
  }

  const rules = {
    name: requiredText('Enter your name.'),
    email: emailRule,
    inquiry: requiredText('Choose what your message is about.'),
    message: (value) => {
      if (!value) return 'Write your message.';
      return value.length < 10 ? 'Add a little more detail, at least 10 characters.' : '';
    },
  };

  revalidateOnEdit(form, rules);
  form.addEventListener('input', () => {
    success.hidden = true;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateForm(form, rules)) return;

    const message = {
      name: fieldValue(form, 'name'),
      email: fieldValue(form, 'email'),
      inquiryType: inquiry.selectedOptions[0].textContent,
      message: fieldValue(form, 'message'),
      sentAt: new Date().toISOString(),
    };
    console.log('Contact message:', message);

    form.reset();
    showSuccess(success, `Thanks, ${message.name.split(' ')[0]}. Your message is sent, and we'll reply to ${message.email} within one working day.`);
  });
}

/* ---------- Start ---------- */

// Keep the cart and currency in sync across open tabs.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEYS.cart) {
    cart = loadCart();
    updateCartCount();
    cartListeners.forEach((listener) => listener());
  }
  if (event.key === STORAGE_KEYS.currency) {
    currency = loadCurrency();
    applyCurrency();
  }
});

initHeader();
initFeatured();
initShop();
initCartPage();
initTourPage();
initContactPage();
updateCartCount();
applyCurrency();
