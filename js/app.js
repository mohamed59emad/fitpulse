import {
  DAY_PRICES,
  DURATIONS,
  OFFERS,
  PAYMENTS,
  STEPS,
  STATUS,
  dayLabel,
  calcPrices,
  money,
} from "./data.js";
import { loadOrders, saveOrders, loadWebhookUrl, saveWebhookUrl } from "./storage.js";
import { sendWebhook } from "./webhook.js";

const state = {
  route: "home",
  step: 1,
  days: 3,
  durationId: "1",
  offerId: "none",
  name: "",
  phone: "",
  payment: "cash",
  errors: {},
  lastOrder: null,
  adminFilter: "all",
  orders: loadOrders(),
  submitting: false,
  confirmingId: null,
};

const pages = {
  home: document.getElementById("page-home"),
  builder: document.getElementById("page-builder"),
  success: document.getElementById("page-success"),
  admin: document.getElementById("page-admin"),
};

const nav = document.getElementById("main-nav");
const menuToggle = document.getElementById("menu-toggle");
const wizardSteps = document.getElementById("wizard-steps");
const wizardBody = document.getElementById("wizard-body");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");

function routeFromHash() {
  const hash = location.hash.replace("#", "") || "/";
  if (hash.startsWith("/builder")) return "builder";
  if (hash.startsWith("/success")) return "success";
  if (hash.startsWith("/admin")) return "admin";
  return "home";
}

function setRoute(route, extraHash) {
  if (extraHash) {
    location.hash = extraHash;
    return;
  }
  const map = {
    home: "#/",
    builder: "#/builder",
    success: "#/success",
    admin: "#/admin",
  };
  location.hash = map[route] || "#/";
}

function renderRoute() {
  state.route = routeFromHash();
  Object.entries(pages).forEach(([key, el]) => {
    el.hidden = key !== state.route;
  });
  document.body.classList.toggle("admin-mode", state.route === "admin");
  nav.querySelectorAll("a[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === state.route || (state.route === "builder" && a.dataset.nav === "builder"));
  });
  nav.classList.remove("open");

  if (state.route === "builder") renderBuilder();
  if (state.route === "success") renderSuccess();
  if (state.route === "admin") renderAdmin();
  if (state.route === "home" && location.hash === "#offers") {
    document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" });
  }
  updateSummary();
}

function renderBuilder() {
  wizardSteps.innerHTML = STEPS.map(
    (s) =>
      `<button type="button" data-step="${s.id}" class="${state.step === s.id ? "active" : ""}">${s.id}. ${s.title}</button>`
  ).join("");

  btnPrev.disabled = state.step === 1 || state.submitting;
  btnNext.textContent = state.step === 4 ? (state.submitting ? "جاري الإرسال..." : "أرسل طلب الاشتراك") : "التالي";
  btnNext.disabled = state.submitting;
  btnNext.classList.toggle("loading", state.submitting);

  if (state.step === 1) {
    wizardBody.innerHTML = `
      <h2>عدد الأيام في الأسبوع</h2>
      <p class="muted">السعر الشهري بيتحدد حسب الأيام اللي هتيجي فيها.</p>
      <div class="choice-grid">
        ${[1, 2, 3, 4, 5, 6, 7]
          .map(
            (d) => `
          <button type="button" class="choice ${state.days === d ? "selected" : ""}" data-days="${d}">
            ${dayLabel(d)}
            <span class="price">${money(DAY_PRICES[d])}</span>
            <small>شهرياً قبل خصم المدة</small>
          </button>`
          )
          .join("")}
      </div>`;
  }

  if (state.step === 2) {
    wizardBody.innerHTML = `
      <h2>مدة الاشتراك</h2>
      <p class="muted">كل ما المدة تزيد، الخصم يزيد.</p>
      <div class="choice-grid">
        ${DURATIONS.map((d) => {
          const preview = calcPrices({ days: state.days, durationId: d.id, offerId: "none" });
          const off = d.discount ? `خصم ${Math.round(d.discount * 100)}%` : "بدون خصم مدة";
          return `
            <button type="button" class="choice ${state.durationId === d.id ? "selected" : ""}" data-duration="${d.id}">
              ${d.label}
              <span class="price">${money(preview.afterDuration)}</span>
              <small>${off}</small>
            </button>`;
        }).join("")}
      </div>`;
  }

  if (state.step === 3) {
    wizardBody.innerHTML = `
      <h2>الأوفر المناسب</h2>
      <p class="muted">الأوفر يتطبق على السعر بعد خصم المدة.</p>
      <div class="choice-grid">
        ${OFFERS.map((o) => {
          const preview = calcPrices({ days: state.days, durationId: state.durationId, offerId: o.id });
          const off = o.discount ? `خصم ${Math.round(o.discount * 100)}%` : "بدون خصم إضافي";
          return `
            <button type="button" class="choice ${state.offerId === o.id ? "selected" : ""}" data-offer="${o.id}">
              ${o.label}
              <span class="price">${money(preview.total)}</span>
              <small>${off} — ${o.hint}</small>
            </button>`;
        }).join("")}
      </div>`;
  }

  if (state.step === 4) {
    wizardBody.innerHTML = `
      <h2>بياناتك والدفع</h2>
      <div class="form-grid">
        <label>
          الاسم بالكامل
          <input id="f-name" type="text" value="${escapeHtml(state.name)}" placeholder="مثال: محمد عماد" />
          ${state.errors.name ? `<span class="field-error">${state.errors.name}</span>` : ""}
        </label>
        <label>
          رقم الموبايل
          <input id="f-phone" type="tel" value="${escapeHtml(state.phone)}" placeholder="01xxxxxxxxx" />
          ${state.errors.phone ? `<span class="field-error">${state.errors.phone}</span>` : ""}
        </label>
        <div>
          <p style="font-weight:700;margin:0 0 8px">وسيلة الدفع</p>
          <div class="choice-grid">
            ${PAYMENTS.map(
              (p) => `
              <button type="button" class="choice ${state.payment === p.id ? "selected" : ""}" data-pay="${p.id}">
                ${p.label}
              </button>`
            ).join("")}
          </div>
        </div>
      </div>`;
    document.getElementById("f-name").addEventListener("input", (e) => {
      state.name = e.target.value;
      updateSummary();
    });
    document.getElementById("f-phone").addEventListener("input", (e) => {
      state.phone = e.target.value;
      updateSummary();
    });
  }
}

