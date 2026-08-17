use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnergySample {
    pub timestamp: String,
    pub hour: u8,
    pub usage_kw: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ForecastPoint {
    pub hour: u8,
    pub predicted_kw: f64,
    pub lower_kw: f64,
    pub upper_kw: f64,
    pub source_samples: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnergyForecast {
    pub methodology: String,
    pub confidence: u8,
    pub observation_count: usize,
    pub forecast: Vec<ForecastPoint>,
    pub total_kwh: f64,
    pub data_quality_note: String,
}

fn round(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

fn mean(values: &[f64]) -> f64 {
    values.iter().sum::<f64>() / values.len() as f64
}

fn standard_deviation(values: &[f64], average: f64) -> f64 {
    if values.len() < 2 {
        return 0.0;
    }

    let variance = values
        .iter()
        .map(|value| (value - average).powi(2))
        .sum::<f64>()
        / values.len() as f64;
    variance.sqrt()
}

fn recent_weighted_baseline(samples: &[EnergySample]) -> f64 {
    let alpha = 0.35;
    samples
        .iter()
        .map(|sample| sample.usage_kw)
        .fold(samples[0].usage_kw, |baseline, current| {
            alpha * current + (1.0 - alpha) * baseline
        })
}

pub fn generate_energy_forecast(
    samples: Vec<EnergySample>,
    horizon_hours: Option<u8>,
) -> Result<EnergyForecast, String> {
    let horizon = horizon_hours.unwrap_or(24);
    if !(1..=48).contains(&horizon) {
        return Err("Forecast horizon must be between 1 and 48 hours.".to_string());
    }
    if samples.len() < 6 {
        return Err("At least six non-negative energy samples are required for a forecast.".to_string());
    }

    for sample in &samples {
        if sample.timestamp.trim().is_empty() {
            return Err("Every energy sample must include an ISO-8601 timestamp.".to_string());
        }
        if sample.hour > 23 {
            return Err("Energy sample hour must be between 0 and 23.".to_string());
        }
        if !sample.usage_kw.is_finite() || sample.usage_kw < 0.0 {
            return Err("Energy usage must be a finite, non-negative value in kW.".to_string());
        }
    }

    let mut hourly_samples: Vec<Vec<f64>> = vec![Vec::new(); 24];
    for sample in &samples {
        hourly_samples[sample.hour as usize].push(sample.usage_kw);
    }

    let all_values: Vec<f64> = samples.iter().map(|sample| sample.usage_kw).collect();
    let global_average = mean(&all_values);
    let weighted_recent = recent_weighted_baseline(&samples);
    let last_hour = samples.last().map(|sample| sample.hour).unwrap_or(0);

    let forecast: Vec<ForecastPoint> = (1..=horizon)
        .map(|offset| {
            let hour = ((last_hour as u16 + offset as u16) % 24) as u8;
            let history = &hourly_samples[hour as usize];
            let hourly_average = if history.is_empty() {
                global_average
            } else {
                mean(history)
            };
            let hourly_deviation = if history.is_empty() {
                standard_deviation(&all_values, global_average)
            } else {
                standard_deviation(history, hourly_average)
            };
            let prediction = 0.75 * hourly_average + 0.25 * weighted_recent;
            let interval = (hourly_deviation * 0.8).max(0.08);

            ForecastPoint {
                hour,
                predicted_kw: round(prediction.max(0.0)),
                lower_kw: round((prediction - interval).max(0.0)),
                upper_kw: round(prediction + interval),
                source_samples: history.len(),
            }
        })
        .collect();

    let covered_hours = hourly_samples.iter().filter(|entries| !entries.is_empty()).count();
    let sample_score = (samples.len() as f64 / 72.0).min(1.0);
    let coverage_score = covered_hours as f64 / 24.0;
    let global_deviation = standard_deviation(&all_values, global_average);
    let volatility_score = if global_average <= f64::EPSILON {
        1.0
    } else {
        (1.0 - (global_deviation / global_average).min(1.0)).max(0.0)
    };
    let confidence = ((0.55 * sample_score + 0.25 * coverage_score + 0.20 * volatility_score) * 100.0)
        .round()
        .clamp(0.0, 95.0) as u8;

    let data_quality_note = if samples.len() < 48 || covered_hours < 16 {
        "Limited history: use this forecast for planning only until at least 48 samples across 16 hours are available."
    } else if confidence < 65 {
        "Variable demand pattern: the uncertainty band is intentionally wide. Collect additional history before automating decisions."
    } else {
        "Forecast confidence is based on local sample coverage and recent variability; validate against actual meter readings before making cost claims."
    }
    .to_string();

    let total_kwh = round(forecast.iter().map(|point| point.predicted_kw).sum());
    Ok(EnergyForecast {
        methodology: "Time-of-day baseline blended with exponentially weighted recent demand".to_string(),
        confidence,
        observation_count: samples.len(),
        forecast,
        total_kwh,
        data_quality_note,
    })
}

#[cfg(test)]
mod tests {
    use super::{generate_energy_forecast, EnergySample};

    fn sample(hour: u8, usage_kw: f64) -> EnergySample {
        EnergySample {
            timestamp: format!("2026-08-17T{hour:02}:00:00Z"),
            hour,
            usage_kw,
        }
    }

    #[test]
    fn produces_requested_horizon_with_bounded_interval() {
        let samples = vec![
            sample(18, 1.2), sample(19, 1.5), sample(20, 1.8),
            sample(21, 1.6), sample(22, 1.1), sample(23, 0.8),
            sample(18, 1.3), sample(19, 1.6), sample(20, 1.9),
        ];
        let result = generate_energy_forecast(samples, Some(6)).expect("forecast should be valid");

        assert_eq!(result.forecast.len(), 6);
        assert_eq!(result.observation_count, 9);
        assert!(result.forecast.iter().all(|point| {
            point.lower_kw >= 0.0
                && point.lower_kw <= point.predicted_kw
                && point.predicted_kw <= point.upper_kw
        }));
    }

    #[test]
    fn rejects_invalid_energy_input() {
        let samples = vec![
            sample(0, 1.0), sample(1, 1.1), sample(2, 1.2),
            sample(3, 1.3), sample(4, 1.4), sample(24, 1.5),
        ];
        assert!(generate_energy_forecast(samples, Some(24)).is_err());
    }
}
