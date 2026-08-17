# Horizon Architecture and Product Evolution

## Product Position

Horizon v1.1.0 is a **local-first desktop control center**. Its initial job is to provide a clear operator experience for a demo home and a safe, user-authorized connection to a Home Assistant hub. It is not a replacement for a certified Matter controller, an automation hub, or a multi-tenant cloud platform.

| Layer | v1.1.0 responsibility | Boundary |
| --- | --- | --- |
| Desktop UI | Dashboard, rooms, device state, local demo controls, energy/security views, automation catalogue, and connection workflow. | React state is for presentation and local demo behavior; it does not persist credentials. |
| Desktop core | Validates Home Assistant URLs, maintains a runtime-only session, fetches entities, and sends compatible service commands. | Rust owns access tokens and HTTP requests. |
| Home automation hub | Device discovery, protocol radios, entity state, authorization, and service execution. | Home Assistant remains the source of truth for imported entities. |
| Future integration adapters | Matter, MQTT, Zigbee, Z-Wave, vendor clouds, and voice interfaces. | None is represented as implemented until an adapter, contract, and test suite exist. |

## Implemented Connection Flow

1. The operator enters a trusted Home Assistant URL and a long-lived access token in the desktop connection dialog.
2. The Rust core normalizes an HTTP(S) URL, verifies `/api/`, and requests `/api/config` for a display-only hub version when available.
3. The token and base URL remain in an in-memory `Mutex<Option<HomeAssistantSession>>`; there is no disk persistence path.
4. The client requests `/api/states`, filters supported domains, and maps entities into the Horizon device model.
5. When an actuator is toggled, Horizon calls `/api/services/{domain}/{service}` with the target entity. Sensors remain read-only in the current UI.
6. A disconnect action clears the in-memory session and removes imported entities from the UI.

Home Assistant documents both JSON REST entity discovery and service actions using bearer tokens. [1] A production v1.2 should add the official WebSocket event stream for low-latency state updates, heartbeats, reconnection, and subscription-based UI refresh. [2]

## Security Model

> The desktop front end should be treated as an untrusted presentation boundary. Network credentials and privileged calls belong in the Rust core, with narrowly scoped commands exposed to the UI.

Tauri's capability system is designed to constrain frontend access to core and plugin APIs and mitigate the impact of a frontend compromise. [3] The current application uses no file-system, shell, process, or remote-window permissions. Before adding plugins, contributors should create explicit capability files and grant the least set of permissions necessary for each window.

| Security decision | Current behavior | Production follow-up |
| --- | --- | --- |
| Credential storage | Session memory only; cleared on disconnect or exit. | Use OS credential storage only after an opt-in UX and threat review. |
| Transport | Allows HTTP or HTTPS for local development and existing local hubs. | Warn for plain HTTP, default to HTTPS, and add certificate error UX. |
| Input validation | Restricts hub endpoints to HTTP(S) URLs and controls to supported domains/actions. | Add allowlisted local-network policy, SSRF safeguards, and integration-level scopes. |
| Device commands | Uses the connected hub's bearer token and documented service endpoints. | Add confirmation for security-critical actions and audit records. |
| UI permissions | No extra Tauri plugins or system access. | Add explicit capability manifests as features require them. |

## Delivery Milestones

| Milestone | Outcome | Exit criteria |
| --- | --- | --- |
| v1.1 — Control center | Completed dashboard and authenticated Home Assistant REST connection. | TypeScript build, Rust compile check, manual connection test, and Windows installer smoke test. |
| v1.2 — Live operations | WebSocket subscriptions, reconnect state machine, entity search/filtering, accessible keyboard flows, and durable settings. | Integration tests against a disposable Home Assistant instance and offline/reconnect test matrix. |
| v1.3 — Automation authoring | Visual trigger/condition/action builder, simulation, local audit log, and safety confirmation for locks/covers. | Rule validation, undo model, test fixtures, and product security review. |
| v1.4 — Protocol strategy | MQTT adapter plus certified-controller bridge research for Matter; Zigbee/Z-Wave through existing hubs rather than raw-radio claims. | Adapter contracts, vendor/license review, and device compatibility matrix. |
| v2.0 — Commercial operations | Signed installers, update channel, localization, support telemetry with consent, role model, and commercial packaging. | Windows code-signing, privacy review, incident plan, support SLA, and paid-pilot cohort. |

## Commercial Readiness Checklist

A market release should not be labeled enterprise-grade until the following are complete:

| Workstream | Required evidence |
| --- | --- |
| Quality | Automated unit/integration tests, Windows smoke tests, crash reporting policy, and reproducible release build. |
| Security | Dependency scanning, secret scanning, signed release artifacts, threat model, vulnerability disclosure process, and secure update plan. |
| Privacy | Data inventory, lawful basis where relevant, privacy notice, opt-in analytics, retention schedule, and data-subject request workflow. |
| Commercial | Target customer profile, pricing hypothesis, customer-support workflow, terms, licensing model, and a pilot feedback loop. |
| Compatibility | Supported Home Assistant versions, network topologies, device-domain coverage, and known limitations. |

## References

[1]: https://developers.home-assistant.io/docs/api/rest "Home Assistant REST API"
[2]: https://developers.home-assistant.io/docs/api/websocket/ "Home Assistant WebSocket API"
[3]: https://v2.tauri.app/security/capabilities/ "Tauri Capabilities and Security Boundaries"
