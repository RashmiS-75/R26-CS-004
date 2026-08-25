import { Download } from 'lucide-react';
import Papa from 'papaparse';

export default function ExportButton({ rows, predictions, darkMode = false }) {
  const handleExportCsv = () => {
    const enrichedData = rows.map((row, i) => ({
      ...row,
      'Predicted Severity': predictions[i]?.severity ?? '',
    }));
    const csv = Papa.unparse(enrichedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audixa_batch_predictions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        darkMode ? 'bg-[#1A2218] border-[#2A3526]' : 'bg-white border-gray-200'
      }`}
    >
      <div>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Export Report as CSV</h3>
        <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Exported file includes original log data with the predicted Severity Level appended.
        </p>
      </div>
      <button
        onClick={handleExportCsv}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4A5C2E] hover:bg-[#3B4924] text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs shrink-0"
      >
        <Download className="w-4 h-4" /> Export CSV
      </button>
    </div>
  );
}
