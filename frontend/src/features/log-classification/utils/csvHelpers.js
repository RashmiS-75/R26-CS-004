import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

export function isAcceptedFile(name) {
  return ACCEPTED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

function parseXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const cols = json.length > 0 ? Object.keys(json[0]) : [];
        resolve({ cols, rows: json });
      } catch {
        reject(new Error('Failed to parse XLSX file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve({ cols: result.meta.fields ?? [], rows: result.data }),
      error: () => reject(new Error('Failed to parse CSV file.')),
    });
  });
}

export function parseLogFile(file) {
  const isXlsx = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
  return isXlsx ? parseXlsx(file) : parseCsv(file);
}
