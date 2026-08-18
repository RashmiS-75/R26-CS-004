import { CheckCircle2, XCircle } from 'lucide-react';
import { REQUIRED_COLUMNS } from '../constants/modelConstants';

export default function ColumnValidator({ presentColumns }) {
  const missing = REQUIRED_COLUMNS.filter((c) => !presentColumns.includes(c));
  const isValid = missing.length === 0;

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isValid ? (
            <CheckCircle2 className="w-5 h-5 text-[#4A5C2E]" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
            CSV Schema Column Validation
          </h3>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full font-extrabold ${
            isValid ? 'bg-[#4A5C2E]/15 text-[#4A5C2E]' : 'bg-red-100 text-red-700'
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
                exists
                  ? 'bg-gray-50 border-gray-200 text-gray-700'
                  : 'bg-red-50 border-red-200 text-red-700 font-bold'
              }`}
            >
              <span className="truncate">{col}</span>
              {exists ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4A5C2E] shrink-0 ml-1" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 ml-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
