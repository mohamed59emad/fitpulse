export const DAY_PRICES = {
  1: 100,
  2: 220,
  3: 350,
  4: 450,
  5: 550,
  6: 650,
  7: 750,
};

export const DURATIONS = [
  { id: "1", label: "شهر واحد", months: 1, discount: 0 },
  { id: "3", label: "3 شهور", months: 3, discount: 0.1 },
  { id: "6", label: "6 شهور", months: 6, discount: 0.18 },
  { id: "12", label: "سنة", months: 12, discount: 0.25 },
];

export const OFFERS = [
  { id: "none", label: "بدون أوفر", discount: 0, hint: "السعر بعد خصم المدة فقط" },
  { id: "opening", label: "عرض الافتتاح", discount: 0.2, hint: "خصم 20% للمشتركين الجدد" },
  { id: "crew", label: "عرض الشلة", discount: 0.1, hint: "خصم 10% للاشتراك الجماعي" },
  { id: "student", label: "عرض الطلبة", discount: 0.1, hint: "خصم 10% بإثبات قيد" },
  { id: "morning", label: "عرض الصباح", discount: 0.15, hint: "خصم 15% قبل 12 الظهر" },
];

export const PAYMENTS = [
  { id: "cash", label: "كاش في الاستقبال" },
  { id: "vodafone", label: "فودافون كاش" },
  { id: "instapay", label: "انستاباي" },
];

export const STEPS = [
  { id: 1, title: "عدد الأيام" },
  { id: 2, title: "مدة الاشتراك" },
  { id: 3, title: "الأوفر المناسب" },
  { id: 4, title: "بياناتك والدفع" },
];

export const STATUS = {
  pending: "قيد المراجعة",
  confirmed: "مؤكد",
  cancelled: "ملغي",
};

/** Paste your n8n Production/Test Webhook URL here, or set it from لوحة الإدارة. */
export const DEFAULT_N8N_WEBHOOK_URL = "";

export const NOTIFY_EMAIL = "592005m9hamed@gmail.com";
export const ADMIN_NOTIFY_PHONE = "+201029492773";

export function dayLabel(days) {
  if (days === 1) return "يوم واحد / أسبوع";
  if (days === 2) return "يومان / أسبوع";
  return `${days} أيام / أسبوع`;
}

export function calcPrices({ days, durationId, offerId }) {
  const duration = DURATIONS.find((d) => d.id === durationId) ?? DURATIONS[0];
  const offer = OFFERS.find((o) => o.id === offerId) ?? OFFERS[0];
  const monthly = DAY_PRICES[days] ?? 0;
  const base = monthly * duration.months;
  const afterDuration = Math.round(base * (1 - duration.discount));
  const total = Math.round(afterDuration * (1 - offer.discount));
  return { monthly, base, afterDuration, total, duration, offer };
}

export function money(n) {
  return `${Number(n).toLocaleString("ar-EG")} ج.م`;
}

export const SEED_ORDERS = [
  {
    id: "fp-1001",
    name: "أحمد محمد",
    phone: "01012345678",
    days: 3,
    durationId: "3",
    offerId: "opening",
    payment: "cash",
    status: "confirmed",
    createdAt: "2026-09-10T10:00:00.000Z",
    total: 756,
    base: 1050,
  },
  {
    id: "fp-1002",
    name: "سارة علي",
    phone: "01123456789",
    days: 5,
    durationId: "1",
    offerId: "morning",
    payment: "vodafone",
    status: "pending",
    createdAt: "2026-09-15T14:20:00.000Z",
    total: 468,
    base: 550,
  },
  {
    id: "fp-1003",
    name: "محمود حسن",
    phone: "01234567890",
    days: 7,
    durationId: "12",
    offerId: "student",
    payment: "instapay",
    status: "confirmed",
    createdAt: "2026-08-22T09:10:00.000Z",
    total: 6075,
    base: 9000,
  },
  {
    id: "fp-1004",
    name: "نورا إبراهيم",
    phone: "01555551234",
    days: 2,
    durationId: "6",
    offerId: "crew",
    payment: "cash",
    status: "cancelled",
    createdAt: "2026-09-01T18:40:00.000Z",
    total: 974,
    base: 1320,
  },
];
