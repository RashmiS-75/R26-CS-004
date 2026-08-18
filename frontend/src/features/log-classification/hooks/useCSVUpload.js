import { useCallback, useState } from 'react';
import { REQUIRED_COLUMNS } from '../constants/modelConstants';
import { isAcceptedFile, parseLogFile } from '../utils/csvHelpers';
import { predictBatch } from '../utils/predict';

// Manages the batch upload lifecycle: parse -> validate columns -> predict.
export function useCSVUpload() {
  const [stage, setStage] = useState('idle'); // idle | parsing | validating | loading | results | error
  const [fileName, setFileName] = useState('');
  const [presentColumns, setPresentColumns] = useState([]);
  const [validationError, setValidationError] = useState(false);
  const [apiError, setApiError] = useState('');
  const [rawRows, setRawRows] = useState([]);
  const [predictions, setPredictions] = useState([]);

  const runPredictions = useCallback(async (rows) => {
    setStage('loading');
    setApiError('');
    try {
      const preds = await predictBatch(rows);
      setRawRows(rows);
      setPredictions(preds);
      setStage('results');
    } catch {
      setApiError('Cannot connect to ML classification backend service. Make sure backend is running on port 8000.');
      setStage('error');
    }
  }, []);

  const processFile = useCallback(
    async (file) => {
      if (!isAcceptedFile(file.name)) {
        alert('Please upload a valid CSV or XLSX file.');
        return;
      }

      setFileName(file.name);
      setStage('parsing');
      setValidationError(false);
      setPresentColumns([]);

      try {
        const { cols, rows } = await parseLogFile(file);
        setPresentColumns(cols);
        setStage('validating');

        const missing = REQUIRED_COLUMNS.filter((c) => !cols.includes(c));
        if (missing.length > 0) {
          setValidationError(true);
          return;
        }

        runPredictions(rows);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to process file.');
        setStage('idle');
      }
    },
    [runPredictions]
  );

  const reset = useCallback(() => {
    setStage('idle');
    setFileName('');
    setPresentColumns([]);
    setValidationError(false);
    setApiError('');
    setRawRows([]);
    setPredictions([]);
  }, []);

  return {
    stage,
    fileName,
    presentColumns,
    validationError,
    apiError,
    rawRows,
    predictions,
    processFile,
    reset,
  };
}
