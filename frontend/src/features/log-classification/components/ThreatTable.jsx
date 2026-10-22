import { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  Eye,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Sample fallback rows shown when no predictions are available yet
const sampleData = [
  {
    sourcePort: '54321',
    destinationPort: '22',
    protocol: 'TCP',
    action: 'BLOCK',
    trafficType: 'HTTP',
    severity: 'High'
  },
  {
    sourcePort: '12345',
    destinationPort: '53',
    protocol: 'UDP',
    action: 'ALLOW',
    trafficType: 'DNS',
    severity: 'Medium'
  },
  {
    sourcePort: '34567',
    destinationPort: '443',
    protocol: 'TCP',
    action: 'ALLOW',
    trafficType: 'HTTPS',
    severity: 'Low'
  },
  {
    sourcePort: '45678',
    destinationPort: '3389',
    protocol: 'TCP',
    action: 'BLOCK',
    trafficType: 'RDP',
    severity: 'High'
  },
  {
    sourcePort: '23456',
    destinationPort: '110',
    protocol: 'UDP',
    action: 'ALLOW',
    trafficType: 'POP3',
    severity: 'Medium'
  }
];

// Displays classified firewall logs in a table
export default function ThreatTable({
  rows = [],
  darkMode = false
}) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [selectedRow, setSelectedRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  // ============================================================
  // CONVERT RAW DATA INTO TABLE ROWS
  // ============================================================

  const items = useMemo(() => {
    if (rows.length > 0) {
      return rows.map((r) => {
        const actionTaken = String(
          r.raw['Action Taken'] ?? 'ALLOW'
        ).toUpperCase();

        return {
          id: r.index,

          sourcePort: String(
            r.raw['Source Port'] ?? '443'
          ),

          destinationPort: String(
            r.raw['Destination Port'] ?? '80'
          ),

          protocol: String(
            r.raw['Protocol'] ?? 'TCP'
          ).toUpperCase(),

          action: actionTaken.includes('BLOCK')
            ? 'BLOCK'
            : 'ALLOW',

          trafficType: String(
            r.raw['Traffic Type'] ?? 'HTTP'
          ).toUpperCase(),

          severity: r.severity,

          raw: r.raw
        };
      });
    }

    return sampleData.map((item, idx) => ({
      ...item,
      id: idx,
      raw: null
    }));
  }, [rows]);

  // ============================================================
  // FILTER
  // ============================================================

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Severity filter
      if (
        severityFilter !== 'All' &&
        item.severity !== severityFilter
      ) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();

        const match =
          item.sourcePort
            .toLowerCase()
            .includes(q) ||

          item.destinationPort
            .toLowerCase()
            .includes(q) ||

          item.protocol
            .toLowerCase()
            .includes(q) ||

          item.action
            .toLowerCase()
            .includes(q) ||

          item.trafficType
            .toLowerCase()
            .includes(q) ||

          String(item.severity)
            .toLowerCase()
            .includes(q);

        if (!match) {
          return false;
        }
      }

      return true;
    });
  }, [
    items,
    severityFilter,
    search
  ]);

  // ============================================================
  // PAGINATION
  // ============================================================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredItems.length / pageSize
    )
  );

  const safePage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedItems = useMemo(() => {
    const start =
      (safePage - 1) * pageSize;

    return filteredItems.slice(
      start,
      start + pageSize
    );
  }, [
    filteredItems,
    safePage
  ]);

  // ============================================================
  // COLORS
  // ============================================================

  const cardBg = darkMode
    ? 'bg-[#1A2218]'
    : 'bg-white';

  const cardBorder = darkMode
    ? 'border-[#2A3526]'
    : 'border-gray-200';

  const borderLight = darkMode
    ? 'border-[#232F1E]'
    : 'border-gray-100';

  const textPrimary = darkMode
    ? 'text-gray-100'
    : 'text-gray-900';

  const textBody = darkMode
    ? 'text-gray-200'
    : 'text-gray-800';

  const textMuted = darkMode
    ? 'text-gray-300'
    : 'text-gray-700';

  const textSecondary = darkMode
    ? 'text-gray-400'
    : 'text-gray-500';

  const textFaint = darkMode
    ? 'text-gray-500'
    : 'text-gray-400';

  const inputBg = darkMode
    ? 'bg-[#141A11] border-[#2A3526] hover:border-[#354230] text-gray-200 placeholder:text-gray-500'
    : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-800 placeholder:text-gray-400';

  const selectBg = darkMode
    ? 'bg-[#141A11] border-[#2A3526] hover:border-[#354230] text-gray-300'
    : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-700';

  const theadBg = darkMode
    ? 'border-y border-[#232F1E] bg-[#141A11] text-gray-300'
    : 'border-y border-gray-100 bg-gray-50 text-gray-700';

  const rowHover = darkMode
    ? 'hover:bg-[#212B1B]/80'
    : 'hover:bg-gray-50';

  const eyeBtn = darkMode
    ? 'text-gray-500 hover:text-gray-200 hover:bg-[#232F1E]'
    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100';

  const pagerBtn = darkMode
    ? 'border-[#2A3526] text-gray-400 hover:bg-[#212B1B]'
    : 'border-gray-200 text-gray-600 hover:bg-gray-50';

  const pageNumBtn = darkMode
    ? 'text-gray-300 border-[#2A3526] hover:bg-[#212B1B]'
    : 'text-gray-600 border-gray-200 hover:bg-gray-50';

  // ============================================================
  // SEVERITY BADGE
  // ============================================================

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

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-sm overflow-hidden`}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="p-6 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>
          <h3
            className={`font-bold text-lg ${textPrimary}`}
          >
            Classified Firewall Logs
          </h3>

          <p
            className={`text-sm mt-1 ${textSecondary}`}
          >
            Latest classified log events
          </p>
        </div>

        {/* ====================================================
            FILTER CONTROLS
        ==================================================== */}

        <div className="flex flex-wrap items-center gap-3">

          {/* SEARCH */}

          <div className="relative w-52">

            <Search
              className={`w-4 h-4 absolute left-3 top-3 pointer-events-none ${textFaint}`}
            />

            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search..."
              className={`w-full border text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#4A5C2E] ${inputBg}`}
            />

          </div>

          {/* SEVERITY FILTER */}

          <div className="relative">

            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`appearance-none border text-sm font-medium rounded-xl pl-3 pr-9 py-2.5 focus:outline-none cursor-pointer ${selectBg}`}
            >
              <option value="All">
                Severity: All
              </option>

              <option value="High">
                Severity: High
              </option>

              <option value="Medium">
                Severity: Medium
              </option>

              <option value="Low">
                Severity: Low
              </option>
            </select>

            <ChevronDown
              className={`w-4 h-4 absolute right-2.5 top-3 pointer-events-none ${textFaint}`}
            />

          </div>

        </div>

      </div>

      {/* ======================================================
          TABLE
      ====================================================== */}

      <div className="overflow-x-auto">

        <table className="w-full text-[14px]">

          <thead>

            <tr className={theadBg}>

              <th
                className="!text-[13px] !font-semibold text-left px-6 py-3.5"
              >
                Source Port
              </th>

              <th
                className="!text-[13px] !font-semibold text-left px-6 py-3.5"
              >
                Destination Port
              </th>

              <th
                className="!text-[13px] !font-semibold text-left px-6 py-3.5"
              >
                Protocol
              </th>

              <th
                className="!text-[13px] !font-semibold text-left px-6 py-3.5"
              >
                Action
              </th>

              <th
                className="!text-[13px] !font-semibold text-left px-6 py-3.5"
              >
                Traffic Type
              </th>

              <th
                className="!text-[13px] !font-semibold text-center px-6 py-3.5"
              >
                Predicted Severity
              </th>

              <th
                className="!text-[13px] !font-semibold text-center px-6 py-3.5"
              >
                Details
              </th>

            </tr>

          </thead>

          {/* ==================================================
              TABLE BODY
          ================================================== */}

          <tbody
            className={`divide-y ${
              darkMode
                ? 'divide-[#232F1E]'
                : 'divide-gray-100'
            }`}
          >

            {paginatedItems.length === 0 ? (

              <tr>

                <td
                  colSpan={7}
                  className={`text-center py-12 text-sm ${textFaint}`}
                >
                  No log entries match
                  the selected filters.
                </td>

              </tr>

            ) : (

              paginatedItems.map((item) => (

                <tr
                  key={item.id}
                  className={`transition-colors ${rowHover}`}
                >

                  {/* SOURCE PORT */}

                  <td
                    className={`px-6 py-3.5 text-[14px] font-medium ${textBody}`}
                  >
                    {item.sourcePort}
                  </td>

                  {/* DESTINATION PORT */}

                  <td
                    className={`px-6 py-3.5 text-[14px] font-medium ${textBody}`}
                  >
                    {item.destinationPort}
                  </td>

                  {/* PROTOCOL */}

                  <td
                    className={`px-6 py-3.5 text-[14px] font-medium ${textBody}`}
                  >
                    {item.protocol}
                  </td>

                  {/* ACTION */}

                  <td
                    className={`px-6 py-3.5 text-[14px] font-semibold ${textBody}`}
                  >
                    {item.action}
                  </td>

                  {/* TRAFFIC TYPE */}

                  <td
                    className={`px-6 py-3.5 text-[14px] font-medium ${textBody}`}
                  >
                    {item.trafficType}
                  </td>

                  {/* PREDICTED SEVERITY */}

                  <td className="px-6 py-3.5 text-center">

                    <span
                      className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full !text-[13px] font-semibold min-w-[76px] ${severityPillClass(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>

                  </td>

                  {/* DETAILS */}

                  <td className="px-6 py-3.5 text-center">

                    <button
                      onClick={() =>
                        setSelectedRow(item)
                      }
                      title="View details"
                      className={`transition-colors cursor-pointer inline-flex items-center justify-center p-2 rounded-lg ${eyeBtn}`}
                    >
                      <Eye className="w-5 h-5" />
                    </button>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {/* ======================================================
          PAGINATION
      ====================================================== */}

      {filteredItems.length > 0 && (

        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t ${borderLight}`}
        >

          <span
            className={`text-[13px] ${textSecondary}`}
          >
            Showing{' '}

            <span
              className={`font-semibold ${textMuted}`}
            >
              {(safePage - 1) *
                pageSize +
                1}
              -
              {Math.min(
                safePage * pageSize,
                filteredItems.length
              )}
            </span>

            {' '}of{' '}

            <span
              className={`font-semibold ${textMuted}`}
            >
              {filteredItems.length}
            </span>

            {' '}entries
          </span>

          <div className="flex items-center gap-1.5">

            {/* PREVIOUS */}

            <button
              onClick={() =>
                setCurrentPage((p) =>
                  Math.max(1, p - 1)
                )
              }
              disabled={safePage === 1}
              className={`flex items-center justify-center w-9 h-9 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${pagerBtn}`}
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* PAGE NUMBERS */}

            {Array.from(
              {
                length: totalPages
              },
              (_, i) => i + 1
            )
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - safePage) <= 1
              )
              .reduce((acc, p) => {

                if (
                  acc.length > 0 &&
                  p -
                    acc[
                      acc.length - 1
                    ] >
                    1
                ) {
                  acc.push(-1);
                }

                acc.push(p);

                return acc;

              }, [])
              .map((p, idx) =>

                p === -1 ? (

                  <span
                    key={`ellipsis-${idx}`}
                    className={`px-1.5 text-[13px] ${textFaint}`}
                  >
                    …
                  </span>

                ) : (

                  <button
                    key={p}
                    onClick={() =>
                      setCurrentPage(p)
                    }
                    className={`w-9 h-9 rounded-lg !text-[13px] font-semibold transition-colors cursor-pointer ${
                      p === safePage
                        ? 'bg-[#4A5C2E] text-white'
                        : `border ${pageNumBtn}`
                    }`}
                  >
                    {p}
                  </button>

                )
              )}

            {/* NEXT */}

            <button
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(
                    totalPages,
                    p + 1
                  )
                )
              }
              disabled={
                safePage === totalPages
              }
              className={`flex items-center justify-center w-9 h-9 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${pagerBtn}`}
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

          </div>

        </div>

      )}

      {/* ======================================================
          DETAILS MODAL
      ====================================================== */}

      {selectedRow && (

        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${
            darkMode
              ? 'bg-black/60'
              : 'bg-gray-900/40'
          }`}
        >

          <div
            className={`rounded-2xl border max-w-md w-full p-6 shadow-2xl space-y-5 relative ${cardBg} ${cardBorder}`}
          >

            {/* MODAL HEADER */}

            <div
              className={`flex items-center justify-between border-b pb-4 ${borderLight}`}
            >

              <h4
                className={`font-bold text-lg ${textPrimary}`}
              >
                Firewall Log Record Details
              </h4>

              <button
                onClick={() =>
                  setSelectedRow(null)
                }
                className={`cursor-pointer p-2 rounded-lg ${
                  darkMode
                    ? 'text-gray-500 hover:text-gray-300 hover:bg-[#232F1E]'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            {/* MODAL DETAILS */}

            <div
              className={`space-y-0 text-[14px] divide-y ${
                darkMode
                  ? 'divide-[#232F1E]'
                  : 'divide-gray-100'
              }`}
            >

              <div className="flex justify-between gap-4 py-3">
                <span className={textSecondary}>
                  Source Port
                </span>

                <span
                  className={`font-bold ${textBody}`}
                >
                  {selectedRow.sourcePort}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-3">
                <span className={textSecondary}>
                  Destination Port
                </span>

                <span
                  className={`font-bold ${textBody}`}
                >
                  {selectedRow.destinationPort}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-3">
                <span className={textSecondary}>
                  Protocol
                </span>

                <span
                  className={`font-bold ${textBody}`}
                >
                  {selectedRow.protocol}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-3">
                <span className={textSecondary}>
                  Action
                </span>

                <span
                  className={`font-bold ${textBody}`}
                >
                  {selectedRow.action}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-3">
                <span className={textSecondary}>
                  Traffic Type
                </span>

                <span
                  className={`font-bold ${textBody}`}
                >
                  {selectedRow.trafficType}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-3">
                <span className={textSecondary}>
                  Predicted Severity
                </span>

                <span
                  className={`font-bold ${textPrimary}`}
                >
                  {selectedRow.severity}
                </span>
              </div>

            </div>

            {/* CLOSE */}

            <button
              onClick={() =>
                setSelectedRow(null)
              }
              className={`w-full py-2.5 font-bold rounded-xl text-sm cursor-pointer ${
                darkMode
                  ? 'bg-gray-100 text-gray-900 hover:bg-white'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
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