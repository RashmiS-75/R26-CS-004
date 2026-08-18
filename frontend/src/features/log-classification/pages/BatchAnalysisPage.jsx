import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, Download, X, Table, AlertTriangle, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { REQUIRED_COLUMNS } from '../constants/modelConstants';
import { downloadTemplateCsv } from '../utils/predict';
import { useCSVUpload } from '../hooks/useCSVUpload';
import ColumnValidator from '../components/ColumnValidator';
import ResultsDashboard from '../components/ResultsDashboard';

function fileIcon(name) {
  if (name.toLowerCase().endsWith('.csv')) return <FileText className="w-4 h-4 text-[#4A5C2E]" />;
  return <FileSpreadsheet className="w-4 h-4 text-[#4A5C2E]" />;
}

export default function BatchAnalysisPage() {
  const { stage, fileName, presentColumns, validationError, apiError, rawRows, predictions, processFile, reset } =
    useCSVUpload();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = '';
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="max-w-[1400px] mx-auto w-full space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#4A5C2E]" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Batch CSV Log Classification</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Upload log spreadsheets to run batch predictions across thousands of firewall entries simultaneously.
          </p>
        </div>

        {stage !== 'idle' && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-xl bg-white border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-xs"
          >
            <X className="w-3.5 h-3.5" /> Start New Batch
          </button>
        )}
      </div>

      {/* Stage: Idle Upload Zone */}
      {stage === 'idle' && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 bg-white shadow-xs ${
              dragOver
                ? 'border-[#4A5C2E] bg-[#4A5C2E]/5 scale-[1.01]'
                : 'border-gray-300 hover:border-[#4A5C2E]/60 hover:bg-gray-50/50'
            }`}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
            <div className="w-14 h-14 rounded-2xl bg-[#4A5C2E]/10 text-[#4A5C2E] flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-gray-800 font-bold text-base mb-1">
              {dragOver ? 'Drop file to start processing' : 'Drag & drop a file here'}
            </h3>
            <p className="text-gray-500 text-xs mb-4">or click to browse</p>
            <div className="flex items-center justify-center gap-2">
              {['.csv', '.xlsx', '.xls'].map((ext) => (
                <span
                  key={ext}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-mono border border-gray-200"
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-stretch gap-6 flex-wrap">
            <button
              onClick={downloadTemplateCsv}
              className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <Download className="w-4 h-4 text-[#4A5C2E]" />
              Download Template CSV
            </button>

            <div className="rounded-2xl bg-white border border-gray-200 p-5 flex-1 min-w-80 shadow-xs">
              <p className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <Table className="w-4 h-4 text-[#4A5C2E]" /> Required Columns ({REQUIRED_COLUMNS.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {REQUIRED_COLUMNS.map((col) => (
                  <span
                    key={col}
                    className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-[11px] font-mono border border-gray-200"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage: Validating */}
      {stage === 'validating' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-700 font-medium w-fit">
            {fileIcon(fileName)}
            <span>Uploaded File:</span>
            <span className="font-bold font-mono text-gray-900">{fileName}</span>
          </div>

          <ColumnValidator presentColumns={presentColumns} />

          {validationError && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={reset}
                className="px-4 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Upload Different File
              </button>
              <button
                onClick={downloadTemplateCsv}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#4A5C2E] text-white hover:bg-[#3B4924] transition-colors cursor-pointer shadow-md shadow-[#4A5C2E]/20"
              >
                <Download className="w-4 h-4" /> Download Standard Template
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stage: Loading */}
      {stage === 'loading' && (
        <div className="space-y-4">
          <ColumnValidator presentColumns={presentColumns} />
          <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-xs flex items-center justify-center gap-3 text-center">
            <div className="w-6 h-6 border-3 border-[#4A5C2E] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-800 font-bold">Executing ML Classifier Batch Predictions...</span>
          </div>
        </div>
      )}

      {/* Stage: Error */}
      {stage === 'error' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-5 rounded-2xl bg-red-50 border border-red-200">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-wider">Classification Failed</h4>
              <p className="text-xs text-red-700 mt-0.5">{apiError}</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer shadow-xs"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stage: Results */}
      {stage === 'results' && rawRows.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#4A5C2E]/10 border border-[#4A5C2E]/30 text-xs">
            <CheckCircle2 className="w-4 h-4 text-[#4A5C2E] shrink-0" />
            <span className="text-gray-800 font-medium">
              Successfully processed <span className="font-bold font-mono text-[#4A5C2E]">{fileName}</span> —{' '}
              <span className="font-bold">{rawRows.length} log rows</span> predicted.
            </span>
          </div>
          <ResultsDashboard rawRows={rawRows} predictions={predictions} />
        </div>
      )}
    </div>
  );
}
