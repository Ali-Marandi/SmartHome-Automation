# Horizon Desktop API Reference

**API version:** 1.0
**Application release:** v1.1.2
**Transport:** Tauri command IPC from an approved desktop webview to the Rust core
**Encoding:** JSON request and response payloads

> This document describes the **local desktop API**. It is not an unauthenticated network server and does not expose Home Assistant tokens to JavaScript callers or external modules. Commands are asynchronous where they perform network I/O.

## 1. Invocation Model

Horizon uses Tauri commands. A trusted frontend or future signed module calls a command with `invoke`, awaits a JSON response, and handles a rejected promise for command errors.

```ts
import { invoke } from '@tauri-apps/api/core';

const forecast = await invoke<EnergyForecast>('forecast_energy_usage', {
  samples,
  horizonHours: 24,
});
```

Tauri commands accept an object with **camelCase argument names**. Returned values follow the `serde` configuration specified for each structure. [1]

## 2. Shared Data Types

### 2.1 Energy sample

```ts
export type EnergySample = {
  /** ISO-8601 UTC time at which the sample was measured. */
  timestamp: string;
  /** Local hour from 0 through 23. */
  hour: number;
  /** Finite, non-negative kilowatt measurement. */
  usageKw: number;
};
```

| Field | Validation | Notes |
| --- | --- | --- |
| `timestamp` | Required, non-empty string | The v1.1.2 core validates presence but does not parse the timestamp beyond this. Modules must send UTC ISO-8601 strings. |
| `hour` | Integer `0`–`23` | Used for time-of-day baseline grouping. |
| `usageKw` | Finite number `>= 0` | Use whole-home consumption or a consistently normalized scope. Do not mix watts and kilowatts. |

### 2.2 Energy forecast

```ts
export type ForecastPoint = {
  hour: number;
  predictedKw: number;
  lowerKw: number;
  upperKw: number;
  sourceSamples: number;
};

export type EnergyForecast = {
  methodology: string;
  confidence: number;
  observationCount: number;
  forecast: ForecastPoint[];
  totalKwh: number;
  dataQualityNote: string;
};
```

The forecast is an explainable local model: 75% hourly historical baseline plus 25% exponentially weighted recent demand. The confidence score reflects sample count, hourly coverage, and volatility; it is **not** an accuracy guarantee. Horizon requires at least six valid samples and accepts a 1–48 hour forecast horizon.

### 2.3 Home Assistant entity

```ts
export type HomeAssistantEntity = {
  entity_id: string;
  state: string;
  name: string;
  domain: 'light' | 'switch' | 'climate' | 'sensor' | 'binary_sensor' | 'lock' | 'cover';
  last_changed: string;
  attributes: Record<string, unknown>;
};
```

The entity model follows the Home Assistant state response and preserves `entity_id` and `last_changed` in snake case for compatibility with the upstream API. [2]

### 2.4 Connection status

```ts
export type ConnectionStatus = {
  connected: boolean;
  host?: string;
  version?: string;
  message: string;
};
```

## 3. Forecast Commands

### `forecast_energy_usage`

Generates a local adaptive energy forecast from normalized sample history.

```ts
const forecast = await invoke<EnergyForecast>('forecast_energy_usage', {
  samples: [
    { timestamp: '2026-08-18T15:00:00Z', hour: 15, usageKw: 2.18 },
    { timestamp: '2026-08-18T18:00:00Z', hour: 18, usageKw: 1.96 },
    // At least six samples are required.
  ],
  horizonHours: 24,
});
```

| Argument | Type | Required | Rules |
| --- | --- | --- | --- |
| `samples` | `EnergySample[]` | Yes | Minimum six samples; all sample fields must be valid. |
| `horizonHours` | `number` | No | Defaults to `24`; must be an integer from `1` through `48`. |

| Response field | Meaning |
| --- | --- |
| `forecast` | Ordered forecast points beginning one hour after the most recent supplied sample hour. |
| `predictedKw` | Blended local prediction. |
| `lowerKw` / `upperKw` | Volatility-derived planning band; do not interpret as a statistical guarantee. |
| `totalKwh` | Sum of the hourly kW predictions over the requested horizon, treated as hourly kWh. |
| `confidence` | 0–95 score based on available history and observed variability. |
| `dataQualityNote` | Human-readable safety context for the current sample quality. |

