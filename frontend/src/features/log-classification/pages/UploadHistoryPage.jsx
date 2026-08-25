import { useCallback, useState } from 'react';
import { History as HistoryIcon, ArrowLeft, RefreshCw, Inbox, AlertTriangle, Upload } from 'lucide-react';
import { useUploadHistory } from '../hooks/useUploadHistory';
import { fetchSession } from '../utils/sessionsApi';
import HistoryTable from '../components/HistoryTable';
import ResultsDashboard from '../components/ResultsDashboard';

export default function UploadHistoryPage({ darkMode = false, onBackToUpload }) {
  const { sessions, loading, error, reload, removeSession } = useUploadHistory();
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const cardBg = darkMode ? 'bg-[#1A2218]' : 'bg-white';
  const cardBorder = darkMode ? 'border-[#2A3526]' : 'border-gray-200';
  const borderStrong = darkMode ? 'border-[#354230]' : 'border-gray-300';
  const textPrimary = darkMode ? 'text-gray-100' : 'text-gray-900';
  const textBody = darkMode ? 'text-gray-200' : 'text-gray-800';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = darkMode ? 'hover:bg-[#212B1B]' : 'hover:bg-gray-50';

  const handleView = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const session = await fetchSession(id);
      const rawRows = session.predictions.map(({ severity: _severity, ...raw }) => raw);
      const predictionsForCharts = session.predictions.map((p) => ({ severity: p.severity }));
      setSelected({ ...session, rawRows, predictionsForCharts });
    } catch {
      alert('Failed to load session details.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleBack = () => setSelected(null);

  return (
    <div className="max-w-[1400px] mx-auto w-full space-y-6">
      {/* Title Header */}
      <div className={`flex items-center justify-between pb-2 border-b ${cardBorder}`}>
        <div>
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-[#4A5C2E]" />
            <h1 className={`text-xl font-bold tracking-tight ${textPrimary}`}>Upload History</h1>
          </div>
          <p className={`text-xs mt-1 ${textSecondary}`}>Previously processed batch classification sessions.</p>
        </div>

        <div className="flex items-center gap-2">
          {onBackToUpload && (
            <button
              onClick={onBackToUpload}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-xl ${cardBg} border ${borderStrong} font-semibold ${textBody} ${hoverBg} transition-colors cursor-pointer shadow-xs`}
            >
              <Upload className="w-3.5 h-3.5" /> Back to Upload
            </button>
          )}
          {selected ? (
            <button
              onClick={handleBack}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-xl ${cardBg} border ${borderStrong} font-semibold ${textBody} ${hoverBg} transition-colors cursor-pointer shadow-xs`}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to History
            </button>
          ) : (
            <button
              onClick={reload}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-xl ${cardBg} border ${borderStrong} font-semibold ${textBody} ${hoverBg} transition-colors cursor-pointer shadow-xs`}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
        </div>
      </div>

      {selected ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#4A5C2E]/10 border border-[#4A5C2E]/30 text-xs">
            <HistoryIcon className="w-4 h-4 text-[#4A5C2E] shrink-0" />
            <span className={`font-medium ${textBody}`}>
              Viewing <span className="font-bold font-mono text-[#4A5C2E]">{selected.filename}</span> — uploaded{' '}
              {new Date(selected.uploaded_at).toLocaleString()}
            </span>
          </div>
          <ResultsDashboard rawRows={selected.rawRows} predictions={selected.predictionsForCharts} darkMode={darkMode} />
        </div>
      ) : detailLoading || loading ? (
        <div className={`rounded-2xl ${cardBg} border ${cardBorder} p-8 shadow-xs flex items-center justify-center gap-3 text-center`}>
          <div className="w-6 h-6 border-3 border-[#4A5C2E] border-t-transparent rounded-full animate-spin" />
          <span className={`text-sm font-bold ${textBody}`}>
            {detailLoading ? 'Loading session details...' : 'Loading upload history...'}
          </span>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <div
            className={`flex items-center gap-3 p-5 rounded-2xl border ${
              darkMode ? 'bg-red-950/30 border-red-900/50' : 'bg-red-50 border-red-200'
            }`}
          >
            <AlertTriangle className={`w-6 h-6 shrink-0 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            <div>
              <h4 className={`text-xs font-extrabold uppercase tracking-wider ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                Failed to Load History
              </h4>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>{error}</p>
            </div>
          </div>
          <button
            onClick={reload}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl ${cardBg} border ${borderStrong} ${textBody} ${hoverBg} transition-colors cursor-pointer shadow-xs`}
          >
            Try Again
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className={`rounded-2xl ${cardBg} border ${cardBorder} p-16 shadow-xs flex flex-col items-center justify-center text-center`}>
          <Inbox className={`w-10 h-10 mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`text-sm font-semibold ${textBody}`}>No upload history yet.</p>
          <p className={`text-xs mt-1 ${textSecondary}`}>Upload a CSV file to get started.</p>
        </div>
      ) : (
        <HistoryTable sessions={sessions} darkMode={darkMode} onView={handleView} onDelete={removeSession} />
      )}
    </div>
  );
}
