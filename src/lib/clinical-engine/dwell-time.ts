/**
 * Telemetria de Dwell Time e Detector de Hesitação Psicométrica.
 * 
 * Monitora os tempos de latência e resposta por item (response_time_ms),
 * identificando hesitação emocional em itens sensíveis (ideação de morte, autoagressão)
 * e detectando preenchimento desatento ou randômico (< 400ms).
 */

export interface ItemDwellRecord {
  scale_code: string;
  item_id: string;
  response_time_ms: number;
  value: number;
  is_risk_item?: boolean;
  timestamp?: number;
}

export interface HesitationSignal {
  scale_code: string;
  item_id: string;
  response_time_ms: number;
  patient_average_ms: number;
  ratio: number;
  alert_level: "warning" | "critical";
  reason: string;
}

export interface SessionTelemetryReport {
  total_items: number;
  average_time_ms: number;
  median_time_ms: number;
  min_time_ms: number;
  max_time_ms: number;
  hesitations: HesitationSignal[];
  has_risk_hesitation: boolean;
  random_answering_detected: boolean; // Preenchimento apressado < 400ms em sequência
}

/**
 * Avalia se um item específico apresenta hesitação clinicamente relevante.
 * Regra: Alerta se o tempo no item for >= 3x a média do paciente ou > 10.000ms em item de risco.
 */
export function detectItemHesitation(
  record: ItemDwellRecord,
  patientAverageTimeMs: number,
): HesitationSignal | null {
  const avg = Math.max(800, patientAverageTimeMs);
  const ratio = Number((record.response_time_ms / avg).toFixed(2));

  // 1. Alerta Crítico: Item de Risco com Hesitação >= 3x ou tempo absoluto > 10s
  if (record.is_risk_item) {
    if (ratio >= 3.0 || record.response_time_ms >= 10000) {
      return {
        scale_code: record.scale_code,
        item_id: record.item_id,
        response_time_ms: record.response_time_ms,
        patient_average_ms: Math.round(avg),
        ratio,
        alert_level: "critical",
        reason: `Hesitação marcante (${(record.response_time_ms / 1000).toFixed(1)}s, ${ratio}x a média do paciente) no item de risco/ideação ${record.scale_code} #${record.item_id}.`,
      };
    }
  }

  // 2. Alerta de Advertência: Item geral com tempo >= 4x a média
  if (ratio >= 4.0 && record.response_time_ms >= 8000) {
    return {
      scale_code: record.scale_code,
      item_id: record.item_id,
      response_time_ms: record.response_time_ms,
      patient_average_ms: Math.round(avg),
      ratio,
      alert_level: "warning",
      reason: `Tempo de reflexão elevado (${(record.response_time_ms / 1000).toFixed(1)}s, ${ratio}x a média) no item ${record.scale_code} #${record.item_id}.`,
    };
  }

  return null;
}

/**
 * Analisa o conjunto de registros de telemetria da sessão e gera um relatório consolidado.
 */
export function analyzeSessionTelemetry(
  records: ItemDwellRecord[],
): SessionTelemetryReport {
  if (records.length === 0) {
    return {
      total_items: 0,
      average_time_ms: 0,
      median_time_ms: 0,
      min_time_ms: 0,
      max_time_ms: 0,
      hesitations: [],
      has_risk_hesitation: false,
      random_answering_detected: false,
    };
  }

  const times = records.map((r) => r.response_time_ms).sort((a, b) => a - b);
  const total = times.reduce((acc, t) => acc + t, 0);
  const average_time_ms = Math.round(total / times.length);

  const mid = Math.floor(times.length / 2);
  const median_time_ms =
    times.length % 2 !== 0
      ? times[mid]
      : Math.round((times[mid - 1] + times[mid]) / 2);

  const min_time_ms = times[0];
  const max_time_ms = times[times.length - 1];

  // Detecta hesitações
  const hesitations: HesitationSignal[] = [];
  for (const record of records) {
    const signal = detectItemHesitation(record, average_time_ms);
    if (signal) {
      hesitations.push(signal);
    }
  }

  const has_risk_hesitation = hesitations.some(
    (h) => h.alert_level === "critical",
  );

  // Detecção de preenchimento desatento: 3 ou mais itens consecutivos respondidos em < 400ms
  let rapidStreak = 0;
  let random_answering_detected = false;
  for (const record of records) {
    if (record.response_time_ms < 400) {
      rapidStreak++;
      if (rapidStreak >= 3) {
        random_answering_detected = true;
        break;
      }
    } else {
      rapidStreak = 0;
    }
  }

  return {
    total_items: records.length,
    average_time_ms,
    median_time_ms,
    min_time_ms,
    max_time_ms,
    hesitations,
    has_risk_hesitation,
    random_answering_detected,
  };
}