| Error | Cause |
| --- | --- |
| `At least six non-negative energy samples are required for a forecast.` | Insufficient history. |
| `Forecast horizon must be between 1 and 48 hours.` | Horizon is out of range. |
| `Every energy sample must include an ISO-8601 timestamp.` | Empty timestamp. |
| `Energy sample hour must be between 0 and 23.` | Invalid time-of-day field. |
| `Energy usage must be a finite, non-negative value in kW.` | Invalid or negative power reading. |

## 4. Home Assistant Commands

### `connect_home_assistant`

Creates an in-memory session with a trusted Home Assistant server. The token is not persisted to disk by Horizon.

```ts
const status = await invoke<ConnectionStatus>('connect_home_assistant', {
  credentials: {
    url: 'https://home.example.net:8123',
    token: '<long-lived-access-token>',
  },
});
```

| Argument | Type | Notes |
| --- | --- | --- |
| `credentials.url` | `string` | Must be a valid `http` or `https` URL. Use HTTPS for non-local deployments. |
| `credentials.token` | `string` | Home Assistant long-lived access token. Never log, store in widget preferences, or pass to an external module. |

The command verifies `/api/` and attempts `/api/config`. Home Assistant documents bearer-token access and JSON API responses for these routes. [2]

### `get_home_assistant_entities`

Returns supported entity domains from the current session.

```ts
const entities = await invoke<HomeAssistantEntity[]>('get_home_assistant_entities');
```

The current support filter is: `light`, `switch`, `climate`, `sensor`, `binary_sensor`, `lock`, and `cover`. A rejected call indicates that no session exists or the remote hub returned an error.

### `control_home_assistant_entity`

Calls a compatible Home Assistant service for an imported actuator.

```ts
await invoke('control_home_assistant_entity', {
  entityId: 'light.living_room',
  action: 'toggle',
});
```

| Argument | Type | Allowed values |
| --- | --- | --- |
| `entityId` | `string` | A Home Assistant entity ID in a supported controllable domain. |
| `action` | `string` | `on`, `off`, or `toggle`. |

The command only permits `light`, `switch`, `climate`, `lock`, and `cover` domains. Sensors are intentionally read-only. Horizon maps actions to the corresponding Home Assistant `turn_on`, `turn_off`, or `toggle` service and includes the entity ID in the service body. [2]

### `disconnect_home_assistant`

Clears the in-memory Home Assistant session.

```ts
await invoke('disconnect_home_assistant');
```

## 5. Legacy Internal Commands

These commands remain available for the existing desktop shell. New modules should prefer the forecast contract and the documented extension manifest rather than assume that the internal AI engine represents production-grade AI execution.

| Command | Request | Response | Status |
| --- | --- | --- | --- |
| `get_device_status` | None | JSON string containing a legacy demo device list | Legacy demo support |
| `run_predictive_analysis` | `{ telemetry: { device_id, power_usage_watts, temperature_celsius, vibration_hz, operating_hours } }` | `{ device_id, anomaly_score, risk_level, recommended_action }` | Threshold-based maintenance demonstrator |
| `query_local_ai` | `{ prompt: string }` | `string` | Keyword-routing demonstrator; not an LLM connector |

## 6. Extension Capability Contract

A signed module runtime is a **documented v1.1.2 contract**, not yet a dynamic loader shipped in the release. Implementers should use it to build adapters against the next plugin milestone.

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

| Field | Requirement |
| --- | --- |
| `manifestVersion` | Must be `1.0` for the initial contract. |
| `id` | Stable reverse-DNS identifier. |
| `horizonApi` | SemVer compatibility range validated before activation. |
| `capabilities` | Least-privilege declarations only; no implicit network, filesystem, or token access. |
| `entry.commandNamespace` | Namespaced command prefix; collisions are rejected. |
| `dataSchemas` | Versioned normalized payload schemas. |

Future Tauri modules should package a Rust crate with optional JavaScript bindings and define explicit command permissions. [3] A module that provides `energy.samples.read` may submit `EnergySample[]` to the forecast command but must not receive the Home Assistant token or arbitrary access to the Rust HTTP client.

## 7. Error Handling and Versioning

Treat command rejections as user-safe failures. Do not expose raw network topology, access tokens, or exception traces in a module UI. Map errors to a module-local action such as retry, configuration correction, or permission request.

All payload contracts are versioned through this API document and the future module manifest. Backward-compatible fields may be added. Removing or changing field meaning requires a new API major version and a new schema identifier.

## References

[1]: https://v2.tauri.app/develop/calling-rust/ "Tauri command IPC documentation"
[2]: https://developers.home-assistant.io/docs/api/rest/ "Home Assistant REST API documentation"
[3]: https://v2.tauri.app/develop/plugins/ "Tauri plugin development and command permissions"
