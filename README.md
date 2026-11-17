# MONETRA V3 — Institutional Personal Finance & Money Management

> **"Precision in every paisa, beauty in every pixel."**

MONETRA V3 is a commercial-grade, mobile-first personal finance application engineered strictly to the design aesthetics of **Neon Lime (`#E7FF32`)** on **Deep Obsidian Black (`#090B08`) and Charcoal (`#151812`, `#1C2019`)**.

It operates with institutional double-entry financial rigor—eliminating IEEE 754 floating-point inaccuracies through an integer-paise mathematical calculation engine.

---

## 🌟 Key Architectural Features

### 1. Four Mobile-First Core Views (Matching Reference Layout)
1. **HOME**: Main balance hero card (show/hide toggle), Quick Actions (+Expense, +Income, Transfer, Salary), Monthly Overview (Income, Expenses, Net Savings, Budget Remaining), Spending progress bar, Upcoming recurring bills, Savings goals preview, and Recent Transactions with receipt attachment inspection.
2. **BUDGET**: Real-time monthly budget cap, spent vs remaining stats, thin progress bar, and category-wise allocations with automated 75% (Warning), 90% (Critical Alert), and 100% (Exceeded) triggers. Supports 1-click previous month budget copying.
3. **SAVINGS**: Total accumulated savings hero, active savings goals (Emergency Fund, Smartphone, Laptop, Vehicle, Vacation, Custom), percentage progress, target dates, and strictly recorded inter-account contributions and withdrawals. Triggers celebratory confetti upon reaching 100%!
4. **INSIGHTS**: Recharts-powered category breakdown and daily spending velocity charts, AI-driven anomaly detection, daily safe-to-spend computation, and an interactive on-device AI Financial Assistant that answers queries in real time.

### 2. High-Velocity Add Transaction System
- Globally accessible floating Neon Lime Add (+) action button.
- Comprehensive bottom sheet modal with numeric keypad and quick amount pills (+100, +500, +1000, +2000, +5000).
- Support for **EXPENSE**, **INCOME**, and **TRANSFER**.
- 19 Expense Categories & 8 Income Categories with custom icons and colors.
- Image receipt capture and base64 storage.
- Immediate, atomic balance and chart recalculation upon confirmation.

### 3. Institutional Accounting Engine
- Pure integer **paise** math ($1\text{ INR} = 100\text{ paise}$).
- Inter-account transfers and savings allocations are mathematically neutral—preventing artificial inflation of monthly income or expenses.
- Carry-forward balance across monthly accounting periods without resetting to zero.
- Historical immutability: Transactions in future months never corrupt prior historical monthly summaries.

### 4. Secondary Features Hub
- **Salary Center**: Track expected vs received salary; expected earnings never falsely inflate live balance until marked as credited.
- **Multiple Accounts**: Manage Cash Wallets, Bank Accounts, UPI/Digital Wallets, and Savings Reserves with live balance calculation.
- **Recurring Bills**: Manage rent, subscriptions, recharges, and utility bills with 1-click payment posting.
- **Debt Manager**: Track money lent to friends or borrowed from institutions with partial or full repayment settlements.
- **Financial Calendar**: Interactive monthly calendar with day-by-day cashflow pins and transaction logs.
- **Export Engine**: Export official PDF financial statements with neon lime formatting, or download clean CSV transaction records.
- **Optional Cloud Vault**: 100% local-first and offline by default. Optionally syncs encrypted payloads (AES-GCM client-side encryption) to your personal Supabase instance.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9

### Installation
```bash
cd monetra
npm install
```

### Running the App Locally
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### Running the Production Build
```bash
npm run build
```

---

## 🧪 Automated Financial Test Suite

MONETRA includes an automated test runner that validates all 14 test cases specified in Section 25:

```bash
npm test
```

### Test Suite Coverage:
1. `TEST 1`: Cash account creation with ₹10,000 -> verified ₹10,000 balance.
2. `TEST 2`: Crediting salary of ₹35,000 -> verified ₹45,000 balance.
3. `TEST 3`: Logging food expense of ₹250 -> verified ₹44,750 balance.
4. `TEST 4`: Transferring ₹5,000 to savings -> verified Cash ₹39,750, Savings ₹5,000, Combined ₹44,750, and zero monthly income/expense leakage.
5. `TEST 5`: Expense modification to ₹400 -> verified ₹39,600 updated balance.
6. `TEST 6`: Expense deletion -> verified exact balance restoration.
7. `TEST 7`: Cross-month immutability check (November vs December).
8. `TEST 8`: Category budget compliance & multi-tier alerts (75%, 90%, 100%).
9. `TEST 9`: Linked savings goal contributions without double counting.
10. `TEST 10`: Full state serialization & reconstruction without bit loss.
11. `TEST 11`: 100% offline functionality.
12. `TEST 12`: AES-GCM client-side encryption & restore integrity.
13. `TEST 13`: Collision & duplicate transaction prevention.
14. `TEST 14`: AI natural language answering grounded in real ledger figures.

---

## 📱 Android Packaging with Capacitor

MONETRA V3 is pre-configured with Capacitor for Android native deployment:

```bash
# 1. Build the production web assets
npm run build

# 2. Add Android platform (if not already added)
npx cap add android

# 3. Synchronize web assets into Android project
npx cap sync

# 4. Open in Android Studio to build APK or run on connected device / emulator
npx cap open android
```

Alternatively, to run directly on a connected device via CLI:
```bash
npx cap run android
```

---

## 🎨 Color Tokens & Design System

| Role | Hex | Purpose |
|---|---|---|
| Primary Background | `#090B08` | Deep obsidian surface |
| Secondary Background | `#151812` | Dark forest charcoal container |
| Card Background | `#1C2019` | Elevated financial cards |
| Card Elevated / Modal | `#23281F` | Dialogs & active cards |
| Primary Accent | `#E7FF32` | Neon lime brand & balance figures |
| Secondary Accent | `#C9E927` | Subtle lime secondary indicators |
| Border | `#30352B` | Minimalist financial dividers |
| Success | `#A8E66A` | Savings achieved & income credits |
| Danger / Expense | `#FF6868` | Expenses & budget overruns |
| Warning | `#FFD166` | 90% budget warning alerts |

---

## 🔒 Security & Privacy
- **Local-First**: Data never leaves your device unless you explicitly configure your personal Supabase credentials.
- **Client-Side Encryption**: Vault backups are encrypted with `AES-GCM (256-bit)` using `PBKDF2` key derivation with 100,000 iterations.
- **Zero Third-Party Trackers**: No analytics beacons, cookies, or hidden telemetry.
