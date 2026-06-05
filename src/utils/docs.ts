export interface DocSection {
  title: string;
  description: string;
  markdownCode: string;
}

export const DEVELOPER_DOCS: DocSection[] = [
  {
    title: "1. System Onboarding & Architecture",
    description: "Get to know the hybrid reactive architecture of the AttendX application.",
    markdownCode: `### Hybrid Reactive Stack
AttendX is engineered on a high-efficiency single page architecture designed to run on **completely free parameters** or scale dynamically to enterprise frameworks:
1. **Frontend Core:** React 19 + TypeScript + Tailwind CSS v4.
2. **State Management:** Strict Client-Side Reactive State with automatic sync backports.
3. **Database Sink:** Live Google Firebase Firestore synchronizer (Enterprise and Standalone limits supported).
4. **Fallback Mode:** Complete Offline-First LocalStorage cache replication. If Firebase is offline, the app works seamlessly with no degradation.

### Directory Structure & File Index
- \`/src/types.ts\`: Fully declared, strictly bounded entities.
- \`/src/seedData.ts\`: High-fidelity initial seed data to enable instant localized simulation.
- \`/src/firebase-service.ts\`: Firebase SDK setup, relational verification, and error analytics.
- \`/src/utils/testRunner.ts\`: Automated Unit testing diagnostics and microbenchmarks.
- \`/firestore.indexes.json\`: Production composite indexing configurations.
- \`/.github/workflows/deploy.yml\`: Continuous quality and deployment pipelines.`
  },
  {
    title: "2. Firestore Data Indexing Protocols",
    description: "Configuring composite databases to prevent Wallet Poisoning and slow reads.",
    markdownCode: `### Efficient Query Indexing
Firestore requires indexes for sorting on secondary criteria or composite filters. Our production database index maps the following configurations:

\`\`\`json
{
  "indexes": [
    {
      "collectionGroup": "attendance",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "empId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "attendance",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ]
}
\`\`\`

### Guidelines to Minimize Read Exertions
1. **Never delegate sorting to client arrays:** Ensure composite collections are filtered directly via compound query parameters in Firestore.
2. **Rule Level Safeguard:** The Firestore security configuration forbids client scrapers from querying index variables without matching authentication parameters.`
  },
  {
    title: "3. CI / CD Pipeline Specifications",
    description: "GitHub actions building, linting, testing, and multi-tenant live deployments.",
    markdownCode: `### Github Actions Automation Blueprint
The integrated workflow file \`deploy.yml\` runs automatically on every main push:

\`\`\`yaml
name: AttendX CI/CD Pipeline
on: [push, pull_request]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18, cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --run # Triggers unit test validations
      - run: npm run build
\`\`\`

### Deployment Targets
- **Netlify Drop / Hosting (Zero Cost):** Simply drag the compiled \`dist/\` folder to hosting mirrors for free serverless deployments.
- **Firebase Web Hosting:** Run \`firebase deploy\` to bind the PWA to custom secure subdomains.`
  },
  {
    title: "4. Integrations API Reference & Service Monitoring",
    description: "How to connect AttendX to external HR systems or setup analytical telemetry trackers.",
    markdownCode: `### External Integrations REST API Proxy
For developers who want to synchronize AttendX punches with external ERP software (like SAP or Oracle HCM), the system exposes a secure programmatic bridge.

\`\`\`typescript
// Call this endpoint to push punch records to your enterprise reporting sink
POST /api/v1/integrations/attendance/sync
Header: Authorization: Bearer <INTEGRATIONS_TOKEN>
Body: {
  empId: "EMP001",
  date: "2026-06-03",
  punchInTime: "09:15 AM",
  punchOutTime: "06:00 PM",
  gpsIn: { lat: 13.0827, lng: 80.2707 },
  taskId: "TSK-20260603-001"
}
Response: 201 Created { status: "synchronized_with_external_ledger", transactionId: "tx_abc123" }
\`\`\`

### Analytical Telemetry & Error Tracking
If a Firestore operation fails, AttendX serializes rich debugging metadata into standard JSON for instant error monitoring platforms (like Sentry, LogRocket, or GCP Cloud Logging):

\`\`\`typescript
interface TelemetryLog {
  timestamp: string;
  level: "error" | "warn" | "info";
  errorContext: FirestoreErrorInfo; // Defined in firebase-service
  performanceMetric: {
    operationLatencyMs: number;
    networkState: "online" | "offline";
  }
}
\`\`\`

By capturing \`JSON.stringify(errorInfo)\`, administrators see exactly who, which device, and what path triggered a security violation in real-time.`
  }
];
