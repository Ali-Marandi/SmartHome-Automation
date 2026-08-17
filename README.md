# Horizon Smart Home Control Center

[![Release](https://img.shields.io/github/v/release/Ali-Marandi/SmartHome-Automation)](https://github.com/Ali-Marandi/SmartHome-Automation/releases)
[![Desktop](https://img.shields.io/badge/Desktop-Windows%20%7C%20Tauri-7259ED)](https://tauri.app/)

**Horizon** is a local-first Windows desktop control center for a smart home. Version **1.1.2** adds an explainable local energy forecast, advanced light/dark/system appearance controls, personalized dashboard widgets, a v1.1.1 build-and-stability report, and a documented extension API to the functional Tauri control center.

> Horizon does not require a cloud account for its demo workspace. When a Home Assistant server is connected, its long-lived token is retained **only in the running app process** and is cleared at disconnect or app exit.

## Implemented in v1.1.2

| Area | Delivered capability |
| --- | --- |
| Control center | Responsive overview, device grouping, active-state controls, favorites, real-time notices, and compact-window navigation. |
| Energy intelligence | Live consumption, daily profile visualization, and a deterministic 1–48 hour time-of-day weighted forecast with confidence and data-quality context. |
| Personal workspace | High-contrast advanced dark mode, light/system options, and local widget show/hide/reorder preferences for the dashboard. |
| Security | Local demo perimeter status, access-point summary, integrity indicators, and away-protection action. |
| Automations | A local automation catalogue with enable/disable controls and a clearly marked rule-builder milestone. |
| Home Assistant | Authenticated REST connection; discovery of supported `light`, `switch`, `climate`, `sensor`, `binary_sensor`, `lock`, and `cover` entities; and service control for compatible actuators. |
| Desktop packaging | Tauri v2 metadata, platform icons, a Windows-targeted release workflow, and strict frontend/Rust compile validation. |

## Deliberate Scope Boundaries

This release is an **initial control-center product**, not a claim of universal protocol support. Direct Matter commissioning, MQTT broker management, Zigbee/Z-Wave radio control, cloud synchronization, multi-user administration, persistent credential storage, and production AI actions are **roadmap items**. The user interface labels those capabilities accordingly instead of representing them as finished functionality.

## Architecture

Horizon uses **React + TypeScript + Vite** for the user experience and **Tauri v2 + Rust** for the desktop boundary. The Rust process owns the Home Assistant connection and performs authenticated HTTPS requests; the UI never persists access tokens in browser storage. The application communicates with Home Assistant's JSON REST API to read entity states and call domain services. See [ARCHITECTURE.md](ARCHITECTURE.md) for the product and security design.

## Run Locally

### Prerequisites

Install [Node.js](https://nodejs.org/), [pnpm](https://pnpm.io/), and the current stable [Rust toolchain](https://www.rust-lang.org/tools/install). Windows contributors also need the Microsoft C++ Build Tools and WebView2 Runtime required by Tauri.

```bash
pnpm install
pnpm typecheck
pnpm frontend:build
pnpm dev
```

To create a platform-native production bundle:

```bash
pnpm build
```

On Windows, Tauri produces an installer artifact under `src-tauri/target/release/bundle/`.

## Connect Home Assistant

Open **Settings → Connect Home Assistant**, then provide the URL of a trusted Home Assistant instance and a long-lived access token from that instance's profile. Use a local HTTPS endpoint whenever possible. The app validates the connection, imports supported entities, and sends control requests only to the host you entered.

The integration uses Home Assistant’s official REST interface for `/api/states` discovery and `/api/services/{domain}/{service}` actions. [1]

## API and Developer Documentation

The complete IPC command contracts, normalized energy schemas, extension manifest direction, error model, and Home Assistant boundaries are documented in [API_REFERENCE.md](docs/API_REFERENCE.md). The module onboarding, security requirements, energy-adapter example, development workflow, and validation gates are documented in [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md). The evidence-based prior-release assessment is available in [V1.1.1_TEST_REPORT.md](docs/V1.1.1_TEST_REPORT.md).

## Release Process

The repository includes a GitHub Actions release workflow for tags in the form `v*`. A release should be created only after the Windows installer is tested on a clean Windows machine and its checksum, installer behavior, and release notes are reviewed. Use a release draft for final stakeholder approval before publishing.

## Development Notes

The project uses `pnpm typecheck` for strict TypeScript validation and `cargo check` for Rust validation. The lockfiles are committed to make builds reproducible. Do not commit Home Assistant tokens, GitHub tokens, or other credentials to the repository.

## References

[1]: https://developers.home-assistant.io/docs/api/rest "Home Assistant REST API documentation"

---
Developed by [Ali-Marandi](https://github.com/Ali-Marandi)
