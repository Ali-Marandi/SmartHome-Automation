#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_engine;

use std::sync::Mutex;

use ai_engine::{query_local_ai, run_predictive_analysis};
use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::State;

#[derive(Debug, Clone, Deserialize)]
struct HomeAssistantCredentials {
    url: String,
    token: String,
}

#[derive(Debug, Clone)]
struct HomeAssistantSession {
    base_url: Url,
    token: String,
}

struct AppState {
    http: Client,
    session: Mutex<Option<HomeAssistantSession>>,
}

#[derive(Debug, Clone, Serialize)]
struct ConnectionStatus {
    connected: bool,
    host: Option<String>,
    version: Option<String>,
    message: String,
}

#[derive(Debug, Clone, Serialize)]
struct HomeAssistantEntity {
    entity_id: String,
    state: String,
    name: String,
    domain: String,
    last_changed: String,
    attributes: Value,
}

#[derive(Debug, Deserialize)]
struct RawEntity {
    entity_id: String,
    state: String,
    #[serde(default)]
    attributes: Value,
    #[serde(default)]
    last_changed: String,
}

fn api_url(session: &HomeAssistantSession, path: &str) -> Result<Url, String> {
    session
        .base_url
        .join(path)
        .map_err(|error| format!("Could not construct Home Assistant API URL: {error}"))
}

fn sanitize_base_url(raw_url: &str) -> Result<Url, String> {
    let trimmed = raw_url.trim();
    if trimmed.is_empty() {
        return Err("Home Assistant URL is required.".to_string());
    }

    let normalized = if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    };

    let mut url = Url::parse(&normalized)
        .map_err(|_| "Enter a valid HTTP(S) Home Assistant URL.".to_string())?;

    if url.scheme() != "http" && url.scheme() != "https" {
        return Err("Only HTTP and HTTPS Home Assistant endpoints are supported.".to_string());
    }

    url.set_path(&format!("{}/", url.path().trim_end_matches('/')));
    url.set_query(None);
    url.set_fragment(None);
    Ok(url)
}

fn friendly_name(entity: &RawEntity) -> String {
    entity
        .attributes
        .get("friendly_name")
        .and_then(Value::as_str)
        .map(ToString::to_string)
        .unwrap_or_else(|| entity.entity_id.replace('_', " "))
}

async fn fetch_entities(
    http: &Client,
    session: &HomeAssistantSession,
) -> Result<Vec<HomeAssistantEntity>, String> {
    let url = api_url(session, "api/states")?;
    let response = http
        .get(url)
        .bearer_auth(&session.token)
        .send()
        .await
        .map_err(|error| format!("Unable to reach Home Assistant: {error}"))?;

    let response = response
        .error_for_status()
        .map_err(|error| format!("Home Assistant rejected the request: {error}"))?;

    let raw_entities: Vec<RawEntity> = response
        .json()
        .await
        .map_err(|error| format!("Home Assistant returned invalid entity data: {error}"))?;

    const SUPPORTED_DOMAINS: [&str; 7] = [
        "light",
        "switch",
        "climate",
        "sensor",
        "binary_sensor",
        "lock",
        "cover",
    ];

    Ok(raw_entities
        .into_iter()
        .filter_map(|entity| {
            let domain = entity.entity_id.split('.').next()?.to_string();
            if !SUPPORTED_DOMAINS.contains(&domain.as_str()) {
                return None;
            }

            Some(HomeAssistantEntity {
                entity_id: entity.entity_id.clone(),
                state: entity.state.clone(),
                name: friendly_name(&entity),
                domain,
                last_changed: entity.last_changed,
                attributes: entity.attributes,
            })
        })
        .collect())
}

