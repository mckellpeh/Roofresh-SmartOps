# Roofresh SmartOps - Release Notes v2.0.0

Welcome to **Version 2.0.0** of the Roofresh mushroom container climate management app! This release focuses on consolidating all climate analytics into a premium, widescreen single-page command center, and introducing fully automated temperature-triggered AC controls for mushroom cultivation.

---

## 🚀 Key Highlights & New Features

### 1. Consolidated Widescreen Analytics Cockpit (`/analytics`)
*   **Single-Page Command Center:** Merged all previously separate summary cards and detailed graph pages into a single, high-fidelity Analytics Cockpit.
*   **Widescreen High-Density Charts:** Temperature and Humidity timelines are now displayed in stunning `1100px` widescreen charts.
*   **Interactive Scroll-Wheel Zoom & Scale:** Scrolling your mouse or trackpad wheel directly over the charts dynamically zooms the timeline (from a 7-day overview down to a highly granular 24-hour hour-by-hour snapshot) while automatically blocking background page scrolling.
*   **Dynamic Stats Recalculation:** Summary stats at the top (`Avg Temp`, `Max Temp`, `Min Temp`, and `Avg Humidity`) now calculate values in real-time, representing only the timeline points currently visible in your active viewport.
*   **iOS-Style Option Switches:** Placed right below the charts for toggling calculated metrics like Absolute Humidity, Dew Point, and Vapor-pressure Deficit (VPD).
*   **Standardized Terminology:** Unified all relative humidity UI elements under the standard correct term **"Humidity"**.

### 2. Auto-Climate Regulation & Automated AC Triggering
*   **Background Cron/Loop Job:** Runs every 30 seconds to fetch live container climate data and compare it against target thresholds.
*   **SwitchBot API Power Controls:** Automatically sends power signals to container AC units:
    *   **Overheating (Temp > Threshold):** Automatically fires a `turnOn` and setting configurations payload.
    *   **Undercooled (Temp < Threshold - Buffer):** Automatically triggers a `turnOff` command to preserve optimal mushroom growth heat.
*   **State Store & Persistence:** Configured in `src/config/auto-temp-state.json` to monitor state and avoid redundant command spamming.
*   **Test Alerting Suite:** Programmed in `src/lib/alerts.ts` to push instant telemetry notifications using verification emails.

### 3. Container Pairing Connection Fallback
*   Integrated a elegant connection pending fallback for **Container 2 (Right)**. Toggling between containers instantly transitions the stats, graphs, switches, and log lists on-screen, displaying helpfulペアリング pending fallbacks.

---

## 🛠️ Complete Codebase Diff & Changes Checklist

*   **[MODIFY]** [`src/app/analytics/page.tsx`](file:///d:/3.%20Work/1.%20Roofresh%20startup/Antigravity%20Project/src/app/analytics/page.tsx) — Merged drill-down subpages, widescreen charts, scroll-wheel zoom, and hover static block fixes.
*   **[MODIFY]** [`src/app/globals.css`](file:///d:/3.%20Work/1.%20Roofresh%20startup/Antigravity%20Project/src/app/globals.css) — Added `.glass-panel.static` modifiers.
*   **[DELETE]** [`src/app/analytics/[id]`](file:///d:/3.%20Work/1.%20Roofresh%20startup/Antigravity%20Project/src/app/analytics) — Safely deleted the old detailed pages directory to avoid route duplication.
*   **[NEW]** [`src/lib/autoTempStore.ts`](file:///d:/3.%20Work/1.%20Roofresh%20startup/Antigravity%20Project/src/lib/autoTempStore.ts) — Dynamic automatic thermostat state monitor.
*   **[NEW]** [`src/lib/deviceHistoryStore.ts`](file:///d:/3.%20Work/1.%20Roofresh%20startup/Antigravity%20Project/src/lib/deviceHistoryStore.ts) — Custom mock sensor database for Container 1 history.
*   **[NEW]** [`src/app/api/auto-temp/route.ts`](file:///d:/3.%20Work/1.%20Roofresh%20startup/Antigravity%20Project/src/app/api/auto-temp/route.ts) — REST endpoint to update auto-AC automation configurations.

---

## 📊 Deployment & Release Plan
*   **Local Build Validation:** Passed next dynamic route checks with exit code 0.
*   **Continuous Integration Deployment:** Stage all modified files in git, commit under tag `v2.0.0`, and push to `origin/main` to trigger the automated live Vercel deploy.
