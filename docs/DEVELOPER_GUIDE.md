# Horizon Developer and Module Integration Guide

## 1. Purpose and Scope

Horizon is a Tauri desktop control center with a React/TypeScript interface and a Rust core. Version v1.1.2 introduces a local energy-forecast command and documents an extension contract for future adapters.

> **Important:** v1.1.2 does not dynamically load third-party plugins yet. This guide provides the supported API, architecture, schemas, and security rules that adapters should follow before the signed-plugin runtime milestone.

## 2. Local Development Setup

Install a current Node.js LTS release, pnpm 11.20.0, Rust stable, and the platform prerequisites required by Tauri. On Windows, use Microsoft C++ Build Tools and a WebView2 Runtime. On Linux, install the WebKitGTK/Tauri development dependencies described in the Tauri prerequisites.

```bash
git clone https://github.com/Ali-Marandi/SmartHome-Automation.git
cd SmartHome-Automation
pnpm install --frozen-lockfile
pnpm typecheck
pnpm frontend:build
cd src-tauri && cargo test && cargo check
cd .. && pnpm dev
```

| Command | Purpose |
| --- | --- |
| `pnpm typecheck` | Strict TypeScript validation. |
| `pnpm frontend:build` | Vite production build without platform packaging. |
| `cargo test` | Executes Rust unit tests, including the energy forecast engine. |
| `cargo check` | Validates the Tauri/Rust core without creating a distributable package. |
| `pnpm build` | Builds the platform-native Tauri package. |

## 3. Repository Guide

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Desktop shell, local demo state, theme selector, widget preferences, and Tauri command invocation. |
| `src/index.css` | Responsive interface, advanced dark palette, forecast visuals, and widget-customization styling. |
| `src-tauri/src/main.rs` | Command registration, Home Assistant session boundary, and Tauri application bootstrap. |
| `src-tauri/src/energy_forecast.rs` | Explainable local forecast model and its unit tests. |
| `src-tauri/src/ai_engine.rs` | Existing threshold-based predictive-maintenance demonstrator. |
| `docs/API_REFERENCE.md` | Formal IPC command, payload, and extension-contract reference. |
| `docs/V1.1.1_TEST_REPORT.md` | Evidence-based build/performance/stability assessment for the prior release. |

## 4. Architecture Rules

The UI is a presentation boundary. Secrets, privileged HTTP requests, and command validation belong in Rust. Tauri commands are the typed request/response interface; use async commands for I/O and CPU-heavy work so the interface remains responsive. [1]

The current Home Assistant adapter stores its server URL and access token only in process memory. It calls the Home Assistant REST API for states and service actions. [2]

| Rule | Required practice |
| --- | --- |
| Do not expose credentials | Never return Home Assistant tokens to JavaScript, log them, place them in local storage, or include them in module config exports. |
| Validate at the Rust boundary | Treat every module or UI input as untrusted JSON; validate ranges, identifiers, and URLs before use. |
| Use normalized data | Submit kW-based `EnergySample` data with an ISO-8601 timestamp and hour `0`–`23`. |
| Preserve user control | Do not automate a physical device merely because a forecast exists; surface a proposed action and request confirmation. |
| Prefer capabilities | Future modules must declare individual capabilities and permissions. Tauri plugins support explicit command permission files and scopes. [3] |

## 5. Energy Data Adapter Pattern

A smart meter, inverter, circuit monitor, or billing-service adapter should first normalize its source data to `EnergySample`. The adapter must make its sampling cadence and scope clear. For example, a whole-home meter and a single HVAC circuit are both valid inputs only when they are not mixed in one history series.

```ts
import { invoke } from '@tauri-apps/api/core';

type EnergySample = {
  timestamp: string;
  hour: number;
  usageKw: number;
};

export async function requestDayAheadForecast(readings: Array<{ measuredAt: Date; watts: number }>) {
  const samples: EnergySample[] = readings.map((reading) => ({
    timestamp: reading.measuredAt.toISOString(),
    hour: reading.measuredAt.getUTCHours(),
    usageKw: Number((reading.watts / 1000).toFixed(4)),
  }));

  return invoke('forecast_energy_usage', {
    samples,
    horizonHours: 24,
  });
}
```

Before a production integration uses the forecast, it must:

1. Retain the original measured readings outside of the Horizon UI when retention is permitted.
2. Test the adapter against missing readings, zero usage, delayed timestamps, duplicate timestamps, and large but valid readings.
3. Back-test predictions against at least 30 days of actual readings and report MAE/MAPE in the adapter’s documentation.
4. Clearly label estimated, interpolated, and actual values.
5. Avoid charging, tariff, or savings claims until validated against the user’s jurisdiction and actual meter data.

## 6. Future Plugin Packaging Contract

Tauri plugins commonly comprise a Rust crate plus optional JavaScript bindings and explicit permissions. [3] A Horizon module should be organized as follows when the signed-plugin runtime becomes available:

```text
tauri-plugin-smart-meter/
├── src/
│   ├── lib.rs
│   ├── commands.rs
│   ├── models.rs
│   └── error.rs
├── permissions/
│   └── default.toml
├── guest-js/
│   └── index.ts
├── Cargo.toml
├── package.json
└── horizon.module.json
```

Example `horizon.module.json`:

```json
{
  "manifestVersion": "1.0",
  "id": "com.example.smart-meter",
  "name": "Example Smart Meter Adapter",
  "version": "0.1.0",
  "horizonApi": ">=1.0 <2.0",
  "capabilities": ["energy.samples.read"],
  "entry": {
    "type": "tauri-plugin",
    "commandNamespace": "plugin:smart-meter"
  },
  "dataSchemas": {
    "energySample": "horizon.energy-sample.v1"
  }
}
```

| Capability | Intended permission | Prohibited access |
| --- | --- | --- |
| `energy.samples.read` | Submit normalized readings to the forecast request flow. | Home Assistant token, arbitrary device control, filesystem access. |
| `entity.state.read` | Read normalized, scoped entity state after explicit user approval. | Raw integration credentials, arbitrary Home Assistant history export. |
| `automation.proposal.write` | Propose an automation for user review. | Automatic activation without a visible user confirmation step. |
| `widget.render` | Provide a schema-validated UI widget model. | Direct DOM injection, arbitrary executable scripts. |

## 7. Home Assistant Adapter Guidance

Home Assistant exposes JSON REST APIs with bearer authentication and a WebSocket API for live events. [2] [4] Horizon v1.1.2 uses REST. A future live adapter should authenticate over `/api/websocket`, subscribe to `state_changed`, correlate message IDs, unsubscribe cleanly, and provide a reconnect policy with exponential backoff.

Do not mistake an update to `/api/states/<entity_id>` for a physical-device command. Home Assistant documents that state updates may not communicate with a device; use the documented service endpoint for actuator actions. [2]

## 8. Testing Requirements

Every new command or module should include the following test layers before release.

| Layer | Minimum test |
| --- | --- |
| Rust unit tests | Valid input, minimum boundary, invalid range, and failure serialization. |
| TypeScript tests | Payload mapping, UI state transitions, and fallback-state visibility. |
| Integration tests | Disposable Home Assistant fixture for authorization, state read, service action, and error responses. |
| Resilience tests | Network timeout, invalid token, reconnect, and rate-limit behavior. |
| Security tests | Secret scan, malicious or oversized payload validation, scope check, and permission review. |
| Release test | Clean Windows install, launch, installer update, uninstall, and cryptographic digest verification. |

## 9. Contribution Workflow

1. Create a small, focused branch from `main`.
2. Add or update the command contract in `docs/API_REFERENCE.md` before changing UI consumers.
3. Add Rust validation and tests first; then wire the typed UI request.
4. Run `pnpm typecheck`, `pnpm frontend:build`, `cargo test`, `cargo check`, and `git diff --check`.
5. Do not commit tokens, certificates, production URLs, or generated `target/`, `dist/`, or `node_modules/` content.
6. Use a version tag only after the Windows workflow has produced a draft installer and the test report is updated.

## 10. Release and Support Notes

The GitHub workflow builds an NSIS installer on `windows-latest` for `v*` tags and creates a draft release. A human must verify the installer on a clean Windows system, review its SHA-256 digest, review release notes, and confirm publication. Commercial-scale distribution should add code signing, a vulnerability disclosure process, privacy documentation, and an update strategy.

## References

[1]: https://v2.tauri.app/develop/calling-rust/ "Tauri command IPC, async commands, and error handling"
[2]: https://developers.home-assistant.io/docs/api/rest/ "Home Assistant REST API"
[3]: https://v2.tauri.app/develop/plugins/ "Tauri plugins and command permissions"
[4]: https://developers.home-assistant.io/docs/api/websocket "Home Assistant WebSocket API"
