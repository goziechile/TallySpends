// ─────────────────────────────────────────────────────────────────────────────
// TallySpends – paste into src/App.jsx (or src/App.tsx – rename the file)
// Requires: React 18+   No other dependencies needed.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Food", "Transport", "Shopping", "Bills",
  "Health", "Entertainment", "Education", "Other",
];
const CAT = {
 Food: { icon: "🍔", color: "#EF4444",  bg: "#FEF2F2" },
Transport: { icon: "🚗", color: "#0EA5E9", bg: "#F0F9FF" },
Shopping: { icon: "🛍️", color: "#8B5CF6", bg:"#F5F3FF" },
Bills: { icon: "💡", color: "#F59E0B", bg:"#FFFBEB" },
Health: { icon: "🏥", color: "#EC4899",  bg: "#FDF2F8" },
Entertainment: { icon: "🎬", color: "#10B981",  bg: "#ECFDF5" },
Education: { icon: "📚", color: "#6366F1", bg: "#EEF2FF"  },
Other: { icon: "📦", color: "#6B7280", bg: "#F9FAFB" }
};
const SUBCATS = {
  Food:          ["Groceries", "Dining Out", "Snacks", "Coffee", "Drinks", "Other"],
  Transport:     ["Fuel", "Bus/Keke", "Uber/Bolt", "Parking", "Maintenance", "Other"],
  Shopping:      ["Clothing", "Electronics", "Home", "Beauty", "Gifts", "Other"],
  Bills:         ["Electricity", "Internet", "Rent", "Water", "Phone", "Other"],
  Health:        ["Pharmacy", "Hospital", "Gym", "Vitamins", "Other"],
  Entertainment: ["Movies", "Music", "Games", "Events", "Subscriptions", "Other"],
  Education:     ["Books", "Courses", "School Fees", "Stationery", "Other"],
  Other:         ["Miscellaneous", "Other"],
};
const CURRENCIES = [
  { code: "NGN", symbol: "₦",   name: "Nigerian Naira",    locale: "en-NG" },
  { code: "USD", symbol: "$",   name: "US Dollar",          locale: "en-US" },
  { code: "EUR", symbol: "€",   name: "Euro",               locale: "de-DE" },
  { code: "GBP", symbol: "£",   name: "British Pound",      locale: "en-GB" },
  { code: "GHS", symbol: "₵",   name: "Ghanaian Cedi",      locale: "en-GH" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling",    locale: "en-KE" },
  { code: "ZAR", symbol: "R",   name: "South African Rand", locale: "en-ZA" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar",    locale: "en-CA" },
];
const LOGO_LIGHT = "/img/TallySpends-logo-white.jpeg";
const LOGO_DARK = "/img/TallySpends-logo-black.jpeg";

const QUICK_AMTS = [500, 1000, 2000, 5000, 10000];
const NOTIF_MSGS = [
  "Track your spending today. ",
  "Where did your money go today?",
  "Before the day ends, log your spending.",
  "Quick check — did you spend today?",
  "A minute to tally keeps regret away.",
];
const PAGES = {
  HOME: "home",
  HISTORY: "history",
  INSIGHTS: "insights",
  SETTINGS: "settings",
};
const DEFAULT_SETTINGS = {
  name: "",
  dailyBudget: 0,
  currencyCode: "NGN",
  theme: "light",
  recurringEnabled: true,
};
// ─────────────────────────────────────────────────────────────────────────────
// THEME TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: "#F5F4F0",
  card: "#FFFFFF",
  surface: "#FAFAF8",
  border: "#E8E8E4",
  text: "#1A1A1A",
  sub: "#888888",
  muted: "#BBBBBB",
  divider: "#F0EFEC",
  hero: "#1A1A1A",
  heroText: "#FFFFFF",
  heroSub: "#666666",
  input: "#FFFFFF",
  inputBg: "#F9F9F7",
  pill: "#F0EFEC",
  pillText: "#555555",
  danger: "#FEF2F2",
  dangerBorder: "#FECACA",
  dangerText: "#F87171",
  success: "#10B981",
  info: "#F0F9FF",
  infoBorder: "#BAE6FD",
  infoText: "#0369A1",
};
const DARK = {
  bg: "#0F0F0F",
  card: "#1C1C1E",
  surface: "#141414",
  border: "#2C2C2E",
  text: "#F2F2F7",
  sub: "#8E8E93",
  muted: "#48484A",
  divider: "#2C2C2E",
  hero: "#1C1C1E",
  heroText: "#F2F2F7",
  heroSub: "#48484A",
  input: "#1C1C1E",
  inputBg: "#2C2C2E",
  pill: "#2C2C2E",
  pillText: "#EBEBF5",
  danger: "#2D1B1B",
  dangerBorder: "#7F1D1D",
  dangerText: "#F87171",
  success: "#10B981",
  info: "#0C1F2D",
  infoBorder: "#164E63",
  infoText: "#38BDF8",
};
// ─────────────────────────────────────────────────────────────────────────────
// STORAGE  (IndexedDB primary · localStorage fallback)
// ─────────────────────────────────────────────────────────────────────────────
function lsLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
}
  }
