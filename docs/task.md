# Temperature Automation Implementation Checklist

- [x] Create temperature automation state store (`src/lib/autoTempStore.ts`)
- [x] Create `/api/auto-temp` config API route (`src/app/api/auto-temp/route.ts`)
- [x] Integrate automation checking into GET `/api/devices` API route (`src/app/api/devices/route.ts`)
- [x] Add the third card "Automation" to container sub-options (`src/app/containers/[id]/page.tsx`)
- [x] Implement the Automation page (`src/app/containers/[id]/auto-temp/page.tsx`)
- [x] Verify build and execution locally

## Temperature Email Alerts Checklist
- [x] Extend persistent state store with email config and drift timers (`src/lib/autoTempStore.ts`)
- [x] Create server-side email dispatch utility with Resend/Sandbox modes (`src/lib/alerts.ts`)
- [x] Update backend `/api/auto-temp` API route to support email config updates (`src/app/api/auto-temp/route.ts`)
- [x] Implement email alert configuration modal in front-end UI dashboard (`src/app/containers/[id]/auto-temp/page.tsx`)
- [x] Verify build and local execution
