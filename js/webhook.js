import { DURATIONS, OFFERS, PAYMENTS, dayLabel, NOTIFY_EMAIL, ADMIN_NOTIFY_PHONE } from "./data.js";
import { loadWebhookUrl } from "./storage.js";

export function getWebhookUrl() {
  return loadWebhookUrl().trim();
}

export function orderLabels(order) {
  const duration = DURATIONS.find((d) => d.id === order.durationId);
  const offer = OFFERS.find((o) => o.id === order.offerId);
  const payment = PAYMENTS.find((p) => p.id === order.payment);
  return {
    daysLabel: dayLabel(order.days),
    durationLabel: duration?.label ?? order.durationId,
    offerLabel: offer?.label ?? order.offerId,
    paymentLabel: payment?.label ?? order.payment,
  };
}

export function buildWebhookPayload(order, event) {
  const labels = orderLabels(order);
  const payload = {
    event,
    orderId: order.id,
    fullName: order.name,
    name: order.name,
    mobile: order.phone,
    phone: order.phone,
    email: NOTIFY_EMAIL,
    daysPerWeek: order.days,
    days: labels.daysLabel,
    duration: labels.durationLabel,
    durationId: order.durationId,
    offer: labels.offerLabel,
    offerId: order.offerId,
    paymentMethod: labels.paymentLabel,
    payment: order.payment,
    totalPrice: order.total,
    basePrice: order.base,
    status: order.status,
    timestamp: order.createdAt,
    submittedAt: order.createdAt,
  };

  if (event === "subscription_approved") {
    payload.approvedAt = new Date().toISOString();
    payload.recipientPhone = ADMIN_NOTIFY_PHONE;
    payload.notifyPhone = ADMIN_NOTIFY_PHONE;
  }

  return payload;
}

export async function sendWebhook(order, event) {
  const url = getWebhookUrl();
  if (!url) {
    return { ok: false, skipped: true, error: "missing-url" };
  }

  const payload = buildWebhookPayload(order, event);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook ${response.status}`);
  }
  return { ok: true, skipped: false };
}
