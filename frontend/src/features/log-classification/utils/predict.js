
/*
 * Prediction utility — calls the Audixa Main API,
 * which proxies requests to the log-classification service.
 * Batch predictions only; the model predicts Severity Level
 * (Low / Medium / High).
 */

import { REQUIRED_COLUMNS } from '../constants/modelConstants'
import { apiFetch } from '../../../api'

export const predictBatch = async (logs) => {
  if (!Array.isArray(logs) || logs.length === 0) {
    throw new Error('Please provide at least one log record.')
  }

  const res = await apiFetch('/classify/predict_batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(logs),
  })

  if (res.status === 401) {
    throw new Error('Your session has expired. Please log in again.')
  }

  if (res.status === 403) {
    throw new Error('You do not have permission to run predictions.')
  }

  if (!res.ok) {
    let message = 'Batch prediction failed.'

    try {
      const errorData = await res.json()
      if (errorData.detail) {
        message = errorData.detail
      }
    } catch {
      // Keep the default error message if the response is not JSON.
    }

    throw new Error(message)
  }

  return await res.json()
}

export const TEMPLATE_CSV_HEADERS = REQUIRED_COLUMNS.join(',')

export const TEMPLATE_CSV_ROWS = [
  '443,80,512,45.2,TCP,Data,HTTP,Blocked,Segment A,Yes,,,,',
  '8080,22,1200,82.5,UDP,Control,HTTP,Ignored,Segment B,,Warning Present,Via Proxy,,IDS Alert',
  '0,53,256,20.0,ICMP,Data,DNS,Logged,Segment C,Malware Found,Alert,Proxy Info,Log Present,',
]

export function downloadTemplateCsv() {
  const content = [
    TEMPLATE_CSV_HEADERS,
    ...TEMPLATE_CSV_ROWS,
  ].join('\n')

  const blob = new Blob([content], {
    type: 'text/csv;charset=utf-8',
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = 'log_classification_template.csv'

  document.body.appendChild(a)
  a.click()
  a.remove()

  URL.revokeObjectURL(url)
}
