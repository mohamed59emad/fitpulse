import { SEED_ORDERS, DEFAULT_N8N_WEBHOOK_URL } from "./data.js";

const KEY = "fitpulse-orders";
const WEBHOOK_KEY = "fitpulse-n8n-webhook";

export function loadOrders() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED_ORDERS));
      return [...SEED_ORDERS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...SEED_ORDERS];
  } catch {
    return [...SEED_ORDERS];
  }
}

export function saveOrders(orders) {
  localStorage.setItem(KEY, JSON.stringify(orders));
}

export function loadWebhookUrl() {
  const saved = localStorage.getItem(WEBHOOK_KEY);
  if (saved == null) return DEFAULT_N8N_WEBHOOK_URL;
  return saved;
}

export function saveWebhookUrl(url) {
  localStorage.setItem(WEBHOOK_KEY, url.trim());
}