function updateSummary() {
  const { base, total, duration, offer } = calcPrices(state);
  const pay = PAYMENTS.find((p) => p.id === state.payment);
  document.getElementById("sum-days").textContent = dayLabel(state.days);
  document.getElementById("sum-duration").textContent = duration.label;
  document.getElementById("sum-offer").textContent = offer.label;
  document.getElementById("sum-pay").textContent = pay?.label ?? "—";
  document.getElementById("sum-base").textContent = money(base);
  document.getElementById("sum-total").textContent = money(total);
}

function validateCheckout() {
  const errors = {};
  if (!state.name.trim() || state.name.trim().length < 3) {
    errors.name = "اكتب الاسم بالكامل (3 حروف على الأقل)";
  }
  if (!/^01[0-9]{9}$/.test(state.phone.replace(/\s/g, ""))) {
    errors.phone = "رقم موبايل مصري صحيح: 01 ثم 9 أرقام";
  }
  state.errors = errors;
  return Object.keys(errors).length === 0;
}

async function submitOrder() {
  if (state.submitting) return;
  if (!validateCheckout()) {
    renderBuilder();
    updateSummary();
    return;
  }
  const prices = calcPrices(state);
  const order = {
    id: `fp-${Date.now().toString().slice(-6)}`,
    name: state.name.trim(),
    phone: state.phone.replace(/\s/g, ""),
    days: state.days,
    durationId: state.durationId,
    offerId: state.offerId,
    payment: state.payment,
    status: "pending",
    createdAt: new Date().toISOString(),
    total: prices.total,
    base: prices.base,
  };

  state.submitting = true;
  renderBuilder();
  updateSummary();
  showToast("جاري إرسال الطلب إلى n8n...", "loading");

  try {
    const result = await sendWebhook(order, "new_subscription");
    state.orders = [order, ...state.orders];
    saveOrders(state.orders);
    state.lastOrder = order;
    if (result.skipped) {
      showToast("تم حفظ الطلب محلياً — أضف رابط Webhook من لوحة الإدارة", "error");
    } else {
      showToast("تم إرسال طلب الاشتراك بنجاح", "success");
    }
    setRoute("success");
  } catch (err) {
    state.orders = [order, ...state.orders];
    saveOrders(state.orders);
    state.lastOrder = order;
    showToast("تم حفظ الطلب، لكن فشل إرسال Webhook. راجع الرابط في لوحة الإدارة", "error");
    setRoute("success");
  } finally {
    state.submitting = false;
  }
}

function showToast(message, type = "success") {
  const el = document.getElementById("toast");
  el.hidden = false;
  el.className = `toast ${type}`;
  el.textContent = message;
  clearTimeout(showToast._t);
  if (type !== "loading") {
    showToast._t = setTimeout(() => {
      el.hidden = true;
    }, 3200);
  }
}

function resetBuilder() {
  state.step = 1;
  state.days = 3;
  state.durationId = "1";
  state.offerId = "none";
  state.name = "";
  state.phone = "";
  state.payment = "cash";
  state.errors = {};
}

