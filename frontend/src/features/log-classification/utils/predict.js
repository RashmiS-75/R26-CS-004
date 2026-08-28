// Prediction utility — calls the log-classification ml-service FastAPI backend.
// Batch predictions only; the model predicts Severity Level (Low/Medium/High).

import { REQUIRED_COLUMNS } from '../constants/modelConstants';

const BASE = import.meta.env.VITE_LOG_CLASSIFICATION_API_URL || 'http://127.0.0.1:8080/classify';

export const predictBatch = async (logs) => {
  const res = await fetch(`${BASE}/predict_batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logs),
  });
  if (!res.ok) throw new Error('Batch prediction failed');
  return await res.json();
};

export const TEMPLATE_CSV_HEADERS = REQUIRED_COLUMNS.join(',');

export const TEMPLATE_CSV_ROWS = [
  '443,80,512,45.2,TCP,Data,HTTP,Blocked,Segment A,Yes,,,,',
  '8080,22,1200,82.5,UDP,Control,HTTP,Ignored,Segment B,,Warning Present,Via Proxy,,IDS Alert',
  '0,53,256,20.0,ICMP,Data,DNS,Logged,Segment C,Malware Found,Alert,Proxy Info,Log Present,',
];

export function downloadTemplateCsv() {
  const content = [TEMPLATE_CSV_HEADERS, ...TEMPLATE_CSV_ROWS].join('\n');
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'log_classification_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
