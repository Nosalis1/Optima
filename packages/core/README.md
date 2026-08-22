# apm-optima

> Lightweight, real-time Application Performance Monitoring (APM) and telemetry library for Node.js web applications.

<div align="center">

[![npm version](https://img.shields.io/npm/v/apm-optima.svg?style=flat-square&color=fc6c26)](https://www.npmjs.com/package/apm-optima)
[![license](https://img.shields.io/github/license/Nosalis1/Optima?style=flat-square&color=8A897C)](https://github.com/Nosalis1/Optima/blob/main/LICENSE)
[![github](https://img.shields.io/badge/github-repo-blue?logo=github)](https://github.com/Nosalis1/Optima.git)

</div>

## Features

- **Real-Time Telemetry:** HTTP request latency, status codes, and throughput.
- **Node.js Diagnostics:** Event Loop lag monitoring, process memory distribution, and active handles.
- **Embedded Dashboard UI:** Instant built-in dashboard available directly at your metrics route.
- **Console Logger:** Pretty-printed HTTP request duration and status output.

---

## Installation

```bash
npm install apm-optima
```

---

## Quick Start (Express)

```typescript
const express = require('express');
const { setupOptima } = require('apm-optima/express');

const app = express();
app.use(express.json());

// Initialize Optima telemetry & embed UI
const optima = setupOptima(app, {
  dashboardPath: '/optima-metrics',
  publisher: {
    intervalMs: 1000,
    slowLatencyThresholdMs: 500,
  },
});

app.get('/api/v1/resource', (req, res) => {
  res.json({ status: 'ok' });
});

const server = app.listen(3000, () => {
  console.log('Server running on port 3000');
});

// Attach WebSocket server & background timers
const stopMetrics = optima.attachServer(server);
```

---

## Quick Start (NestJS)

```ts
import { Module } from '@nestjs/common';
import { MetricsModule } from 'apm-optima/nest';

@Module({
  imports: [
    MetricsModule.forRoot({
      dashboardPath: '/optima-metrics',
      publisher: {
        intervalMs: 1000,
        slowLatencyThresholdMs: 500,
      },
      excludePaths: ['/health'],
    }),
  ],
})
export class AppModule {}
```

## Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `dashboardPath` | `string \| false` | `/optima-metrics` | Route endpoint for serving the embedded UI (`false` to disable). |
| `simulation` | `false \| { intervalMs: number, requestsPerTick: number }` | `false` | Generates synthetic traffic for local testing and load simulation. |
| `publisher.intervalMs` | `number` | `1000` | Broadcast interval (in ms) for pushing telemetry updates over WebSockets. |
| `publisher.slowLatencyThresholdMs` | `number` | `500` | Latency limit in milliseconds above which requests are flagged as slow. |
| `publisher.eventLoopLagThresholdMs` | `number` | `50` | Event Loop delay threshold in milliseconds for triggering lag alerts. |
| `publisher.eventLoopResolutionMs` | `number` | `10` | Sampling resolution interval for computing Event Loop delay. |
| `tickIntervalMs` | `number` | `250` | Resolution interval for recalculating internal metrics and buckets. |
| `excludePaths` | `string[]` | `['/_next/*','/_next/**','*.map','/favicon.ico','/metrics_pack']` | Array of route patterns or paths to skip from metric collection (e.g., `/health`). |
| `consoleLog` | `boolean` | `false` | Enables logging internal system events and alerts to `stdout`. |
| `ringBufferSize` | `number` | `60` | Capacity of the internal ring buffer used for storing time-series data. |
| `alertBufferSize` | `number` | `100` | Maximum capacity of the buffer holding recent alerts and detected anomalies. |

## License

[MIT](LICENSE)