function lsSave(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
const idb = (() => {
  let db = null;
  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open("tallyspends_v4", 2);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains("expenses"))
          d.createObjectStore("expenses", { keyPath: "id" });
        if (!d.objectStoreNames.contains("recurring"))
          d.createObjectStore("recurring", { keyPath: "id" });
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror   = () => reject(req.error);
    });
  }
  async function getAll(store) {
    try {
      const d = await openDB();
      return new Promise((resolve, reject) => {
        const req = d.transaction(store, "readonly").objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror   = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }
  async function putAll(items, store) {
    try {
      const d = await openDB();
      return new Promise((resolve, reject) => {
        const tx = d.transaction(store, "readwrite");
        const s  = tx.objectStore(store);
        s.clear();
        items.forEach((item) => s.put(item));
        tx.oncomplete = resolve;
        tx.onerror    = () => reject(tx.error);
      });
    } catch { /* silent */ }
  }
  return { getAll, putAll };
})();
// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const todayKey   = () => new Date().toISOString().split("T")[0];
const weekStart  = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
};
const monthStart = () => new Date().toISOString().slice(0, 7) + "-01";
const getCur     = (code) => CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
function fmt(n, code) {
  const cur = getCur(code || "NGN");
  return cur.symbol + Number(n).toLocaleString(cur.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
function fmtDate(d) {
  const today = todayKey();
  const yest  = new Date();
  yest.setDate(yest.getDate() - 1);
  const yesterdayKey = yest.toISOString().split("T")[0];
  if (d === today)        return "Today";
  if (d === yesterdayKey) return "Yesterday";
  return new Date(d + "T00:00:00").toLocaleDateString("en-NG", {
    weekday: "short", month: "short", day: "numeric",
  });
}
function calcStreak(expenses) {
  const dates = [...new Set(expenses.map((e) => e.date))].sort((a, b) => b.localeCompare(a));
  if (!dates.length) return 0;
  let streak = 0;
  const cur = new Date();
  for (let i = 0; i < 90; i++) {
    const k = cur.toISOString().split("T")[0];
    if (dates.includes(k)) streak++;
    else if (i > 0) break;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}
function cleanAmt(str) {
  const s = str.replace(/[^0-9.]/g, "");
  const parts = s.split(".");
  return parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : s;
}
function scheduleNotifs() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const key  = todayKey();
  const sent = lsLoad("ts_notif", {});
  const ts   = sent[key] || {};
  const now  = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  [
    { id: "am",  t: 10 * 60 },
    { id: "pm3", t: 15 * 60 },
    { id: "pm9", t: 21 * 60 },
  ].forEach(({ id, t }) => {
    if (ts[id] || t - mins <= 0) return;
    setTimeout(() => {
      new Notification("TallySpends ", {
        body: NOTIF_MSGS[Math.floor(Math.random() * NOTIF_MSGS.length)],
      });
      const fresh = lsLoad("ts_notif", {});
      fresh[key] = { ...(fresh[key] || {}), [id]: true };
      lsSave("ts_notif", fresh);
    }, (t - mins) * 60000);
  });
}
function injectRecurring(expenses, recurring) {
  const today = todayKey();
  const added = [];
  recurring.forEach((r) => {
    if (!r.active) return;
    const alreadyToday = expenses.some(
      (e) => e.recurringId === r.id && e.date === today
    );
    if (alreadyToday) return;
    const past = expenses
      .filter((e) => e.recurringId === r.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const lastAdded = past[0] || null;
    let shouldAdd = false;
    if (r.freq === "daily") {
      shouldAdd = true;
    } else if (r.freq === "weekly") {
      const lastDate = lastAdded ? new Date(lastAdded.date + "T00:00:00") : null;
      shouldAdd = !lastDate || Date.now() - lastDate.getTime() >= 6.5 * 86400000;
    } else if (r.freq === "monthly") {
      shouldAdd = new Date().getDate() === r.dayOfMonth;
      if (shouldAdd && lastAdded && lastAdded.date.slice(0, 7) === today.slice(0, 7)) {
        shouldAdd = false;
      }
    }
    if (shouldAdd) {
      added.push({
        id: Date.now() + Math.random(),
        amount: r.amount,
        category: r.category,
        subcat: r.subcat || "",
        note: r.name,
        tags: ["recurring"],
        date: today,
        recurringId: r.id,
        photo: null,
      });
    }
  });
  return added;
}
// ─────────────────────────────────────────────────────────────────────────────
// THEME HOOK
// ─────────────────────────────────────────────────────────────────────────────
function useTheme(settings) {
  const isDark = settings.theme === "dark";
  const T = isDark ? DARK : LIGHT;
  useEffect(() => {
    document.body.style.background = T.bg;
    document.body.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark, T.bg]);
  return { T, isDark };
}
// ─────────────────────────────────────────────────────────────────────────────
// SMALL SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function SectionLabel({ children, T, style }) {
  return (
    <p
      style={{
        margin: "0 0 8px",
        font: "500 11px/1 'DM Sans',sans-serif",
        color: T.muted,
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        ...style,
      }}
    >
      {children}
    </p>
  );
}
function Card({ children, T, style }) {
  return (
    <div
      style={{
        background: T.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  });
  const bg =
    type === "error"   ? "#EF4444" :
    type === "success" ? "#10B981" : "#1A1A1A";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 90,
        left: "50%",
        transform: "translateX(-50%)",
        background: bg,
        color: "#fff",
        borderRadius: 12,
        padding: "12px 20px",
        font: "500 14px/1 'DM Sans',sans-serif",
        zIndex: 9999,
        whiteSpace: "nowrap",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        animation: "ts_fadeUp 0.25s ease",
        pointerEvents: "none",
      }}
    >
      {msg}
    </div>
  );
}
function ConfirmSheet({ title, msg, confirmLabel, danger, onConfirm, onCancel, T }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onCancel}
        style={{ flex: 1, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      />
      <div
        style={{
          background: T.surface,
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 48px",
          animation: "ts_slideUp 0.25s ease",
        }}
      >
        <p style={{ margin: "0 0 8px", font: "700 18px/1.3 'Georgia',serif", color: T.text }}>
          {title || "Are you sure?"}
        </p>
        <p style={{ margin: "0 0 24px", font: "400 14px/1.5 'DM Sans',sans-serif", color: T.sub }}>
          {msg}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, background: T.pill, border: "none", borderRadius: 12,
              padding: 14, font: "600 15px/1 'DM Sans',sans-serif",
              color: T.pillText, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: danger ? "#EF4444" : "#1A1A1A",
              border: "none", borderRadius: 12, padding: 14,
              font: "600 15px/1 'DM Sans',sans-serif", color: "#fff", cursor: "pointer",
            }}
          >
            {confirmLabel || "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
function BudgetBar({ spent, budget, currency, T }) {
  if (!budget) return null;
  const pct   = Math.min((spent / budget) * 100, 100);
  const over  = spent > budget;
  const color = over ? "#EF4444" : pct > 80 ? "#F59E0B" : "#10B981";
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ font: "500 11px/1 'DM Sans',sans-serif", color: over ? "#F87171" : "rgba(255,255,255,0.5)" }}>
          {over
            ? " Over by " + fmt(spent - budget, currency)
            : Math.round(pct) + "% of daily budget"}
        </span>
        <span style={{ font: "500 11px/1 'DM Sans',sans-serif", color: "rgba(255,255,255,0.4)" }}>
          {fmt(budget, currency)}
        </span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 99 }}>
        <div
          style={{
            height: "100%",
            width: pct + "%",
            background: color,
            borderRadius: 99,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// CHARTS
// ─────────────────────────────────────────────────────────────────────────────
function DonutChart({ data, total }) {
  const size  = 120;
  const r     = 46;
  const sw    = 16;
  const circ  = 2 * Math.PI * r;
  let off     = 0;
  const slices = data.map((x) => {
    const dash = total ? (x.amount / total) * circ : 0;
    const slice = { ...x, dash, off };
    off += dash;
    return slice;
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox={"0 0 " + size + " " + size}
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle cx={60} cy={60} r={r} fill="none" stroke="#E5E5E0" strokeWidth={sw} />
      {slices.map((s) => (
        <circle
          key={s.cat}
          cx={60} cy={60} r={r}
          fill="none"
          stroke={(CAT[s.cat] && CAT[s.cat].color) || "#ccc"}
          strokeWidth={sw}
          strokeDasharray={s.dash + " " + (circ - s.dash)}
          strokeDashoffset={-s.off}
          strokeLinecap="round"
          style={{ transition: "all 0.6s ease" }}
        />
      ))}
    </svg>
  );
}
function LineChart({ data, currency, color, T }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const lineColor = color || "#1A1A1A";
  const W = 300, H = 80, pad = 8;
  if (!data.length || data.every((d) => d.total === 0)) {
    return (
      <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ font: "400 13px/1 'DM Sans',sans-serif", color: T.muted, margin: 0 }}>
          No data yet
        </p>
      </div>
    );
  }
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const pts = data.map((d, i) => ({
    ...d,
    x: pad + i * (W - pad * 2) / (data.length - 1 || 1),
    y: H - pad - (d.total / maxVal) * (H - pad * 2),
  }));
  const pathD  = pts.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
  const areaD  = pathD
    + " L" + pts[pts.length - 1].x.toFixed(1) + "," + (H - pad)
    + " L" + pts[0].x.toFixed(1) + "," + (H - pad) + " Z";
  const gradId = "ts_grad_" + lineColor.replace("#", "");
  const labelPts = [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]].filter(Boolean);
  return (
    <div style={{ position: "relative" }}>
      <svg width="100%" viewBox={"0 0 " + W + " " + H} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lineColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0"    />
          </linearGradient>
        </defs>
        <path d={areaD} fill={"url(#" + gradId + ")"} />
        <path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoverIdx === i ? 5 : 3}
            fill={hoverIdx === i ? lineColor : T.card}
            stroke={lineColor}
            strokeWidth={2}
            style={{ cursor: "pointer", transition: "r 0.15s" }}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            onTouchStart={() => setHoverIdx(i)}
            onTouchEnd={() => setTimeout(() => setHoverIdx(null), 1400)}
          />
        ))}
      </svg>
      {hoverIdx !== null && pts[hoverIdx] && (
        <div
          style={{
            position: "absolute",
            top: Math.max(0, pts[hoverIdx].y - 42),
            left: Math.min((pts[hoverIdx].x / W) * 100, 72) + "%",
            background: T.text,
            color: T.bg,
            borderRadius: 8,
            padding: "5px 10px",
            font: "600 12px/1.4 'DM Sans',sans-serif",
            pointerEvents: "none",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          {fmt(pts[hoverIdx].total, currency)}
          <br />
          <span style={{ font: "400 10px/1 'DM Sans',sans-serif", color: T.muted }}>
            {pts[hoverIdx].label}
          </span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {labelPts.map((p, i) => (
          <span key={i} style={{ font: "400 10px/1 'DM Sans',sans-serif", color: T.muted }}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// NAV BAR
// ─────────────────────────────────────────────────────────────────────────────
function NavBar({ page, setPage, T }) {
  const tabs = [
    { id: PAGES.HOME, icon: "🏠", label: "Home" },
{ id: PAGES.INSIGHTS, icon: "📊", label: "Insights" },
{ id: PAGES.HISTORY, icon: "📜", label: "History" },
{ id: PAGES.SETTINGS, icon: "⚙️", label: "Settings" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        background: T.surface,
        backdropFilter: "blur(16px)",
        borderTop: "1px solid " + T.border,
        display: "flex",
        zIndex: 90,
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setPage(tab.id)}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "10px 0 13px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          <span
            style={{
              fontSize: 20,
              opacity: page === tab.id ? 1 : 0.3,
              transition: "all 0.2s",
              transform: page === tab.id ? "scale(1.12)" : "scale(1)",
              display: "block",
            }}
          >
            {tab.icon}
          </span>
          <span
            style={{
              font: (page === tab.id ? "700" : "400") + " 10px/1 'DM Sans',sans-serif",
              color: page === tab.id ? T.text : T.muted,
            }}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// EXPENSE ROW
// ─────────────────────────────────────────────────────────────────────────────
function ExpenseRow({ expense, onEdit, onDelete, currency, T }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cat = CAT[expense.category] || CAT.Other;
  const isRecurring = expense.tags && expense.tags.includes("recurring");
  const visibleTags = (expense.tags || []).filter((t) => t !== "recurring");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 0",
        borderBottom: "1px solid " + T.divider,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: cat.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 19,
          flexShrink: 0,
          position: "relative",
        }}
      >
        {cat.icon}
        {isRecurring && (
          <span style={{ position: "absolute", bottom: -3, right: -3, fontSize: 10 }}>
            🔄
          </span>
        )}
      </div>
      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
          <p
            style={{
              margin: 0,
              font: "500 14px/1 'DM Sans',sans-serif",
              color: T.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {expense.note || expense.subcat || expense.category}
          </p>
          {expense.photo && <span style={{ fontSize: 11, flexShrink: 0 }}>📷</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <p style={{ margin: 0, font: "400 12px/1 'DM Sans',sans-serif", color: T.muted }}>
            {expense.subcat || expense.category}
          </p>
          {visibleTags.map((t) => (
            <span
              key={t}
              style={{
                background: T.pill,
                borderRadius: 4,
                padding: "1px 5px",
                font: "400 10px/1 'DM Sans',sans-serif",
                color: T.sub,
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      </div>
      {/* Amount */}
      <p style={{ margin: 0, font: "600 15px/1 'Georgia',serif", color: T.text, flexShrink: 0 }}>
        {fmt(expense.amount, currency)}
      </p>
      {/* Menu */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: T.muted,
            fontSize: 20,
            padding: "4px 6px",
            lineHeight: 1,
          }}
        >
⋮
        </button>
        {menuOpen && (
          <>
            <div
              onClick={() => setMenuOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 9 }}
            />
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 28,
                background: T.card,
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                zIndex: 10,
                overflow: "hidden",
                minWidth: 120,
              }}
            >
              <button
                onClick={() => { setMenuOpen(false); onEdit(expense); }}
                style={{
                  display: "block", width: "100%", background: "none", border: "none",
                  padding: "11px 16px", font: "500 13px/1 'DM Sans',sans-serif",
                  color: T.text, cursor: "pointer", textAlign: "left",
                }}
              >
 Edit
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(expense.id); }}
                style={{
                  display: "block", width: "100%", background: "none", border: "none",
                  padding: "11px 16px", font: "500 13px/1 'DM Sans',sans-serif",
                  color: "#EF4444", cursor: "pointer", textAlign: "left",
                }}
              >
 Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// EXPENSE SHEET  (Add / Edit)
// ─────────────────────────────────────────────────────────────────────────────
function ExpenseSheet({ expense, onSave, onClose, currency, T }) {
  const editing   = !!expense;
  const [amount,   setAmount]   = useState(editing ? String(expense.amount) : "");
  const [category, setCategory] = useState(editing ? expense.category : "Food");
  const [subcat,   setSubcat]   = useState(editing ? expense.subcat || "" : "");
  const [note,     setNote]     = useState(editing ? expense.note || "" : "");
  const [date,     setDate]     = useState(editing ? expense.date : todayKey());
  const [photo,    setPhoto]    = useState(editing ? expense.photo || null : null);
  const [tags,     setTags]     = useState(
    editing ? (expense.tags || []).filter((t) => t !== "recurring") : []
  );
  const [tagInput, setTagInput] = useState("");
  const [errors,   setErrors]   = useState({});
  const [shake,    setShake]    = useState(false);
  const photoRef = useRef(null);
  const cur = getCur(currency);
  function validate() {
    const errs = {};
    const val  = parseFloat(String(amount).replace(/,/g, ""));
    if (!val || val <= 0)   errs.amount = "Enter a valid amount";
    else if (val > 1e8)     errs.amount = "Amount is too large";
    if (date > todayKey())  errs.date   = "Cannot log a future date";
    return errs;
  }
  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    const val = parseFloat(String(amount).replace(/,/g, ""));
    onSave({
      ...(expense || {}),
      id:       expense ? expense.id : Date.now(),
      amount:   val,
      category,
      subcat,
      note:     note.trim(),
      tags,
      date,
      photo,
    });
  }
  function handlePhoto(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  }
  function handleTagKey(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const t = tagInput.trim().replace(/,$/, "").toLowerCase();
      if (t && !tags.includes(t) && tags.length < 5) {
        setTags((prev) => [...prev, t]);
        setTagInput("");
      }
    }
  }
  const inputBase = {
    width: "100%",
    boxSizing: "border-box",
    border: "2px solid " + T.border,
    borderRadius: 12,
    padding: "11px 14px",
    font: "400 14px/1.4 'DM Sans',sans-serif",
    color: T.text,
    background: T.input,
    outline: "none",
  };
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        style={{ flex: 1, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      />
      <div
        style={{
          background: T.surface,
          borderRadius: "24px 24px 0 0",
          padding: "24px 24px 44px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
          animation: "ts_slideUp 0.28s cubic-bezier(.32,1.1,.68,1)",
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ font: "700 19px/1 'Georgia',serif", color: T.text, margin: 0 }}>
            {editing ? "Edit Expense" : "Log Expense"}
          </p>
          <button
            onClick={onClose}
            style={{
              background: T.pill, border: "none", borderRadius: "50%",
              width: 32, height: 32, fontSize: 18, cursor: "pointer",
              color: T.sub, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
×
          </button>
        </div>
        {/* Amount */}
        <SectionLabel T={T}>Amount</SectionLabel>
        <div
          style={{
            border: "2px solid " + (errors.amount ? "#EF4444" : T.border),
            borderRadius: 14,
            padding: "10px 16px",
            marginBottom: errors.amount ? 4 : 10,
            background: T.input,
            animation: shake ? "ts_shake 0.4s" : "none",
            display: "flex",
            alignItems: "center",
            transition: "border 0.2s",
          }}
        >
          <span style={{ font: "600 22px/1 'Georgia',serif", color: "#C0A060", marginRight: 6 }}>
            {cur.symbol}
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            autoFocus
            onChange={(e) => {
              setAmount(cleanAmt(e.target.value));
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: null }));
            }}
            style={{
              border: "none", outline: "none",
              font: "600 28px/1 'Georgia',serif",
              color: T.text, background: "transparent", flex: 1, minWidth: 0,
            }}
          />
        </div>
        {errors.amount && (
          <p style={{ margin: "0 0 10px", font: "400 12px/1 'DM Sans',sans-serif", color: "#EF4444" }}>
            {errors.amount}
          </p>
        )}
        {/* Quick amounts */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, overflowX: "auto", paddingBottom: 2 }}>
          {QUICK_AMTS.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              style={{
                flexShrink: 0,
                background: String(amount) === String(q) ? T.text : T.pill,
                color:      String(amount) === String(q) ? T.bg   : T.pillText,
                border: "none", borderRadius: 8, padding: "6px 12px",
                font: "500 12px/1 'DM Sans',sans-serif", cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              +{cur.symbol}{Number(q).toLocaleString()}
            </button>
          ))}
        </div>
        {/* Category */}
        <SectionLabel T={T}>Category</SectionLabel>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
          {CATEGORIES.map((cat) => {
            const c = CAT[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setSubcat(""); }}
                style={{
                  border: "2px solid " + (active ? c.color : T.border),
                  borderRadius: 50,
                  padding: "7px 13px",
                  background: active ? c.bg : T.input,
                  font: (active ? "600" : "400") + " 13px/1 'DM Sans',sans-serif",
                  color: active ? c.color : T.sub,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {c.icon} {cat}
              </button>
            );
          })}
        </div>
        {/* Sub-category */}
        <SectionLabel T={T}>
          Sub-category{" "}
          <span style={{ textTransform: "none", fontWeight: 400, color: T.muted }}>(optional)</span>
        </SectionLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {(SUBCATS[category] || []).map((s) => {
            const active = subcat === s;
            return (
              <button
                key={s}
                onClick={() => setSubcat(active ? "" : s)}
                style={{
                  border: "2px solid " + (active ? T.text : T.border),
                  borderRadius: 50,
                  padding: "5px 11px",
                  background: active ? T.text : T.input,
                  font: (active ? "600" : "400") + " 12px/1 'DM Sans',sans-serif",
                  color: active ? T.surface : T.sub,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
        {/* Note */}
        <SectionLabel T={T}>
          Note{" "}
          <span style={{ textTransform: "none", fontWeight: 400, color: T.muted }}>(optional)</span>
        </SectionLabel>
        <input
          type="text"
          placeholder="e.g. Lunch at Chicken Republic"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
          style={{ ...inputBase, marginBottom: 16 }}
        />
        {/* Tags */}
        <SectionLabel T={T}>
          Tags{" "}
          <span style={{ textTransform: "none", fontWeight: 400, color: T.muted }}>
            (Enter to add · max 5)
          </span>
        </SectionLabel>
        <div
          style={{
            border: "2px solid " + T.border,
            borderRadius: 12,
            padding: "8px 12px",
            background: T.input,
            marginBottom: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            alignItems: "center",
          }}
        >
          {tags.map((t) => (
            <span
              key={t}
              style={{
                background: T.pill, borderRadius: 6, padding: "4px 8px",
                font: "500 12px/1 'DM Sans',sans-serif", color: T.pillText,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              #{t}
              <button
                onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 0, fontSize: 14, lineHeight: 1 }}
              >
×
              </button>
            </span>
          ))}
          {tags.length < 5 && (
            <input
              type="text"
              placeholder={tags.length === 0 ? "e.g. work, weekend…" : "Add tag"}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
              style={{
                border: "none", outline: "none",
                font: "400 13px/1 'DM Sans',sans-serif",
                color: T.text, background: "transparent",
                flex: "1 0 80px", minWidth: 60,
              }}
            />
          )}
        </div>
        {/* Date */}
        <SectionLabel T={T}>Date</SectionLabel>
        <input
          type="date"
          value={date}
          max={todayKey()}
          onChange={(e) => {
            setDate(e.target.value);
            if (errors.date) setErrors((prev) => ({ ...prev, date: null }));
          }}
          style={{ ...inputBase, marginBottom: errors.date ? 4 : 16 }}
        />
        {errors.date && (
          <p style={{ margin: "0 0 14px", font: "400 12px/1 'DM Sans',sans-serif", color: "#EF4444" }}>
            {errors.date}
          </p>
        )}
        {/* Receipt photo */}
        <SectionLabel T={T}>
          Receipt Photo{" "}
          <span style={{ textTransform: "none", fontWeight: 400, color: T.muted }}>(optional)</span>
        </SectionLabel>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          style={{ display: "none" }}
        />
        {photo ? (
          <div style={{ position: "relative", marginBottom: 20 }}>
            <img
              src={photo}
              alt="receipt"
              style={{
                width: "100%", borderRadius: 12, maxHeight: 160,
                objectFit: "cover", border: "2px solid " + T.border,
              }}
            />
            <button
              onClick={() => setPhoto(null)}
              style={{
                position: "absolute", top: 8, right: 8,
                background: "rgba(0,0,0,0.6)", border: "none",
                borderRadius: "50%", width: 28, height: 28,
                color: "#fff", fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
×
            </button>
          </div>
        ) : (
          <button
            onClick={() => photoRef.current && photoRef.current.click()}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: T.pill, border: "2px dashed " + T.border,
              borderRadius: 12, padding: "12px 16px",
              font: "500 13px/1 'DM Sans',sans-serif", color: T.sub,
              cursor: "pointer", width: "100%", marginBottom: 20,
              boxSizing: "border-box",
            }}
          >
 Take / Upload Receipt Photo
          </button>
        )}
        {/* Save */}
        <button
          onClick={handleSave}
          style={{
            width: "100%", background: T.text, color: T.bg,
            border: "none", borderRadius: 14, padding: 16,
            font: "600 16px/1 'DM Sans',sans-serif", cursor: "pointer",
          }}
        >
          {editing ? "Save Changes" : "Save Expense"}
        </button>
      </div>
    </div>
  );
}

function MonthlySummary({ expenses, currency, T }) {
  // Get this month's expenses
  const thisMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2025-03"
  // Get last month's key
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthKey = lastMonthDate.toISOString().slice(0, 7);
  // Filter expenses by month
  const thisMonthExp = expenses.filter((e) => e.date.startsWith(thisMonthKey));
  const lastMonthExp = expenses.filter((e) => e.date.startsWith(lastMonthKey));
  // Calculate totals
  const thisTotal = thisMonthExp.reduce((s, e) => s + e.amount, 0);
  const lastTotal = lastMonthExp.reduce((s, e) => s + e.amount, 0);
  // Don't show if no data this month
  if (thisTotal === 0) return null;
  // Find the top spending category this month
  const catTotals = {};
  thisMonthExp.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const topCatName = topCat ? topCat[0] : null;
  const topCatPct = topCat ? Math.round((topCat[1] / thisTotal) * 100) : 0;
  const topCatIcon = topCatName && CAT[topCatName] ? CAT[topCatName].icon : "";
  // Calculate month-over-month change
  let vsLastMonth = null;
  if (lastTotal > 0) {
  }
    vsLastMonth = Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
  const monthName = new Date().toLocaleString("en-NG", { month: "long" });
  const isUp = vsLastMonth > 0;
  return (
    <div
      style={{
        background: T.card,
        borderRadius: 18,
        padding: "18px 20px",
        marginBottom: 14,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        animation: "ts_fadeIn 0.4s ease",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>
        <p style={{
          margin: 0,
          font: "600 13px/1 'DM Sans',sans-serif",
          color: T.sub,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}>
          {monthName} Summary
        </p>
        </span>
      </div>
      {/* Main stat */}
      <p style={{
        margin: "0 0 4px",
        font: "700 22px/1 'Georgia',serif",
        color: T.text,
      }}>
        You spent {fmt(thisTotal, currency)} this month
      </p>
      {/* Insight lines */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Top category line */}
        {topCatName && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: CAT[topCatName] ? CAT[topCatName].color : T.muted,
              flexShrink: 0,
            }} />
            <p style={{ margin: 0, font: "400 13px/1.4 'DM Sans',sans-serif", color: T.sub }}>
              {topCatIcon} <strong style={{ color: T.text }}>{topCatName}</strong> was{" "}
              <strong style={{ color: T.text }}>{topCatPct}%</strong> of your spending
            </p>
          </div>
        )}
        {/* Month comparison line */}
        {vsLastMonth !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isUp ? "#EF4444" : "#10B981",
              flexShrink: 0,
            }} />
            <p style={{ margin: 0, font: "400 13px/1.4 'DM Sans',sans-serif", color: T.sub }}>
              You spent{" "}
              <strong style={{ color: isUp ? "#EF4444" : "#10B981" }}>
                {isUp ? "▲" : "▼"} {Math.abs(vsLastMonth)}%
              </strong>{" "}
              {isUp ? "more" : "less"} than last month
            </p>
          </div>
        )}
        {/* Daily average line */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: T.muted,
            flexShrink: 0,
          }} />
          <p style={{ margin: 0, font: "400 13px/1.4 'DM Sans',sans-serif", color: T.sub }}>
            That's{" "}
            <strong style={{ color: T.text }}>
              {fmt(Math.round(thisTotal / new Date().getDate()), currency)}/day
            </strong>{" "}
            on average
          </p>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────
function HomePage({ expenses, settings, onAdd, onEdit, onDelete, T, isDark }) {
  const today    = todayKey();
  const currency = settings.currencyCode || "NGN";
  const todayExp   = useMemo(() => expenses.filter((e) => e.date === today), [expenses, today]);
  const todayTotal = todayExp.reduce((s, e) => s + e.amount, 0);
  const budget     = settings.dailyBudget || 0;
  const streak     = useMemo(() => calcStreak(expenses), [expenses]);
  const weekTotal  = useMemo(() => expenses.filter((e) => e.date >= weekStart()).reduce((s, e) => s + e.amount, 0), [expenses]);
  const monthTotal = useMemo(() => expenses.filter((e) => e.date >= monthStart()).reduce((s, e) => s + e.amount, 0), [expenses]);
  const yest    = new Date(); yest.setDate(yest.getDate() - 1);
  const yestKey = yest.toISOString().split("T")[0];
  const yestTotal = useMemo(() => expenses.filter((e) => e.date === yestKey).reduce((s, e) => s + e.amount, 0), [expenses, yestKey]);
  const vsYest  = yestTotal ? ((todayTotal - yestTotal) / yestTotal * 100).toFixed(0) : null;
  const catBreakdown = CATEGORIES
    .map((cat) => ({ cat, amount: todayExp.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0) }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const h        = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const name     = settings.name ? ", " + settings.name.split(" ")[0] : "";
  return (
    <div style={{ padding: "52px 24px 100px", background: T.bg, minHeight: "100dvh" }}>
      <p style={{ margin: "0 0 4px", font: "400 12px/1 'DM Sans',sans-serif", color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {greeting}{name} 
      </p>
      
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
    <h1 style={{ margin: 0, font: "700 21px/1.25 'Georgia',serif", color: T.text, flex: 1 }}>
      Where did your<br />money go today?
    </h1>
    <img
      src={isDark ? LOGO_DARK : LOGO_LIGHT}
      alt="TallySpends logo"
      style={{
        width: 38,
        height: 38,
        objectFit: "contain",
        borderRadius: 10,
        flexShrink: 0,
        animation: "ts_fadeIn 0.5s ease",
      }}
    />
  </div>

      {/* Hero card */}
      <div style={{ background: T.hero, borderRadius: 22, padding: "22px 22px 20px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
        <p style={{ margin: "0 0 2px", font: "400 11px/1 'DM Sans',sans-serif", color: T.heroSub, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {new Date().toLocaleDateString("en-NG", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <p style={{ margin: "0 0 6px", font: "700 42px/1 'Georgia',serif", color: T.heroText, letterSpacing: "-0.02em" }}>
           <AnimatedAmount value={todayTotal} currency={currency} T={T} />
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, font: "400 12px/1 'DM Sans',sans-serif", color: T.heroSub }}>
            {todayExp.length} {todayExp.length === 1 ? "expense" : "expenses"} logged
          </p>
          {vsYest !== null && (
            <p style={{ margin: 0, font: "600 12px/1 'DM Sans',sans-serif", color: parseInt(vsYest) > 0 ? "#F87171" : "#34D399" }}>
              {parseInt(vsYest) > 0 ? "▲" : "▼"} {Math.abs(vsYest)}% vs yesterday
            </p>
          )}
        </div>
        {budget > 0 && <BudgetBar spent={todayTotal} budget={budget} currency={currency} T={T} />}
      </div>
      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
        {[
          { label: "Streak",     value: streak + "d "       },
          { label: "This week",  value: fmt(weekTotal, currency)  },
          { label: "This month", value: fmt(monthTotal, currency) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: T.card, borderRadius: 14, padding: "12px 10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", font: "400 10px/1 'DM Sans',sans-serif", color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
            <p style={{ margin: 0, font: "700 13px/1 'Georgia',serif", color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
          </div>
        ))}
      </div>
       <MonthlySummary expenses={expenses} currency={currency} T={T} />
      {/* Expenses */}
      {todayExp.length === 0 ? (
        <div style={{ textAlign: "center", padding: "44px 0 20px" }}>
          <p style={{ fontSize: 48, margin: "0 0 12px" }}> </p>
          <p style={{ font: "500 15px/1.5 'DM Sans',sans-serif", color: T.muted, margin: 0 }}>
            No expenses yet today.<br />Tap + to add your first one.
          </p>
        </div>
      ) : (
        <>
          <SectionLabel T={T}>Today's Expenses</SectionLabel>
          {todayExp.map((e) => (
            <ExpenseRow key={e.id} expense={e} onEdit={onEdit} onDelete={onDelete} currency={currency} T={T} />
          ))}
          {catBreakdown.length > 1 && (
            <Card T={T} style={{ marginTop: 18 }}>
              <SectionLabel T={T}>Today's Breakdown</SectionLabel>
              {catBreakdown.map(({ cat, amount }) => {
                const pct = (amount / todayTotal) * 100;
                const c   = CAT[cat];
                return (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ font: "500 13px/1 'DM Sans',sans-serif", color: T.sub }}>{c.icon} {cat}</span>
                      <span style={{ font: "500 13px/1 'Georgia',serif", color: T.text }}>{fmt(amount, currency)}</span>
                    </div>
                    <div style={{ height: 5, background: T.divider, borderRadius: 99 }}>
                      <div style={{ height: "100%", width: pct + "%", background: c.color, borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </>
      )}
      {/* FAB */}
      <button
        onClick={onAdd}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.9)"; }}
        onMouseUp={(e)   => { e.currentTarget.style.transform = "scale(1)";   }}
        style={{
          position: "fixed", bottom: 78,
          right: "max(16px, calc(50% - 199px))",
          width: 56, height: 56, borderRadius: "50%",
          background: T.text, color: T.bg,
          border: "none", fontSize: 28, cursor: "pointer",
          boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 80, transition: "transform 0.15s",
        }}
      >
        +
      </button>
    </div>
  );
}

function AnimatedAmount({ value, currency, style }) {
  const [displayed, setDisplayed] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const diff = end - start;
    if (diff === 0) return;
    const duration = 600; // ms
    const steps = 30;
    const stepTime = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      // Ease-out: slows down near the end
      const progress = 1 - Math.pow(1 - step / steps, 3);
      setDisplayed(Math.round(start + diff * progress));
      if (step >= steps) {
        setDisplayed(end);
        prevRef.current = end;
        clearInterval(timer);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  const cur = getCur(currency);
  return (
    <span style={{ animation: "ts_countUp 0.3s ease", ...style }}>
      {cur.symbol + Number(displayed).toLocaleString(cur.locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}
    </span>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// HISTORY PAGE
// ─────────────────────────────────────────────────────────────────────────────
function HistoryPage({ expenses, onEdit, onDelete, currency, T }) {
  const [search,      setSearch]      = useState("");
  const [filterCat,   setFilterCat]   = useState("All");
  const [filterTag,   setFilterTag]   = useState("");
  const [dateRange,   setDateRange]   = useState("all");
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState(todayKey());
  const [deleteId,    setDeleteId]    = useState(null);
  const [expanded,    setExpanded]    = useState({});
  const [showRange,   setShowRange]   = useState(false);
  const allTags = useMemo(
    () => [...new Set(expenses.flatMap((e) => (e.tags || []).filter((t) => t !== "recurring")))].sort(),
    [expenses]
  );
  const bounds = useMemo(() => {
    const now = todayKey();
    if (dateRange === "week")    return { from: weekStart(), to: now };
    if (dateRange === "month")   return { from: monthStart(), to: now };
    if (dateRange === "3months") {
      const d = new Date(); d.setMonth(d.getMonth() - 3);
      return { from: d.toISOString().split("T")[0], to: now };
    }
    if (dateRange === "custom")  return { from: customFrom, to: customTo };
    return { from: "", to: "" };
  }, [dateRange, customFrom, customTo]);
  const filtered = useMemo(() => expenses.filter((e) => {
    if (filterCat !== "All" && e.category !== filterCat) return false;
    if (filterTag  && !(e.tags || []).includes(filterTag)) return false;
    if (bounds.from && e.date < bounds.from) return false;
    if (bounds.to   && e.date > bounds.to)   return false;
    const q = search.toLowerCase();
    if (q) {
      const inNote = (e.note || "").toLowerCase().includes(q);
      const inCat  = e.category.toLowerCase().includes(q);
      const inSub  = (e.subcat || "").toLowerCase().includes(q);
      const inTags = (e.tags || []).join(" ").toLowerCase().includes(q);
      if (!inNote && !inCat && !inSub && !inTags) return false;
    }
    return true;
  }), [expenses, filterCat, filterTag, bounds, search]);
  const dates          = useMemo(() => [...new Set(filtered.map((e) => e.date))].sort((a, b) => b.localeCompare(a)), [filtered]);
  const totalFiltered  = filtered.reduce((s, e) => s + e.amount, 0);
  const RANGE_LABELS = {
    all:      "All time",
    week:     "This week",
    month:    "This month",
    "3months":"Last 3 months",
    custom:   "Custom range",
  };
  const dateInputStyle = {
    width: "100%", boxSizing: "border-box",
    border: "2px solid " + T.border, borderRadius: 10,
    padding: "9px 12px", font: "400 14px/1 'DM Sans',sans-serif",
    color: T.text, background: T.input, outline: "none",
  };
  return (
    <div style={{ padding: "52px 24px 100px", background: T.bg, minHeight: "100dvh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <h1 style={{ margin: 0, font: "700 22px/1 'Georgia',serif", color: T.text }}>History</h1>
        {filtered.length > 0 && (
          <span style={{ font: "500 13px/1 'Georgia',serif", color: T.sub }}>{fmt(totalFiltered, currency)}</span>
        )}
      </div>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15 }}>🔍</span>
        <input
          type="text"
          placeholder="Search name, category, tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box",
            border: "2px solid " + T.border, borderRadius: 12,
            padding: "11px 36px", font: "400 14px/1 'DM Sans',sans-serif",
            color: T.text, background: T.input, outline: "none",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 16 }}
          >
×
          </button>
        )}
      </div>
      {/* Date range button */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => setShowRange(true)}
          style={{
            background: T.card, border: "2px solid " + T.border,
            borderRadius: 10, padding: "7px 12px",
            font: "500 12px/1 'DM Sans',sans-serif", color: T.sub,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}
        >
 {RANGE_LABELS[dateRange]}
        </button>
        {filterTag && (
          <button
            onClick={() => setFilterTag("")}
            style={{ background: T.pill, border: "none", borderRadius: 8, padding: "6px 10px", font: "500 12px/1 'DM Sans',sans-serif", color: T.pillText, cursor: "pointer" }}
          >
            #{filterTag} ×
          </button>
        )}
      </div>
      {/* Category pills */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: allTags.length ? 10 : 16 }}>
        {["All", ...CATEGORIES].map((cat) => {
          const active = filterCat === cat;
          const c      = cat === "All" ? { color: T.text, bg: T.pill } : CAT[cat];
          return (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              style={{
                flexShrink: 0,
                border: "2px solid " + (active ? c.color : T.border),
                borderRadius: 50, padding: "6px 12px",
                background: active ? c.bg : T.input,
                font: (active ? "600" : "400") + " 12px/1 'DM Sans',sans-serif",
                color: active ? c.color : T.sub,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {cat === "All" ? "All" : CAT[cat].icon + " " + cat}
            </button>
          );
        })}
      </div>
      {/* Tag pills */}
      {allTags.length > 0 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setFilterTag(filterTag === t ? "" : t)}
              style={{
                flexShrink: 0,
                background: filterTag === t ? T.text : T.pill,
                color:      filterTag === t ? T.bg   : T.sub,
                border: "none", borderRadius: 6, padding: "5px 10px",
                font: "500 11px/1 'DM Sans',sans-serif", cursor: "pointer",
              }}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
      {/* List */}
      {dates.length === 0 ? (
         <div style={{
    textAlign: "center", padding: "60px 24px",
    animation: "ts_fadeIn 0.3s ease",
  }}>
    <div style={{
      width: 72, height: 72, borderRadius: 20,
      background: T.card,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 32, margin: "0 auto 16px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
    </div>
    <p style={{
      font: "600 16px/1.4 'Georgia',serif",
      color: T.text, margin: "0 0 8px",
    }}>
      No expenses yet
    </p>
    <p style={{
      font: "400 13px/1.5 'DM Sans',sans-serif",
      color: T.muted, margin: 0,
    }}>
      {search || filterCat !== "All" || dateRange !== "all"
        ? "Try a different filter or date range."
        : "Start tracking your expenses.\nTap + on the home screen to log your first one."
      }
    </p>
  </div>
      ) : (
        dates.map((date) => {
          const dayExps  = filtered.filter((e) => e.date === date);
          const dayTotal = dayExps.reduce((s, e) => s + e.amount, 0);
          const isOpen   = expanded[date] !== false;
          return (
            <div key={date} style={{ marginBottom: 14, background: T.card, borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 5px rgba(0,0,0,0.06)" }}>
              <div
                onClick={() => setExpanded((p) => ({ ...p, [date]: !isOpen }))}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ font: "600 14px/1 'DM Sans',sans-serif", color: T.text }}>{fmtDate(date)}</span>
                  <span style={{ font: "400 12px/1 'DM Sans',sans-serif", color: T.muted }}>{dayExps.length} items</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ font: "600 15px/1 'Georgia',serif", color: T.text }}>{fmt(dayTotal, currency)}</span>
                  <span style={{ color: T.muted, fontSize: 10 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>
              {isOpen && (
                <div style={{ padding: "0 16px 8px", borderTop: "1px solid " + T.divider }}>
                  {dayExps.map((e) => (
                    <ExpenseRow key={e.id} expense={e} onEdit={onEdit} onDelete={(id) => setDeleteId(id)} currency={currency} T={T} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
      {/* Range sheet */}
      {showRange && (
        <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={() => setShowRange(false)} style={{ flex: 1, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
          <div style={{ background: T.surface, borderRadius: "24px 24px 0 0", padding: "24px 24px 48px", animation: "ts_slideUp 0.25s ease" }}>
            <p style={{ margin: "0 0 18px", font: "700 18px/1 'Georgia',serif", color: T.text }}>Date Range</p>
            {["all", "week", "month", "3months", "custom"].map((r) => (
              <button
                key={r}
                onClick={() => { setDateRange(r); if (r !== "custom") setShowRange(false); }}
                style={{
                  display: "block", width: "100%",
                  background: dateRange === r ? T.text : T.pill,
                  color:      dateRange === r ? T.bg   : T.pillText,
                  border: "none", borderRadius: 12, padding: "13px 16px",
                  font: (dateRange === r ? "600" : "400") + " 14px/1 'DM Sans',sans-serif",
                  cursor: "pointer", marginBottom: 8, textAlign: "left",
                }}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
            {dateRange === "custom" && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <SectionLabel T={T}>From</SectionLabel>
                    <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} max={customTo || todayKey()} style={dateInputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <SectionLabel T={T}>To</SectionLabel>
                    <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} max={todayKey()} min={customFrom} style={dateInputStyle} />
                  </div>
                </div>
                <button
                  onClick={() => setShowRange(false)}
                  style={{ width: "100%", background: T.text, color: T.bg, border: "none", borderRadius: 12, padding: 13, font: "600 14px/1 'DM Sans',sans-serif", cursor: "pointer" }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {deleteId && (
        <ConfirmSheet
          msg="This expense will be permanently deleted."
          onConfirm={() => { onDelete(deleteId); setDeleteId(null); }}
          onCancel={() => setDeleteId(null)}
          T={T}
        />
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// INSIGHTS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function InsightsPage({ expenses, currency, T }) {
  const [period,    setPeriod]    = useState("week");
  const [trendView, setTrendView] = useState("bar");
  const [catFilter, setCatFilter] = useState(null);
  const today = todayKey();
  const filtered = useMemo(() => {
    if (period === "week")  return expenses.filter((e) => e.date >= weekStart());
    if (period === "month") return expenses.filter((e) => e.date >= monthStart());
    return expenses;
  }, [expenses, period]);
  const total   = filtered.reduce((s, e) => s + e.amount, 0);
  const catData = CATEGORIES
    .map((cat) => ({ cat, amount: filtered.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0) }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const days   = period === "month" ? 30 : 7;
  const avgDay = total / days;
  const topExp = [...filtered].sort((a, b) => b.amount - a.amount)[0] || null;
  const dailyData = useMemo(() => Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    const k = d.toISOString().split("T")[0];
    const src = catFilter ? filtered.filter((e) => e.date === k && e.category === catFilter) : filtered.filter((e) => e.date === k);
    return { date: k, total: src.reduce((s, e) => s + e.amount, 0), label: d.toLocaleDateString("en-NG", { weekday: "short" }).slice(0, 3) };
  }), [filtered, days, catFilter]);
  const maxDay = Math.max(...dailyData.map((d) => d.total), 1);
  const monthlyData = useMemo(() => {
    const months = {};
    (catFilter ? expenses.filter((e) => e.category === catFilter) : expenses)
      .forEach((e) => { months[e.date.slice(0, 7)] = (months[e.date.slice(0, 7)] || 0) + e.amount; });
    return Object.keys(months).sort().slice(-6).map((m) => ({
      total: months[m],
      label: new Date(m + "-01").toLocaleDateString("en-NG", { month: "short" }),
    }));
  }, [expenses, catFilter]);
  const weeklyData = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const wEnd   = new Date(); wEnd.setDate(wEnd.getDate() - i * 7);
    const wStart = new Date(wEnd); wStart.setDate(wEnd.getDate() - 6);
    const src    = catFilter ? expenses.filter((e) => e.category === catFilter) : expenses;
    return {
      total: src.filter((e) => e.date >= wStart.toISOString().split("T")[0] && e.date <= wEnd.toISOString().split("T")[0]).reduce((s, e) => s + e.amount, 0),
      label: "W" + (8 - i),
    };
  }).reverse(), [expenses, catFilter]);
  const dowTotals = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
    dow,
    label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow],
    total: filtered.filter((e) => new Date(e.date + "T00:00:00").getDay() === dow).reduce((s, e) => s + e.amount, 0),
  }));
  const maxDow = Math.max(...dowTotals.map((d) => d.total), 1);
  function exportMonthCSV() {
    const mo = expenses.filter((e) => e.date >= monthStart());
    if (!mo.length) return;
    const rows = [
      ["Date", "Category", "Sub-category", "Note", "Tags", "Amount"],
      ...mo.map((e) => [
        e.date, e.category, e.subcat || "",
        '"' + (e.note || "").replace(/"/g, '""') + '"',
        '"' + (e.tags || []).join(",") + '"',
        e.amount,
      ]),
    ];
    const a = document.createElement("a");
    a.href     = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "tallyspends_" + new Date().toISOString().slice(0, 7) + ".csv";
    a.click();
  }
  const catColor = catFilter ? (CAT[catFilter] ? CAT[catFilter].color : "#1A1A1A") : "#1A1A1A";
  return (
    <div style={{ padding: "52px 24px 100px", background: T.bg, minHeight: "100dvh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 style={{ margin: 0, font: "700 22px/1 'Georgia',serif", color: T.text }}>Insights</h1>
        <button
          onClick={exportMonthCSV}
          style={{ background: T.card, border: "2px solid " + T.border, borderRadius: 10, padding: "7px 12px", font: "500 12px/1 'DM Sans',sans-serif", color: T.sub, cursor: "pointer" }}
        >
          Month CSV
        </button>
      </div>
      {/* Period toggle */}
      <div style={{ display: "flex", background: T.pill, borderRadius: 12, padding: 3, marginBottom: 16 }}>
        {[["week", "This Week"], ["month", "This Month"], ["all", "All Time"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setPeriod(id)}
            style={{
              flex: 1, border: "none", borderRadius: 10, padding: "9px 4px",
              background:  period === id ? T.card : "transparent",
              font: (period === id ? "600" : "400") + " 12px/1 'DM Sans',sans-serif",
              color:       period === id ? T.text : T.sub,
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: period === id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 18 }}>
        <button
          onClick={() => setCatFilter(null)}
          style={{
            flexShrink: 0,
            border: "2px solid " + (catFilter === null ? T.text : T.border),
            borderRadius: 50, padding: "6px 12px",
            background: catFilter === null ? T.text : T.input,
            font: (catFilter === null ? "600" : "400") + " 12px/1 'DM Sans',sans-serif",
            color: catFilter === null ? T.bg : T.sub,
            cursor: "pointer",
          }}
        >
          All
        </button>
        {CATEGORIES.map((cat) => {
          const active = catFilter === cat;
          const c      = CAT[cat];
          return (
            <button
              key={cat}
              onClick={() => setCatFilter(active ? null : cat)}
              style={{
                flexShrink: 0,
                border: "2px solid " + (active ? c.color : T.border),
                borderRadius: 50, padding: "6px 12px",
                background: active ? c.bg : T.input,
                font: (active ? "600" : "400") + " 12px/1 'DM Sans',sans-serif",
                color: active ? c.color : T.sub,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {c.icon} {cat}
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ fontSize: 44, margin: "0 0 12px" }}> </p>
          <p style={{ font: "500 14px/1.5 'DM Sans',sans-serif", color: T.muted, margin: 0 }}>No data for this period.</p>
        </div>
      ) : (
        <>
          {/* Summary grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            {[
              { label: "Total Spent",    value: fmt(total, currency)             },
              { label: "Daily Avg",      value: fmt(Math.round(avgDay), currency) },
              { label: "Transactions",   value: String(filtered.length)           },
              { label: "Top Category",   value: catData[0] ? CAT[catData[0].cat].icon + " " + catData[0].cat : "—" },
            ].map(({ label, value }) => (
              <Card key={label} T={T} style={{ marginBottom: 0, padding: 14 }}>
                <p style={{ margin: "0 0 4px", font: "400 10px/1 'DM Sans',sans-serif", color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
                <p style={{ margin: 0, font: "700 16px/1.2 'Georgia',serif", color: T.text }}>{value}</p>
              </Card>
            ))}
          </div>
          {/* Daily chart */}
          {period !== "all" && (
            <Card T={T}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <SectionLabel T={T} style={{ margin: 0 }}>
                  {catFilter ? CAT[catFilter].icon + " " + catFilter + " — Daily" : "Daily Spending"}
                </SectionLabel>
                <div style={{ display: "flex", gap: 4 }}>
                  {["bar", "line"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setTrendView(v)}
                      style={{
                        background: trendView === v ? T.text : T.pill,
                        color:      trendView === v ? T.bg   : T.sub,
                        border: "none", borderRadius: 7, padding: "5px 10px",
                        font: "500 11px/1 'DM Sans',sans-serif", cursor: "pointer",
                      }}
                    >
                      {v === "bar" ? "▬ Bar" : "~ Line"}
                    </button>
                  ))}
                </div>
              </div>
              {trendView === "bar" ? (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
                  {dailyData.map(({ date, total: t, label }) => {
                    const h       = maxDay ? (t / maxDay) * 72 : 0;
                    const isToday = date === today;
                    return (
                      <div key={date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} title={t > 0 ? fmt(t, currency) : ""}>
                        <div style={{ width: "100%", height: Math.max(h, t > 0 ? 4 : 0), background: isToday ? catColor : T.divider, borderRadius: "4px 4px 2px 2px", transition: "height 0.5s ease" }} />
                        <span style={{ font: (isToday ? "700" : "400") + " 9px/1 'DM Sans',sans-serif", color: isToday ? T.text : T.muted }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <LineChart data={dailyData} currency={currency} color={catColor} T={T} />
              )}
            </Card>
          )}
          {/* Monthly trend */}
          {monthlyData.length >= 2 && (
            <Card T={T}>
              <SectionLabel T={T}>{catFilter ? CAT[catFilter].icon + " " + catFilter + " — Monthly" : "Monthly Trend"}</SectionLabel>
              <LineChart data={monthlyData} currency={currency} color={catColor} T={T} />
            </Card>
          )}
          {/* Weekly trend (All Time only) */}
          {period === "all" && weeklyData.some((w) => w.total > 0) && (
            <Card T={T}>
              <SectionLabel T={T}>Weekly Trend (last 8 weeks)</SectionLabel>
              <LineChart data={weeklyData} currency={currency} color={catColor} T={T} />
            </Card>
          )}
          {/* Category donut */}
          {!catFilter && (
            <Card T={T}>
              <SectionLabel T={T}>By Category</SectionLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ flexShrink: 0, position: "relative" }}>
                  <DonutChart data={catData} total={total} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <p style={{ margin: 0, font: "700 13px/1 'Georgia',serif", color: T.text }}>{catData.length}</p>
                    <p style={{ margin: 0, font: "400 9px/1 'DM Sans',sans-serif", color: T.muted }}>cats</p>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  {catData.slice(0, 5).map(({ cat, amount }) => {
                    const c   = CAT[cat];
                    const pct = ((amount / total) * 100).toFixed(0);
                    return (
                      <div key={cat} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                        <span style={{ font: "400 12px/1 'DM Sans',sans-serif", color: T.sub, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat}</span>
                        <span style={{ font: "600 12px/1 'DM Sans',sans-serif", color: T.text }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {catData.map(({ cat, amount }) => {
                const c   = CAT[cat];
                const pct = (amount / total) * 100;
                return (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ font: "500 13px/1 'DM Sans',sans-serif", color: T.sub }}>{c.icon} {cat}</span>
                      <span style={{ font: "500 13px/1 'Georgia',serif", color: T.text }}>{fmt(amount, currency)}</span>
                    </div>
                    <div style={{ height: 5, background: T.divider, borderRadius: 99 }}>
                      <div style={{ height: "100%", width: pct + "%", background: c.color, borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
          {/* Day of week */}
          <Card T={T}>
            <SectionLabel T={T}>Spending by Day of Week</SectionLabel>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 60, marginTop: 10 }}>
              {dowTotals.map(({ label, total: t }) => {
                const h = maxDow ? (t / maxDow) * 52 : 0;
                return (
                  <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: "100%", height: Math.max(h, t > 0 ? 4 : 0), background: t === Math.max(...dowTotals.map((d) => d.total)) ? T.text : T.divider, borderRadius: "4px 4px 2px 2px", transition: "height 0.5s ease" }} title={fmt(t, currency)} />
                    <span style={{ font: "400 9px/1 'DM Sans',sans-serif", color: T.muted }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          {/* Biggest expense */}
          {topExp && (
            <Card T={T}>
              <SectionLabel T={T}>Biggest Expense</SectionLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: CAT[topExp.category] ? CAT[topExp.category].bg : "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {CAT[topExp.category] ? CAT[topExp.category].icon : "💰"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 2px", font: "600 14px/1 'DM Sans',sans-serif", color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {topExp.note || topExp.subcat || topExp.category}
                  </p>
                  <p style={{ margin: 0, font: "400 12px/1 'DM Sans',sans-serif", color: T.muted }}>
                    {fmtDate(topExp.date)} · {topExp.subcat || topExp.category}
                  </p>
                </div>
                <p style={{ margin: 0, font: "700 17px/1 'Georgia',serif", color: T.text, flexShrink: 0 }}>
                  {fmt(topExp.amount, currency)}
                </p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// RECURRING SHEET
// ─────────────────────────────────────────────────────────────────────────────
function RecurringSheet({ recurring, onSave, onDelete, onClose, currency, T }) {
  const [name,       setName]       = useState("");
  const [amount,     setAmount]     = useState("");
  const [category,   setCategory]   = useState("Bills");
  const [subcat,     setSubcat]     = useState("");
  const [freq,       setFreq]       = useState("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const cur = getCur(currency);
  const inputBase = {
    width: "100%", boxSizing: "border-box",
    border: "2px solid " + T.border, borderRadius: 12,
    padding: "11px 14px", font: "400 14px/1 'DM Sans',sans-serif",
    color: T.text, background: T.input, outline: "none",
  };
  function handleAdd() {
    const val = parseFloat(String(amount).replace(/,/g, ""));
    if (!name.trim() || !val || val <= 0) return;
    onSave({
      id: Date.now(),
      name: name.trim(),
      amount: val,
      category,
      subcat,
      freq,
      dayOfMonth: parseInt(dayOfMonth, 10) || 1,
      active: true,
    });
    setName(""); setAmount(""); setCategory("Bills"); setSubcat(""); setFreq("monthly"); setDayOfMonth("1");
  }
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
      <div style={{ background: T.surface, borderRadius: "24px 24px 0 0", padding: "24px 24px 44px", animation: "ts_slideUp 0.28s ease", maxHeight: "88dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ font: "700 19px/1 'Georgia',serif", color: T.text, margin: 0 }}>Recurring Expenses</p>
          <button onClick={onClose} style={{ background: T.pill, border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 18, cursor: "pointer", color: T.sub }}>
            ×
          </button>
        </div>
        {recurring.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {recurring.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid " + T.divider }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: CAT[r.category] ? CAT[r.category].bg : "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
                  {CAT[r.category] ? CAT[r.category].icon : "🔄"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 1px", font: "500 13px/1 'DM Sans',sans-serif", color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</p>
                  <p style={{ margin: 0, font: "400 11px/1 'DM Sans',sans-serif", color: T.muted }}>{r.freq}{r.freq === "monthly" ? " on the 1st" : ""}</p>
                </div>
                <p style={{ margin: 0, font: "600 13px/1 'Georgia',serif", color: T.text, flexShrink: 0 }}>{fmt(r.amount, currency)}</p>
                <button onClick={() => onDelete(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 16, padding: 4 }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <p style={{ margin: "0 0 14px", font: "600 14px/1 'DM Sans',sans-serif", color: T.sub }}>Add Recurring</p>
        <SectionLabel T={T}>Name</SectionLabel>
        <input type="text" placeholder="e.g. Monthly Rent" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputBase, marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <SectionLabel T={T}>Amount</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", border: "2px solid " + T.border, borderRadius: 12, padding: "10px 12px", background: T.input }}>
              <span style={{ font: "600 16px/1 'Georgia',serif", color: "#C0A060", marginRight: 4 }}>{cur.symbol}</span>
              <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(cleanAmt(e.target.value))} style={{ border: "none", outline: "none", font: "500 16px/1 'DM Sans',sans-serif", color: T.text, background: "transparent", flex: 1, minWidth: 0 }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <SectionLabel T={T}>Frequency</SectionLabel>
            <select value={freq} onChange={(e) => setFreq(e.target.value)} style={{ ...inputBase, padding: "11px 10px" }}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        {freq === "monthly" && (
          <>
            <SectionLabel T={T}>Day of Month (1–28)</SectionLabel>
            <input type="number" min={1} max={28} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} style={{ ...inputBase, marginBottom: 14 }} />
          </>
        )}
        <SectionLabel T={T}>Category</SectionLabel>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 18 }}>
          {CATEGORIES.map((cat) => {
            const c = CAT[cat]; const active = category === cat;
            return (
              <button key={cat} onClick={() => { setCategory(cat); setSubcat(""); }} style={{ border: "2px solid " + (active ? c.color : T.border), borderRadius: 50, padding: "6px 11px", background: active ? c.bg : T.input, font: (active ? "600" : "400") + " 12px/1 'DM Sans',sans-serif", color: active ? c.color : T.sub, cursor: "pointer" }}>
                {c.icon} {cat}
              </button>
            );
          })}
        </div>
        <button onClick={handleAdd} style={{ width: "100%", background: T.text, color: T.bg, border: "none", borderRadius: 14, padding: 15, font: "600 15px/1 'DM Sans',sans-serif", cursor: "pointer" }}>
          Add Recurring Expense
        </button>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function SettingsPage({ expenses, settings, onSaveSettings, onClearData, recurring, onSaveRecurring, onDeleteRecurring, toast, onImport, T }) {
  const [name,         setName]         = useState(settings.name || "");
  const [dailyBudget,  setDailyBudget]  = useState(settings.dailyBudget || "");
  const [currencyCode, setCurrencyCode] = useState(settings.currencyCode || "NGN");
  const [theme,        setTheme]        = useState(settings.theme || "light");
  const [notifPerm,    setNotifPerm]    = useState(() => "Notification" in window ? Notification.permission : "unsupported");
  const [confirmClear, setConfirmClear] = useState(false);
  const [cloudStatus,  setCloudStatus]  = useState(null);
  const [showRecurring,setShowRecurring]= useState(false);
  const fileRef = useRef(null);
  const cur = getCur(currencyCode);
  function saveAll() {
    onSaveSettings({ ...settings, name: name.trim(), dailyBudget: parseFloat(dailyBudget) || 0, currencyCode, theme });
    toast("Settings saved ✓", "success");
  }
  function exportCSV() {
    if (!expenses.length) { toast("No expenses to export", "error"); return; }
    const rows = [
      ["Date", "Category", "Sub-category", "Note", "Tags", "Amount"],
      ...expenses.map((e) => [
        e.date, e.category, e.subcat || "",
        '"' + (e.note || "").replace(/"/g, '""') + '"',
        '"' + (e.tags || []).join(",") + '"',
        e.amount,
      ]),
    ];
    const a = document.createElement("a");
    a.href     = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "tallyspends_" + new Date().toISOString().slice(0, 7) + ".csv";
    a.click();
    toast("CSV exported ", "success");
  }
  function exportJSON() {
    if (!expenses.length) { toast("No data to export", "error"); return; }
    const payload = JSON.stringify({ version: 2, exported: new Date().toISOString(), settings, expenses, recurring }, null, 2);
    const a = document.createElement("a");
    a.href     = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    a.download = "tallyspends_backup_" + new Date().toISOString().slice(0, 7) + ".json";
    a.click();
    toast("JSON backup downloaded ", "success");
  }
  function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data     = JSON.parse(ev.target.result);
        const imported = Array.isArray(data) ? data : (data.expenses || []);
        if (!imported.length) throw new Error("empty");
        onImport(imported);
        toast("Imported " + imported.length + " expenses ✓", "success");
      } catch {
        toast("Import failed — invalid file", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }
  function cloudBackup() {
    setCloudStatus("syncing");
    setTimeout(() => { exportJSON(); setCloudStatus("success"); setTimeout(() => setCloudStatus(null), 2500); }, 900);
  }
  function enableNotifs() {
    Notification.requestPermission().then((p) => {
      setNotifPerm(p);
      if (p === "granted") { scheduleNotifs(); toast("Reminders enabled ✓", "success"); }
    });
  }
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const streak     = calcStreak(expenses);
  const inputBase = {
    width: "100%", boxSizing: "border-box",
    border: "2px solid " + T.border, borderRadius: 12,
    padding: "11px 14px", font: "400 14px/1 'DM Sans',sans-serif",
    color: T.text, background: T.inputBg, outline: "none",
  };
  function Sec({ children, extraStyle }) {
    return (
      <div style={{ background: T.card, borderRadius: 16, padding: 18, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", ...extraStyle }}>
        {children}
      </div>
    );
  }
  return (
    <div style={{ padding: "52px 24px 100px", background: T.bg, minHeight: "100dvh" }}>
      <h1 style={{ margin: "0 0 22px", font: "700 22px/1 'Georgia',serif", color: T.text }}>Settings</h1>
      {/* Name */}
      <Sec>
        <SectionLabel T={T}>Your Name</SectionLabel>
        <input type="text" placeholder="e.g. Chigozie" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} style={inputBase} />
      </Sec>
      {/* Theme */}
      <Sec>
        <SectionLabel T={T}>Appearance</SectionLabel>
        <div style={{ display: "flex", background: T.pill, borderRadius: 12, padding: 3 }}>
          {[["light", " Light"], ["dark", " Dark"]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => {
                setTheme(val);
                onSaveSettings({ ...settings, theme: val });
              }}
              style={{
                flex: 1, border: "none", borderRadius: 10, padding: "10px 4px",
                background: theme === val ? T.card : "transparent",
                font: (theme === val ? "600" : "400") + " 13px/1 'DM Sans',sans-serif",
                color: theme === val ? T.text : T.sub,
                cursor: "pointer", transition: "all 0.2s",
                boxShadow: theme === val ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Sec>
      {/* Currency */}
      <Sec>
        <SectionLabel T={T}>Currency</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CURRENCIES.map((c) => {
            const active = currencyCode === c.code;
            return (
              <button
                key={c.code}
                onClick={() => setCurrencyCode(c.code)}
                style={{
                  border: "2px solid " + (active ? T.text : T.border),
                  borderRadius: 10, padding: "8px 12px",
                  background: active ? T.text : T.input,
                  font: (active ? "600" : "400") + " 13px/1 'DM Sans',sans-serif",
                  color: active ? T.bg : T.sub,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {c.symbol} {c.code}
              </button>
            );
          })}
        </div>
        <p style={{ margin: "8px 0 0", font: "400 12px/1 'DM Sans',sans-serif", color: T.muted }}>{cur.name}</p>
      </Sec>
      {/* Daily budget */}
      <Sec>
        <SectionLabel T={T}>Daily Budget</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", border: "2px solid " + T.border, borderRadius: 12, padding: "10px 14px", background: T.inputBg }}>
          <span style={{ font: "600 18px/1 'Georgia',serif", color: "#C0A060", marginRight: 6 }}>{cur.symbol}</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0 = no limit"
            value={dailyBudget}
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d*\.?\d*$/.test(v)) {
                setDailyBudget(v);
              }
            }}
            style={{ border: "none", outline: "none", font: "500 16px/1 'DM Sans',sans-serif", color: T.text, background: "transparent", flex: 1, minWidth: 0 }}
          />
        </div>
        <p style={{ margin: "6px 0 0", font: "400 12px/1 'DM Sans',sans-serif", color: T.muted }}>Shows a budget progress bar on the home screen.</p>
      </Sec>
      <button onClick={saveAll} style={{ width: "100%", background: T.text, color: T.bg, border: "none", borderRadius: 14, padding: 15, font: "600 15px/1 'DM Sans',sans-serif", cursor: "pointer", marginBottom: 14 }}>
        Save Settings
      </button>
      {/* Recurring */}
      <Sec>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <SectionLabel T={T} style={{ margin: 0 }}>Recurring Expenses</SectionLabel>
          <button onClick={() => setShowRecurring(true)} style={{ background: T.pill, border: "none", borderRadius: 9, padding: "7px 14px", font: "600 13px/1 'DM Sans',sans-serif", color: T.pillText, cursor: "pointer" }}>
            Manage 
          </button>
        </div>
        <p style={{ margin: 0, font: "400 13px/1.4 'DM Sans',sans-serif", color: T.sub }}>
          {recurring.length === 0
            ? "No recurring expenses set up yet."
            : recurring.length + " recurring expense" + (recurring.length === 1 ? "" : "s") + " active — auto-added on schedule."}
        </p>
      </Sec>
      {/* Notifications */}
      <Sec>
        <SectionLabel T={T}>Daily Reminders</SectionLabel>
        <p style={{ margin: "0 0 12px", font: "400 13px/1.5 'DM Sans',sans-serif", color: T.sub }}>Reminders at 10 AM, 3 PM, and 9 PM</p>
        {notifPerm === "unsupported" ? (
          <p style={{ margin: 0, font: "400 13px/1 'DM Sans',sans-serif", color: T.muted }}>Not supported in this browser.</p>
        ) : notifPerm === "granted" ? (
          <p style={{ margin: 0, font: "600 13px/1 'DM Sans',sans-serif", color: T.success }}>Enabled ✓</p>
        ) : notifPerm === "denied" ? (
          <p style={{ margin: 0, font: "400 13px/1 'DM Sans',sans-serif", color: "#EF4444" }}>Blocked. Enable in browser settings.</p>
        ) : (
          <button onClick={enableNotifs} style={{ background: T.pill, border: "none", borderRadius: 10, padding: "10px 18px", font: "600 13px/1 'DM Sans',sans-serif", color: T.pillText, cursor: "pointer" }}>
 Enable Reminders
          </button>
        )}
      </Sec>
      {/* Stats */}
      <Sec>
        <SectionLabel T={T}>Your Stats</SectionLabel>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "All-time",     value: fmt(totalSpent, currencyCode) },
            { label: "Transactions", value: String(expenses.length)       },
            { label: "Streak",       value: streak + "d" },
          ].map(({ label, value }) => (
            <div key={label} style={{ flex: 1, textAlign: "center", background: T.inputBg, borderRadius: 10, padding: "10px 4px" }}>
              <p style={{ margin: "0 0 3px", font: "700 13px/1 'Georgia',serif", color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
              <p style={{ margin: 0, font: "400 10px/1.3 'DM Sans',sans-serif", color: T.muted }}>{label}</p>
            </div>
          ))}
        </div>
      </Sec>
      {/* Export / Import */}
      <Sec>
        <SectionLabel T={T}>Export Data</SectionLabel>
        <p style={{ margin: "0 0 12px", font: "400 13px/1.5 'DM Sans',sans-serif", color: T.sub }}>
          Download your {expenses.length} expenses as CSV or full JSON backup.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button onClick={exportCSV}  disabled={!expenses.length} style={{ background: T.pill, border: "none", borderRadius: 10, padding: "10px 16px", font: "600 13px/1 'DM Sans',sans-serif", color: expenses.length ? T.pillText : T.muted, cursor: expenses.length ? "pointer" : "default" }}>
            Export CSV
          </button>
          <button onClick={exportJSON} disabled={!expenses.length} style={{ background: T.pill, border: "none", borderRadius: 10, padding: "10px 16px", font: "600 13px/1 'DM Sans',sans-serif", color: expenses.length ? T.pillText : T.muted, cursor: expenses.length ? "pointer" : "default" }}>
            Export JSON
          </button>
        </div>
        <div style={{ paddingTop: 14, borderTop: "1px solid " + T.divider }}>
          <p style={{ margin: "0 0 8px", font: "500 12px/1 'DM Sans',sans-serif", color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Import</p>
          <p style={{ margin: "0 0 10px", font: "400 13px/1.5 'DM Sans',sans-serif", color: T.sub }}>Restore from a previously exported JSON file.</p>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: "none" }} />
          <button onClick={() => fileRef.current && fileRef.current.click()} style={{ background: T.pill, border: "none", borderRadius: 10, padding: "10px 16px", font: "600 13px/1 'DM Sans',sans-serif", color: T.pillText, cursor: "pointer" }}>
            Import JSON
          </button>
        </div>
      </Sec>
      {/* Cloud backup */}
      <Sec>
        <SectionLabel T={T}>Cloud Backup</SectionLabel>
        <p style={{ margin: "0 0 10px", font: "400 13px/1.5 'DM Sans',sans-serif", color: T.sub }}>
          Download your data, then upload to Google Drive, iCloud, or Dropbox.
        </p>
        <div style={{ background: T.inputBg, border: "1px solid " + T.border, borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
          <p style={{ margin: "0 0 2px", font: "600 12px/1 'DM Sans',sans-serif", color: T.sub }}>How it works</p>
          <p style={{ margin: 0, font: "400 12px/1.4 'DM Sans',sans-serif", color: T.muted }}>
            1. Tap "Backup to Drive" → file downloads<br />
            2. Upload it to Google Drive / iCloud<br />
            3. Restore anytime via Import JSON above
          </p>
        </div>
        <button
          onClick={cloudBackup}
          disabled={cloudStatus === "syncing" || !expenses.length}
          style={{
            background: cloudStatus === "success" ? "#10B981" : cloudStatus === "syncing" ? "#888" : T.text,
            color: "#fff", border: "none", borderRadius: 10, padding: "11px 18px",
            font: "600 13px/1 'DM Sans',sans-serif", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, transition: "background 0.3s",
          }}
        >
          {cloudStatus === "syncing" ? "⏳ Preparing…" : cloudStatus === "success" ? "✓ File Ready!" : "☁️ Backup to Drive"}
        </button>
      </Sec>
      {/* Install hint */}
      <div style={{ background: T.info, border: "1px solid " + T.infoBorder, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
        <p style={{ margin: "0 0 4px", font: "600 13px/1 'DM Sans',sans-serif", color: T.infoText }}>📱 Install App</p>
        <p style={{ margin: 0, font: "400 12px/1.4 'DM Sans',sans-serif", color: T.infoText }}>
          iOS: tap Share → Add to Home Screen<br />
          Android / Chrome: tap the install icon in the address bar
        </p>
      </div>
      {/* Danger */}
      <div style={{ background: T.danger, border: "1px solid " + T.dangerBorder, borderRadius: 16, padding: 18 }}>
        <SectionLabel T={T} style={{ color: T.dangerText }}>Danger Zone</SectionLabel>
        <p style={{ margin: "0 0 12px", font: "400 13px/1.5 'DM Sans',sans-serif", color: T.sub }}>
          Delete all {expenses.length} expenses permanently.
        </p>
        <button
          onClick={() => setConfirmClear(true)}
          disabled={!expenses.length}
          style={{ background: expenses.length ? "#EF4444" : "#FCA5A5", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", font: "600 13px/1 'DM Sans',sans-serif", cursor: expenses.length ? "pointer" : "default" }}
        >
 Clear All Data
        </button>
      </div>
      {showRecurring && (
        <RecurringSheet
          recurring={recurring}
          onSave={onSaveRecurring}
          onDelete={onDeleteRecurring}
          onClose={() => setShowRecurring(false)}
          currency={currencyCode}
          T={T}
        />
      )}
      {confirmClear && (
        <ConfirmSheet
          title="Delete everything?"
          msg={"All " + expenses.length + " expenses will be gone forever. This cannot be undone."}
          confirmLabel="Yes, Delete All"
          danger={true}
          onConfirm={() => { onClearData(); setConfirmClear(false); toast("All data cleared.", "default"); }}
          onCancel={() => setConfirmClear(false)}
          T={T}
        />
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [expenses,         setExpenses]         = useState(() => lsLoad("ts_expenses",  []));
  const [settings,         setSettings]         = useState(() => lsLoad("ts_settings",  DEFAULT_SETTINGS));
  const [recurring,        setRecurring]        = useState(() => lsLoad("ts_recurring", []));
  const [page,             setPage]             = useState(PAGES.HOME);
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
  const [editingExpense,   setEditingExpense]   = useState(null);
  const [toastMsg,         setToastMsg]         = useState(null);
  const [toastType,        setToastType]        = useState("default");
  const [deleteConfirm,    setDeleteConfirm]    = useState(null);
  const [idbReady,         setIdbReady]         = useState(false);
  const { T, isDark } = useTheme(settings);
  // ── Boot: load from IndexedDB, inject recurring ─────────────────────────
  useEffect(() => {
    idb.getAll("expenses")
      .then((items) => {
        if (items.length > 0) setExpenses(items.sort((a, b) => b.id - a.id));
        return idb.getAll("recurring");
      })
      .then((rec) => {
        if (rec.length > 0) setRecurring(rec);
        setIdbReady(true);
      })
      .catch(() => setIdbReady(true));
    scheduleNotifs();
  }, []);
  // ── Auto-inject recurring expenses once IDB is ready ────────────────────
  useEffect(() => {
    if (!idbReady || !settings.recurringEnabled) return;
    const toAdd = injectRecurring(expenses, recurring);
    if (toAdd.length > 0) {
      setExpenses((prev) => [...toAdd, ...prev]);
      toast("" + toAdd.length + " recurring expense" + (toAdd.length > 1 ? "s" : "") + " added ✓");
    }
  }, [idbReady]); // eslint-disable-line react-hooks/exhaustive-deps
  // ── Sync expenses to both storage layers ────────────────────────────────
  useEffect(() => {
    if (!idbReady) return;
    lsSave("ts_expenses", expenses);
    idb.putAll(expenses, "expenses").catch(() => {});
  }, [expenses, idbReady]);
  useEffect(() => { lsSave("ts_settings", settings); }, [settings]);
  useEffect(() => {
    lsSave("ts_recurring", recurring);
    if (idbReady) idb.putAll(recurring, "recurring").catch(() => {});
  }, [recurring, idbReady]);
  // ── Handlers ───────────────────────────────────────────────────────────
  const toast = useCallback((msg, type) => {
    setToastMsg(msg);
    setToastType(type || "default");
  }, []);
  const saveExpense = useCallback((exp) => {
    setExpenses((prev) =>
      prev.find((e) => e.id === exp.id)
        ? prev.map((e) => (e.id === exp.id ? exp : e))
        : [exp, ...prev]
    );
    toast(editingExpense ? "Expense updated ✓" : "Expense saved ✓", "success");
    setEditingExpense(null);
    setShowExpenseSheet(false);
  }, [editingExpense, toast]);
  const deleteExpense = useCallback((id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    toast("Expense deleted.");
  }, [toast]);
  const handleEdit = useCallback((exp) => {
    setEditingExpense(exp);
    setShowExpenseSheet(true);
  }, []);
  const handleImport = useCallback((imported) => {
    const existingIds = new Set(expenses.map((e) => e.id));
    const newItems    = imported.filter((e) => !existingIds.has(e.id));
    setExpenses((prev) => [...prev, ...newItems].sort((a, b) => b.id - a.id));
  }, [expenses]);
  const saveRecurring   = useCallback((r) => { setRecurring((prev) => [r, ...prev]); toast('"' + r.name + '" added as recurring ✓'); }, [toast]);
  const deleteRecurring = useCallback((id) => { setRecurring((prev) => prev.filter((r) => r.id !== id)); toast("Recurring expense removed."); }, [toast]);
  const currency = settings.currencyCode || "NGN";
  const shared   = { expenses, onEdit: handleEdit, onDelete: (id) => setDeleteConfirm(id), currency, T };
  // ── Loading splash ──────────────────────────────────────────────────────
   if (!idbReady) {
    return (
      <div style={{
        maxWidth: 430, margin: "0 auto", minHeight: "100dvh",
        background: T.bg, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: T.card,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          animation: "ts_pulse 1.4s ease infinite",
        }}>
        </div>
        <p style={{ font: "600 18px/1 'Georgia',serif", color: T.text, margin: 0 }}>
          TallySpends
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: T.muted,
              animation: `ts_dotBounce 1.2s ease ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    );
  }
  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *, *::before, *::after {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }
        html, body {
          margin: 0; padding: 0;
          font-family: 'DM Sans', sans-serif;
          overscroll-behavior: none;
        }
        @keyframes ts_slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes ts_fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes ts_fadeUp {
          from { opacity: 0; transform: translate(-50%, 14px); }
          to   { opacity: 1; transform: translate(-50%, 0);    }
        }
        @keyframes ts_shake {
          0%, 100% { transform: translateX(0);  }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px);  }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px);  }
        }
         @keyframes ts_pulse {
    0%, 100% { transform: scale(1);    opacity: 1; }
    50%       { transform: scale(1.08); opacity: 0.75; }
  }
  @keyframes ts_dotBounce {
    0%, 80%, 100% { transform: translateY(0);   opacity: 0.4; }
    40%           { transform: translateY(-6px); opacity: 1; }
  }
  @keyframes ts_coinSpin {
    0%   { transform: rotateY(0deg); }
    100% { transform: rotateY(360deg); }
  }
  @keyframes ts_floatUp {
    0%   { transform: translateY(0)  scale(1);    opacity: 1; }
    100% { transform: translateY(-60px) scale(0.6); opacity: 0; }
  }
  @keyframes ts_countUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ts_shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
        }
        input[type=date]::-webkit-calendar-picker-indicator {
          opacity: 0.5;
          filter: ${isDark ? "invert(1)" : "none"};
        }
        ::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; }
        select { appearance: none; -webkit-appearance: none; }
      `}</style>
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100dvh", background: T.bg, position: "relative", overflowX: "hidden" }}>
        {/* 
── Pages ── */}
        /*
  <div
    key={page}
    style={{ animation: "ts_fadeIn 0.25s ease" }}
  >
    {page === PAGES.HOME && (
      <HomePage
        {...shared}
        settings={settings}
        onAdd={() => { setEditingExpense(null); setShowExpenseSheet(true); }}
        isDark={isDark}
      />
    )}
    {page === PAGES.HISTORY && <HistoryPage {...shared} />}
    {page === PAGES.INSIGHTS && <InsightsPage expenses={expenses} currency={currency} T={T} />}
    {page === PAGES.SETTINGS && (
      <SettingsPage
        expenses={expenses}
        settings={settings}
        onSaveSettings={(s) => setSettings(s)}
        onClearData={() => {
          setExpenses([]);
          lsSave("ts_expenses", []);
          idb.putAll([], "expenses").catch(() => {});
        }}
        recurring={recurring}
        onSaveRecurring={saveRecurring}
        onDeleteRecurring={deleteRecurring}
        toast={toast}
        onImport={handleImport}
        T={T}
      />
    )}
  </div>
*/
        {/* 
── Nav ── */}
        <NavBar page={page} setPage={setPage} T={T} />
        {/* 
── Expense sheet ── */}
        {showExpenseSheet && (
          <ExpenseSheet
            expense={editingExpense}
            onSave={saveExpense}
            onClose={() => { setShowExpenseSheet(false); setEditingExpense(null); }}
            currency={currency}
            T={T}
          />
        )}
        {/* 
── Delete confirm ── */}
        {deleteConfirm && (
          <ConfirmSheet
            msg="This expense will be permanently deleted."
            onConfirm={() => { deleteExpense(deleteConfirm); setDeleteConfirm(null); }}
            onCancel={() => setDeleteConfirm(null)}
            T={T}
          />
        )}
        {/* 
── Toast ── */}
        {toastMsg && (
          <Toast msg={toastMsg} type={toastType} onDone={() => setToastMsg(null)} />
        )}
      </div>
    </>
  );
}