#[tauri::command]
async fn connect_home_assistant(
    credentials: HomeAssistantCredentials,
    state: State<'_, AppState>,
) -> Result<ConnectionStatus, String> {
    if credentials.token.trim().is_empty() {
        return Err("A Home Assistant long-lived access token is required.".to_string());
    }

    let base_url = sanitize_base_url(&credentials.url)?;
    let api_url = base_url
        .join("api/")
        .map_err(|error| format!("Could not construct Home Assistant API URL: {error}"))?;

    let response = state
        .http
        .get(api_url)
        .bearer_auth(credentials.token.trim())
        .send()
        .await
        .map_err(|error| format!("Unable to reach Home Assistant: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Home Assistant rejected the connection: {error}"))?;

    let details: Value = response
        .json()
        .await
        .map_err(|error| format!("Home Assistant returned an invalid API response: {error}"))?;

    let config_url = base_url
        .join("api/config")
        .map_err(|error| format!("Could not construct Home Assistant configuration URL: {error}"))?;
    let config: Value = match state
        .http
        .get(config_url)
        .bearer_auth(credentials.token.trim())
        .send()
        .await
    {
        Ok(response) => match response.error_for_status() {
            Ok(response) => response.json::<Value>().await.unwrap_or_else(|_| json!({})),
            Err(_) => json!({}),
        },
        Err(_) => json!({}),
    };

    let session = HomeAssistantSession {
        base_url,
        token: credentials.token.trim().to_string(),
    };
    let host = session.base_url.host_str().map(ToString::to_string);
    let version = config
        .get("version")
        .and_then(Value::as_str)
        .or_else(|| details.get("message").and_then(Value::as_str))
        .map(ToString::to_string);

    *state
        .session
        .lock()
        .map_err(|_| "Could not securely update the connection session.".to_string())? = Some(session);

    Ok(ConnectionStatus {
        connected: true,
        host,
        version,
        message: "Connected securely for this application session. Credentials are not persisted to disk."
            .to_string(),
    })
}

#[tauri::command]
async fn get_home_assistant_entities(
    state: State<'_, AppState>,
) -> Result<Vec<HomeAssistantEntity>, String> {
    let session = state
        .session
        .lock()
        .map_err(|_| "Could not read the connection session.".to_string())?
        .clone()
        .ok_or_else(|| "Connect a Home Assistant hub first.".to_string())?;

    fetch_entities(&state.http, &session).await
}

#[tauri::command]
async fn control_home_assistant_entity(
    entity_id: String,
    action: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session = state
        .session
        .lock()
        .map_err(|_| "Could not read the connection session.".to_string())?
        .clone()
        .ok_or_else(|| "Connect a Home Assistant hub first.".to_string())?;

    let domain = entity_id
        .split('.')
        .next()
        .ok_or_else(|| "Invalid Home Assistant entity identifier.".to_string())?;

    const CONTROLLABLE_DOMAINS: [&str; 5] = ["light", "switch", "climate", "lock", "cover"];
    if !CONTROLLABLE_DOMAINS.contains(&domain) {
        return Err("This entity is read-only in the current control center.".to_string());
    }

    let service = match action.as_str() {
        "on" => "turn_on",
        "off" => "turn_off",
        "toggle" => "toggle",
        _ => return Err("Unsupported device action.".to_string()),
    };

    let url = api_url(&session, &format!("api/services/{domain}/{service}"))?;
    state
        .http
        .post(url)
        .bearer_auth(&session.token)
        .json(&json!({ "entity_id": entity_id }))
        .send()
        .await
        .map_err(|error| format!("Unable to send the device action: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Home Assistant could not complete the device action: {error}"))?;

    Ok(())
}

#[tauri::command]
fn disconnect_home_assistant(state: State<'_, AppState>) -> Result<(), String> {
    *state
        .session
        .lock()
        .map_err(|_| "Could not clear the connection session.".to_string())? = None;
    Ok(())
}

#[tauri::command]
fn get_device_status() -> String {
    "{\"devices\": [{\"id\": 1, \"name\": \"Living Room Light\", \"status\": \"on\", \"energy\": 12.5}, {\"id\": 2, \"name\": \"AC Unit\", \"status\": \"off\", \"energy\": 0.0}]}".to_string()
}

fn main() {
    let http = Client::builder()
        .user_agent("SmartHome-Automation/1.1")
        .build()
        .expect("HTTP client configuration must be valid");

    tauri::Builder::default()
        .manage(AppState {
            http,
            session: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_device_status,
            run_predictive_analysis,
            query_local_ai,
            connect_home_assistant,
            get_home_assistant_entities,
            control_home_assistant_entity,
            disconnect_home_assistant
        ])
        .run(tauri::generate_context!())
        .expect("error while running SmartHome Automation");
}
