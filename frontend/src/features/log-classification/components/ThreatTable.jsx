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

export default function ThreatTable({ rows = [] }) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [selectedRow, setSelectedRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Normalize row items
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

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-xs overflow-hidden">
      {/* Header and Filter Bar */}
      <div className="p-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Classified Firewall Logs</h3>
          <p className="text-xs text-gray-500 mt-0.5">Latest classified log events</p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Field */}
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search..."
              className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-800 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none placeholder:text-gray-400"
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
              className="appearance-none bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-medium rounded-xl pl-3 pr-8 py-2 focus:outline-none cursor-pointer"
            >
              <option value="All">Severity: All</option>
              <option value="High">Severity: High</option>
              <option value="Medium">Severity: Medium</option>
              <option value="Low">Severity: Low</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-y border-gray-100 bg-gray-50/50 text-gray-500 font-semibold">
              <th className="text-left px-6 py-3 font-medium">Source Port</th>
              <th className="text-left px-6 py-3 font-medium">Destination Port</th>
              <th className="text-left px-6 py-3 font-medium">Protocol</th>
              <th className="text-left px-6 py-3 font-medium">Action</th>
              <th className="text-left px-6 py-3 font-medium">Traffic Type</th>
              <th className="text-center px-6 py-3 font-medium">Predicted Severity</th>
              <th className="text-center px-6 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  No log entries match the selected filters.
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-gray-800">{item.sourcePort}</td>
                  <td className="px-6 py-3.5 font-medium text-gray-800">{item.destinationPort}</td>
                  <td className="px-6 py-3.5 font-medium text-gray-800">{item.protocol}</td>
                  <td className="px-6 py-3.5 font-semibold text-gray-800">{item.action}</td>
                  <td className="px-6 py-3.5 font-medium text-gray-800">{item.trafficType}</td>
                  <td className="px-6 py-3.5 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-medium min-w-[70px] ${
                        item.severity === 'High'
                          ? 'bg-red-100/80 text-red-700'
                          : item.severity === 'Medium'
                          ? 'bg-amber-100/80 text-amber-800'
                          : 'bg-emerald-100/80 text-emerald-800'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <button
                      onClick={() => setSelectedRow(item)}
                      className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer inline-flex items-center justify-center p-1 rounded-md hover:bg-gray-100"
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Showing{' '}
            <span className="font-semibold text-gray-700">
              {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredItems.length)}
            </span>{' '}
            of <span className="font-semibold text-gray-700">{filteredItems.length}</span> entries
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      p === safePage ? 'bg-[#4A5C2E] text-white' : 'text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedRow && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="font-bold text-gray-900 text-sm">Firewall Log Record Details</h4>
              <button onClick={() => setSelectedRow(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs divide-y divide-gray-100">
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Source Port</span>
                <span className="font-bold text-gray-800">{selectedRow.sourcePort}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Destination Port</span>
                <span className="font-bold text-gray-800">{selectedRow.destinationPort}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Protocol</span>
                <span className="font-bold text-gray-800">{selectedRow.protocol}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Action</span>
                <span className="font-bold text-gray-800">{selectedRow.action}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Traffic Type</span>
                <span className="font-bold text-gray-800">{selectedRow.trafficType}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Predicted Severity</span>
                <span className="font-bold text-gray-900">{selectedRow.severity}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedRow(null)}
              className="w-full py-2 bg-gray-900 text-white font-bold rounded-xl text-xs hover:bg-gray-800 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
