import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, Download, X, Table, AlertTriangle, FileSpreadsheet, CheckCircle2, History } from 'lucide-react';
import { REQUIRED_COLUMNS } from '../constants/modelConstants';
import { downloadTemplateCsv } from '../utils/predict';
import { useCSVUpload } from '../hooks/useCSVUpload';
import ColumnValidator from '../components/ColumnValidator';
import ResultsDashboard from '../components/ResultsDashboard';
import UploadHistoryPage from './UploadHistoryPage';

function fileIcon(name) {
  if (name.toLowerCase().endsWith('.csv')) return <FileText className="w-4 h-4 text-[#4A5C2E]" />;
  return <FileSpreadsheet className="w-4 h-4 text-[#4A5C2E]" />;
}

export default function BatchAnalysisPage({ darkMode = false }) {
  const { stage, fileName, presentColumns, validationError, apiError, rawRows, predictions, processFile, reset } =
    useCSVUpload();
  const [dragOver, setDragOver] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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

  const cardBg = darkMode ? 'bg-[#1A2218]' : 'bg-white';
  const cardBorder = darkMode ? 'border-[#2A3526]' : 'border-gray-200';
  const borderStrong = darkMode ? 'border-[#354230]' : 'border-gray-300';
  const textPrimary = darkMode ? 'text-gray-100' : 'text-gray-900';
  const textBody = darkMode ? 'text-gray-200' : 'text-gray-800';
  const textMuted = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';
  const chipBg = darkMode ? 'bg-[#232F1E] text-gray-300 border-[#2A3526]' : 'bg-gray-100 text-gray-600 border-gray-200';
  const chipBgAlt = darkMode ? 'bg-[#232F1E] text-gray-200 border-[#2A3526]' : 'bg-gray-100 text-gray-700 border-gray-200';
  const hoverBg = darkMode ? 'hover:bg-[#212B1B]' : 'hover:bg-gray-50';
  const hoverBgSoft = darkMode ? 'hover:bg-[#1F2A19]/60' : 'hover:bg-gray-50/50';

  if (showHistory) {
    return <UploadHistoryPage darkMode={darkMode} onBackToUpload={() => setShowHistory(false)} />;
  }

  return (
    <div className="max-w-[1400px] mx-auto w-full space-y-6">
      {/* Title Header */}
      <div className={`flex items-center justify-between pb-2 border-b ${cardBorder}`}>
        <div>
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#4A5C2E]" />
            <h1 className={`text-xl font-bold tracking-tight ${textPrimary}`}>Batch CSV Log Classification</h1>
          </div>
          <p className={`text-xs mt-1 ${textSecondary}`}>
            Upload log spreadsheets to run batch predictions across thousands of firewall entries simultaneously.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stage !== 'idle' && (
            <button
              onClick={reset}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-xl ${cardBg} border ${borderStrong} font-semibold ${textMuted} ${hoverBg} transition-colors cursor-pointer shadow-xs`}
            >
              <X className="w-3.5 h-3.5" /> Reset
            </button>
          )}
          <button
            onClick={() => setShowHistory(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-xl ${cardBg} border ${borderStrong} font-semibold ${textMuted} ${hoverBg} transition-colors cursor-pointer shadow-xs`}
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
        </div>
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
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${cardBg} shadow-xs ${
              dragOver
                ? 'border-[#4A5C2E] bg-[#4A5C2E]/5 scale-[1.01]'
                : `${borderStrong} hover:border-[#4A5C2E]/60 ${hoverBgSoft}`
            }`}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
            <div className="w-14 h-14 rounded-2xl bg-[#4A5C2E]/10 text-[#4A5C2E] flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className={`font-bold text-base mb-1 ${textBody}`}>
              {dragOver ? 'Drop file to start processing' : 'Drag & drop a file here'}
            </h3>
            <p className={`text-xs mb-4 ${textSecondary}`}>or click to browse</p>
            <div className="flex items-center justify-center gap-2">
              {['.csv', '.xlsx', '.xls'].map((ext) => (
                <span
                  key={ext}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono border ${chipBg}`}
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-stretch gap-6 flex-wrap">
            <button
              onClick={downloadTemplateCsv}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl ${cardBg} border ${borderStrong} ${hoverBg} ${textBody} text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0`}
            >
              <Download className="w-4 h-4 text-[#4A5C2E]" />
              Download Template CSV
            </button>

            <div className={`rounded-2xl ${cardBg} border ${cardBorder} p-5 flex-1 min-w-80 shadow-xs`}>
              <p className={`text-xs font-extrabold uppercase tracking-wider mb-2.5 flex items-center gap-2 ${textMuted}`}>
                <Table className="w-4 h-4 text-[#4A5C2E]" /> Required Columns ({REQUIRED_COLUMNS.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {REQUIRED_COLUMNS.map((col) => (
                  <span
                    key={col}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono border ${chipBgAlt}`}
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage: Parsing */}
      {stage === 'parsing' && (
        <div className="space-y-4">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${cardBg} border ${cardBorder} text-xs ${textMuted} font-medium w-fit`}>
            {fileIcon(fileName)}
            <span>Uploaded File:</span>
            <span className={`font-bold font-mono ${textPrimary}`}>{fileName}</span>
          </div>
          <div className={`rounded-2xl ${cardBg} border ${cardBorder} p-8 shadow-xs flex items-center justify-center gap-3 text-center`}>
            <div className="w-6 h-6 border-3 border-[#4A5C2E] border-t-transparent rounded-full animate-spin" />
            <span className={`text-sm font-bold ${textBody}`}>Reading and Parsing File...</span>
          </div>
        </div>
      )}

      {/* Stage: Validating */}
      {stage === 'validating' && (
        <div className="space-y-4">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${cardBg} border ${cardBorder} text-xs ${textMuted} font-medium w-fit`}>
            {fileIcon(fileName)}
            <span>Uploaded File:</span>
            <span className={`font-bold font-mono ${textPrimary}`}>{fileName}</span>
          </div>

          <ColumnValidator presentColumns={presentColumns} darkMode={darkMode} />

          {validationError && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={reset}
                className={`px-4 py-2.5 text-xs font-bold rounded-xl ${cardBg} border ${borderStrong} ${textMuted} ${hoverBg} transition-colors cursor-pointer`}
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
          <ColumnValidator presentColumns={presentColumns} darkMode={darkMode} />
          <div className={`rounded-2xl ${cardBg} border ${cardBorder} p-8 shadow-xs flex items-center justify-center gap-3 text-center`}>
            <div className="w-6 h-6 border-3 border-[#4A5C2E] border-t-transparent rounded-full animate-spin" />
            <span className={`text-sm font-bold ${textBody}`}>Executing ML Classifier Batch Predictions...</span>
          </div>
        </div>
      )}

      {/* Stage: Error */}
      {stage === 'error' && (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-5 rounded-2xl border ${darkMode ? 'bg-red-950/30 border-red-900/50' : 'bg-red-50 border-red-200'}`}>
            <AlertTriangle className={`w-6 h-6 shrink-0 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            <div>
              <h4 className={`text-xs font-extrabold uppercase tracking-wider ${darkMode ? 'text-red-300' : 'text-red-800'}`}>Classification Failed</h4>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>{apiError}</p>
            </div>
          </div>
          <button
            onClick={reset}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl ${cardBg} border ${borderStrong} ${textBody} ${hoverBg} transition-colors cursor-pointer shadow-xs`}
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
            <span className={`font-medium ${textBody}`}>
              Successfully processed <span className="font-bold font-mono text-[#4A5C2E]">{fileName}</span> —{' '}
              <span className="font-bold">{rawRows.length} log rows</span> predicted.
            </span>
          </div>
          <ResultsDashboard rawRows={rawRows} predictions={predictions} darkMode={darkMode} />
        </div>
      )}
    </div>
  );
}
