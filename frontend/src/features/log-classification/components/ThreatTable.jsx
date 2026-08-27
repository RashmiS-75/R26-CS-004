import { useState, useMemo } from 'react';
import { Search, ChevronDown, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';

// Sample fallback rows shown when no predictions are available yet
const sampleData = [
  { sourcePort: '54321', destinationPort: '22', protocol: 'TCP', action: 'BLOCK', trafficType: 'HTTP', severity: 'High' },
  { sourcePort: '12345', destinationPort: '53', protocol: 'UDP', action: 'ALLOW', trafficType: 'DNS', severity: 'Medium' },
  { sourcePort: '34567', destinationPort: '443', protocol: 'TCP', action: 'ALLOW', trafficType: 'HTTPS', severity: 'Low' },
  { sourcePort: '45678', destinationPort: '3389', protocol: 'TCP', action: 'BLOCK', trafficType: 'RDP', severity: 'High' },
  { sourcePort: '23456', destinationPort: '110', protocol: 'UDP', action: 'ALLOW', trafficType: 'POP3', severity: 'Medium' },
];

// Displays classified firewall logs in a table
export default function ThreatTable({ rows = [], darkMode = false }) {
  
  // Store search, filter, selected row and page number
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [selectedRow, setSelectedRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // Show only 10 records per page

  // Convert raw prediction data into table-friendly rows
  const items = useMemo(() => {
    if (rows.length > 0) {
      return rows.map((r) => {
        const actionTaken = String(r.raw['Action Taken'] || 'ALLOW').toUpperCase();
        return {
          id: r.index,
          sourcePort: String(r.raw['Source Port'] ?? '443'),
          destinationPort: String(r.raw['Destination Port'] ?? '80'),
          protocol: String(r.raw['Protocol'] ?? 'TCP').toUpperCase(),
          action: actionTaken.includes('BLOCK') ? 'BLOCK' : 'ALLOW',
          trafficType: String(r.raw['Traffic Type'] ?? 'HTTP').toUpperCase(),
          severity: r.severity,
          raw: r.raw,
        };
      });
    }
    return sampleData.map((item, idx) => ({ ...item, id: idx, raw: null }));
  }, [rows]);

  // Filter logs according to search text and severity
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (severityFilter !== 'All' && item.severity !== severityFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.sourcePort.toLowerCase().includes(q) ||
          item.destinationPort.toLowerCase().includes(q) ||
          item.protocol.toLowerCase().includes(q) ||
          item.action.toLowerCase().includes(q) ||
          item.trafficType.toLowerCase().includes(q) ||
          item.severity.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [items, severityFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage]);

  const cardBg = darkMode ? 'bg-[#1A2218]' : 'bg-white';
  const cardBorder = darkMode ? 'border-[#2A3526]' : 'border-gray-200';
  const borderLight = darkMode ? 'border-[#232F1E]' : 'border-gray-100';
  const textPrimary = darkMode ? 'text-gray-100' : 'text-gray-900';
  const textBody = darkMode ? 'text-gray-200' : 'text-gray-800';
  const textMuted = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';
  const textFaint = darkMode ? 'text-gray-500' : 'text-gray-400';
  const inputBg = darkMode
    ? 'bg-[#141A11] border-[#2A3526] hover:border-[#354230] text-gray-200 placeholder:text-gray-500'
    : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-800 placeholder:text-gray-400';
  const selectBg = darkMode
    ? 'bg-[#141A11] border-[#2A3526] hover:border-[#354230] text-gray-300'
    : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-700';
  const theadBg = darkMode ? 'border-y border-[#232F1E] bg-[#141A11] text-gray-400' : 'border-y border-gray-100 bg-gray-50/50 text-gray-500';
  const rowHover = darkMode ? 'hover:bg-[#212B1B]/80' : 'hover:bg-gray-50/80';
  const eyeBtn = darkMode
    ? 'text-gray-500 hover:text-gray-200 hover:bg-[#232F1E]'
    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100';
  const pagerBtn = darkMode
    ? 'border-[#2A3526] text-gray-400 hover:bg-[#212B1B]'
    : 'border-gray-200 text-gray-500 hover:bg-gray-50';
  const pageNumBtn = darkMode
    ? 'text-gray-300 border-[#2A3526] hover:bg-[#212B1B]'
    : 'text-gray-600 border-gray-200 hover:bg-gray-50';

  const severityPillClass = (severity) => {
    if (darkMode) {
      return severity === 'High'
        ? 'bg-red-500/15 text-red-400'
        : severity === 'Medium'
        ? 'bg-amber-500/15 text-amber-400'
        : 'bg-emerald-500/15 text-emerald-400';
    }
    return severity === 'High'
      ? 'bg-red-100/80 text-red-700'
      : severity === 'Medium'
      ? 'bg-amber-100/80 text-amber-800'
      : 'bg-emerald-100/80 text-emerald-800';
  };

  return (
    <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-xs overflow-hidden`}>
      {/* Header and Filter Bar */}
      <div className="p-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className={`font-bold text-sm ${textPrimary}`}>Classified Firewall Logs</h3>
          <p className={`text-xs mt-0.5 ${textSecondary}`}>Latest classified log events</p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Field */}
          <div className="relative w-48">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 pointer-events-none ${textFaint}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search..."
              className={`w-full border text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none ${inputBg}`}
            />
          </div>

          {/* Severity Dropdown */}
          <div className="relative">
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`appearance-none border text-xs font-medium rounded-xl pl-3 pr-8 py-2 focus:outline-none cursor-pointer ${selectBg}`}
            >
              <option value="All">Severity: All</option>
              <option value="High">Severity: High</option>
              <option value="Medium">Severity: Medium</option>
              <option value="Low">Severity: Low</option>
            </select>
            <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-3 pointer-events-none ${textFaint}`} />
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className={`font-semibold ${theadBg}`}>
              <th className="text-left px-6 py-3 font-medium">Source Port</th>
              <th className="text-left px-6 py-3 font-medium">Destination Port</th>
              <th className="text-left px-6 py-3 font-medium">Protocol</th>
              <th className="text-left px-6 py-3 font-medium">Action</th>
              <th className="text-left px-6 py-3 font-medium">Traffic Type</th>
              <th className="text-center px-6 py-3 font-medium">Predicted Severity</th>
              <th className="text-center px-6 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-[#232F1E]' : 'divide-gray-100'} ${textMuted}`}>
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className={`text-center py-10 ${textFaint}`}>
                  No log entries match the selected filters.
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => (
                <tr key={item.id} className={`transition-colors ${rowHover}`}>
                  <td className={`px-6 py-3.5 font-medium ${textBody}`}>{item.sourcePort}</td>
                  <td className={`px-6 py-3.5 font-medium ${textBody}`}>{item.destinationPort}</td>
                  <td className={`px-6 py-3.5 font-medium ${textBody}`}>{item.protocol}</td>
                  <td className={`px-6 py-3.5 font-semibold ${textBody}`}>{item.action}</td>
                  <td className={`px-6 py-3.5 font-medium ${textBody}`}>{item.trafficType}</td>
                  <td className="px-6 py-3.5 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-medium min-w-[70px] ${severityPillClass(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <button
                      onClick={() => setSelectedRow(item)}
                      className={`transition-colors cursor-pointer inline-flex items-center justify-center p-1 rounded-md ${eyeBtn}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredItems.length > 0 && (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t ${borderLight}`}>
          <span className={`text-xs ${textSecondary}`}>
            Showing{' '}
            <span className={`font-semibold ${textMuted}`}>
              {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredItems.length)}
            </span>{' '}
            of <span className={`font-semibold ${textMuted}`}>{filteredItems.length}</span> entries
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className={`flex items-center justify-center w-7 h-7 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${pagerBtn}`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p) => {
                if (acc.length > 0 && p - acc[acc.length - 1] > 1) acc.push(-1);
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === -1 ? (
                  <span key={`ellipsis-${idx}`} className={`px-1 text-xs ${textFaint}`}>
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      p === safePage ? 'bg-[#4A5C2E] text-white' : `border ${pageNumBtn}`
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className={`flex items-center justify-center w-7 h-7 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${pagerBtn}`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedRow && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs ${darkMode ? 'bg-black/60' : 'bg-gray-900/40'}`}>
          <div className={`rounded-2xl border max-w-md w-full p-6 shadow-2xl space-y-4 relative ${cardBg} ${cardBorder}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${borderLight}`}>
              <h4 className={`font-bold text-sm ${textPrimary}`}>Firewall Log Record Details</h4>
              <button
                onClick={() => setSelectedRow(null)}
                className={`cursor-pointer ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={`space-y-2 text-xs divide-y ${darkMode ? 'divide-[#232F1E]' : 'divide-gray-100'}`}>
              <div className="flex justify-between py-1.5">
                <span className={textSecondary}>Source Port</span>
                <span className={`font-bold ${textBody}`}>{selectedRow.sourcePort}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className={textSecondary}>Destination Port</span>
                <span className={`font-bold ${textBody}`}>{selectedRow.destinationPort}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className={textSecondary}>Protocol</span>
                <span className={`font-bold ${textBody}`}>{selectedRow.protocol}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className={textSecondary}>Action</span>
                <span className={`font-bold ${textBody}`}>{selectedRow.action}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className={textSecondary}>Traffic Type</span>
                <span className={`font-bold ${textBody}`}>{selectedRow.trafficType}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className={textSecondary}>Predicted Severity</span>
                <span className={`font-bold ${textPrimary}`}>{selectedRow.severity}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedRow(null)}
              className={`w-full py-2 font-bold rounded-xl text-xs cursor-pointer ${
                darkMode ? 'bg-gray-100 text-gray-900 hover:bg-white' : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
