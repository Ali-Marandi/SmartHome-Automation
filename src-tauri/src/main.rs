#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_engine;

use ai_engine::{run_predictive_analysis, query_local_ai};

#[tauri::command]
fn get_device_status() -> String {
    "{\"devices\": [{\"id\": 1, \"name\": \"Living Room Light\", \"status\": \"on\", \"energy\": 12.5}, {\"id\": 2, \"name\": \"AC Unit\", \"status\": \"off\", \"energy\": 0.0}]}".to_string()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_device_status,
            run_predictive_analysis,
            query_local_ai
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
