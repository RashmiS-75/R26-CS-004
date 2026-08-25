import { CheckCircle2, XCircle } from 'lucide-react';
import { REQUIRED_COLUMNS } from '../constants/modelConstants';

export default function ColumnValidator({ presentColumns, darkMode = false }) {
  const missing = REQUIRED_COLUMNS.filter((c) => !presentColumns.includes(c));
  const isValid = missing.length === 0;

  const cardBg = darkMode ? 'bg-[#1A2218]' : 'bg-white';
  const cardBorder = darkMode ? 'border-[#2A3526]' : 'border-gray-200';
  const textMuted = darkMode ? 'text-gray-300' : 'text-gray-800';
  const chipOkBg = darkMode ? 'bg-[#232F1E] border-[#2A3526] text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700';
  const chipMissingBg = darkMode
    ? 'bg-red-950/30 border-red-900/50 text-red-400 font-bold'
    : 'bg-red-50 border-red-200 text-red-700 font-bold';

  return (
    <div className={`rounded-2xl ${cardBg} border ${cardBorder} p-6 shadow-xs space-y-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isValid ? (
            <CheckCircle2 className="w-5 h-5 text-[#4A5C2E]" />
          ) : (
            <XCircle className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
          )}
          <h3 className={`text-xs font-extrabold uppercase tracking-wider ${textMuted}`}>
            CSV Schema Column Validation
          </h3>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full font-extrabold ${
            isValid
              ? 'bg-[#4A5C2E]/15 text-[#4A5C2E]'
              : darkMode
              ? 'bg-red-950/40 text-red-400'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {isValid
            ? `Schema Verified (${REQUIRED_COLUMNS.length}/${REQUIRED_COLUMNS.length})`
            : `${missing.length} Missing Column(s)`}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {REQUIRED_COLUMNS.map((col) => {
          const exists = presentColumns.includes(col);
          return (
            <div
              key={col}
              className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center justify-between ${
                exists ? chipOkBg : chipMissingBg
              }`}
            >
              <span className="truncate">{col}</span>
              {exists ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4A5C2E] shrink-0 ml-1" />
              ) : (
                <XCircle className={`w-3.5 h-3.5 shrink-0 ml-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