function renderSuccess() {
  const order = state.lastOrder || state.orders[0];
  if (!order) {
    document.getElementById("success-title").textContent = "تم استلام طلبك";
    document.getElementById("success-box").innerHTML = "<p class='muted'>لا يوجد طلب حديث.</p>";
    return;
  }
  const duration = DURATIONS.find((d) => d.id === order.durationId);
  const offer = OFFERS.find((o) => o.id === order.offerId);
  const pay = PAYMENTS.find((p) => p.id === order.payment);
  document.getElementById("success-title").textContent = `تم استلام طلبك يا ${order.name}!`;
  document.getElementById("success-box").innerHTML = `
    <div><span>الأيام</span><strong>${dayLabel(order.days)}</strong></div>
    <div><span>المدة</span><strong>${duration?.label ?? ""}</strong></div>
    <div><span>الأوفر</span><strong>${offer?.label ?? ""}</strong></div>
    <div><span>الدفع</span><strong>${pay?.label ?? ""}</strong></div>
    <div><span>السعر النهائي</span><strong>${money(order.total)}</strong></div>
  `;
}

function renderAdmin() {
  const webhookInput = document.getElementById("webhook-url");
  if (webhookInput && document.activeElement !== webhookInput) {
    webhookInput.value = loadWebhookUrl();
  }

  const orders = state.orders;
  const confirmed = orders.filter((o) => o.status === "confirmed");
  const pending = orders.filter((o) => o.status === "pending");
  const revenue = confirmed.reduce((s, o) => s + o.total, 0);

  document.getElementById("stats-grid").innerHTML = `
    <article class="card stat-card"><span>إيرادات المؤكدة</span><strong>${money(revenue)}</strong></article>
    <article class="card stat-card"><span>اشتراكات مؤكدة</span><strong>${confirmed.length}</strong></article>
    <article class="card stat-card"><span>قيد المراجعة</span><strong>${pending.length}</strong></article>
    <article class="card stat-card"><span>إجمالي الطلبات</span><strong>${orders.length}</strong></article>
  `;

  document.getElementById("pay-chart").innerHTML = pieChart(orders);
  document.getElementById("days-chart").innerHTML = barChart(orders);

  const tabs = [
    ["all", "الكل"],
    ["pending", "قيد المراجعة"],
    ["confirmed", "مؤكد"],
    ["cancelled", "ملغي"],
  ];
  document.getElementById("admin-tabs").innerHTML = tabs
    .map(
      ([id, label]) =>
        `<button type="button" data-filter="${id}" class="${state.adminFilter === id ? "active" : ""}">${label}</button>`
    )
    .join("");

  const filtered =
    state.adminFilter === "all" ? orders : orders.filter((o) => o.status === state.adminFilter);

  if (!filtered.length) {
    document.getElementById("orders-table").innerHTML = `<p class="empty">لا توجد طلبات في هذا التصنيف.</p>`;
    return;
  }

  document.getElementById("orders-table").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>الاسم</th>
          <th>الموبايل</th>
          <th>التاريخ</th>
          <th>الباقة</th>
          <th>الحالة</th>
          <th>الإجمالي</th>
          <th>إجراءات</th>
        </tr>
      </thead>
      <tbody>
        ${filtered
          .map((o) => {
            const duration = DURATIONS.find((d) => d.id === o.durationId);
            const offer = OFFERS.find((x) => x.id === o.offerId);
            const date = new Date(o.createdAt).toLocaleDateString("ar-EG");
            return `
              <tr>
                <td>${escapeHtml(o.name)}</td>
                <td>${escapeHtml(o.phone)}</td>
                <td>${date}</td>
                <td><span class="pkg-badge">${o.days} أيام · ${duration?.label ?? ""} · ${offer?.label ?? ""}</span></td>
                <td><span class="status ${o.status}">${STATUS[o.status]}</span></td>
                <td>${money(o.total)}</td>
                <td>
                  <div class="row-actions">
                    ${
                      o.status !== "confirmed"
                        ? `<button class="btn btn-ok btn-sm ${state.confirmingId === o.id ? "loading" : ""}" data-act="confirm" data-id="${o.id}" ${state.confirmingId === o.id ? "disabled" : ""}>${state.confirmingId === o.id ? "جاري التأكيد..." : "تأكيد الاشتراك"}</button>`
                        : ""
                    }
                    ${
                      o.status !== "cancelled"
                        ? `<button class="btn btn-danger btn-sm" data-act="cancel" data-id="${o.id}">إلغاء</button>`
                        : ""
                    }
                    <button class="btn btn-ghost btn-sm" data-act="delete" data-id="${o.id}">حذف نهائياً</button>
                  </div>
                </td>
              </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
}

function pieChart(orders) {
  const counts = Object.fromEntries(PAYMENTS.map((p) => [p.id, 0]));
  orders.forEach((o) => {
    if (counts[o.payment] != null) counts[o.payment] += 1;
  });
  const total = orders.length || 1;
  const colors = { cash: "#a3e635", vodafone: "#e11d48", instapay: "#38bdf8" };
  let acc = 0;
  const circles = PAYMENTS.map((p) => {
    const value = counts[p.id] / total;
    const dash = value * 100;
    const circle = `<circle pathLength="100" r="16" cx="16" cy="16" fill="transparent" stroke="${colors[p.id]}" stroke-width="8" stroke-dasharray="${dash} ${100 - dash}" stroke-dashoffset="${-acc}"></circle>`;
    acc += dash;
    return circle;
  }).join("");
  const legend = PAYMENTS.map(
    (p) =>
      `<div><span style="color:${colors[p.id]}">●</span> ${p.label}: <b>${counts[p.id]}</b></div>`
  ).join("");
  return `
    <svg viewBox="0 0 32 32" width="140" height="140" style="transform:rotate(-90deg)">
      <circle r="16" cx="16" cy="16" fill="#1a1a1a"></circle>
      ${circles}
    </svg>
    <div class="legend">${legend}</div>`;
}

function barChart(orders) {
  const counts = [1, 2, 3, 4, 5, 6, 7].map((d) => orders.filter((o) => o.days === d).length);
  const max = Math.max(1, ...counts);
  return `<div class="bar-chart">${counts
    .map(
      (c, i) => `
      <div class="bar-col">
        <div class="bar" style="height:${Math.max(8, (c / max) * 140)}px" title="${c}"></div>
        <span>${i + 1}ي<br>${c}</span>
      </div>`
    )
    .join("")}</div>`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

wizardSteps.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-step]");
  if (!btn) return;
  state.step = Number(btn.dataset.step);
  renderBuilder();
  updateSummary();
});

wizardBody.addEventListener("click", (e) => {
  const days = e.target.closest("[data-days]");
  const duration = e.target.closest("[data-duration]");
  const offer = e.target.closest("[data-offer]");
  const pay = e.target.closest("[data-pay]");
  if (days) state.days = Number(days.dataset.days);
  if (duration) state.durationId = duration.dataset.duration;
  if (offer) state.offerId = offer.dataset.offer;
  if (pay) state.payment = pay.dataset.pay;
  if (days || duration || offer || pay) {
    renderBuilder();
    updateSummary();
  }
});

btnPrev.addEventListener("click", () => {
  state.step = Math.max(1, state.step - 1);
  renderBuilder();
  updateSummary();
});

btnNext.addEventListener("click", () => {
  if (state.step === 4) {
    submitOrder();
    return;
  }
  state.step = Math.min(4, state.step + 1);
  renderBuilder();
  updateSummary();
});

document.getElementById("save-webhook").addEventListener("click", () => {
  const url = document.getElementById("webhook-url").value.trim();
  saveWebhookUrl(url);
  showToast(url ? "تم حفظ رابط Webhook" : "تم مسح رابط Webhook", url ? "success" : "error");
});

document.getElementById("book-another").addEventListener("click", () => {
  resetBuilder();
});

document.getElementById("admin-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-filter]");
  if (!btn) return;
  state.adminFilter = btn.dataset.filter;
  renderAdmin();
});

document.getElementById("orders-table").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const { act, id } = btn.dataset;
  if (act === "delete") {
    state.orders = state.orders.filter((o) => o.id !== id);
    saveOrders(state.orders);
    renderAdmin();
    return;
  }
  if (act === "cancel") {
    state.orders = state.orders.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o));
    saveOrders(state.orders);
    renderAdmin();
    return;
  }
  if (act === "confirm") {
    if (state.confirmingId) return;
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    state.confirmingId = id;
    renderAdmin();
    showToast("جاري إرسال تأكيد الاشتراك إلى n8n...", "loading");
    const approved = { ...order, status: "confirmed" };
    try {
      const result = await sendWebhook(approved, "subscription_approved");
      state.orders = state.orders.map((o) => (o.id === id ? approved : o));
      saveOrders(state.orders);
      if (result.skipped) {
        showToast("تم التأكيد محلياً — أضف رابط Webhook أولاً", "error");
      } else {
        showToast("تم تأكيد الاشتراك وإرسال الإشعار", "success");
      }
    } catch {
      state.orders = state.orders.map((o) => (o.id === id ? approved : o));
      saveOrders(state.orders);
      showToast("تم التأكيد، لكن فشل إرسال Webhook", "error");
    } finally {
      state.confirmingId = null;
      renderAdmin();
    }
  }
});

menuToggle.addEventListener("click", () => nav.classList.toggle("open"));

window.addEventListener("hashchange", renderRoute);
renderRoute();
