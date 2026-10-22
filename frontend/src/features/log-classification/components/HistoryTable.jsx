import { useState } from 'react';
import { Eye, Trash2 } from 'lucide-react';

// Displays previous upload sessions
export default function HistoryTable({
  sessions,
  darkMode = false,
  onView,
  onDelete
}) {
  // Store delete confirmation and deleting status
  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  const theadBg = darkMode
    ? 'border-y border-[#232F1E] bg-[#141A11] text-gray-300'
    : 'border-y border-gray-100 bg-gray-50 text-gray-700';

  const rowHover = darkMode
    ? 'hover:bg-[#212B1B]/80'
    : 'hover:bg-gray-50/80';

  const viewBtn = darkMode
    ? 'text-gray-400 hover:text-gray-100 hover:bg-[#232F1E]'
    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100';

  const deleteBtn = darkMode
    ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
    : 'text-red-500 hover:text-red-600 hover:bg-red-50';

  const confirmSession =
    sessions.find((s) => s.id === confirmId) || null;

  const handleConfirmDelete = async () => {
    if (!confirmId) return;

    setDeletingId(confirmId);

    try {
      await onDelete(confirmId);
    } catch {
      alert('Failed to delete session.');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <div
      className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-sm overflow-hidden`}
    >

      {/* =====================================================
          HISTORY TABLE
      ===================================================== */}

      <div className="overflow-x-auto">

        <table className="w-full text-[14px]">

          {/* =================================================
              TABLE HEADER
          ================================================= */}

          <thead>

            <tr className={theadBg}>

              <th
                className="!text-[13px] !font-semibold text-left px-6 py-3.5"
              >
                Filename
              </th>

              <th
                className="!text-[13px] !font-semibold text-left px-6 py-3.5"
              >
                Uploaded At
              </th>

              <th
                className="!text-[13px] !font-semibold text-center px-6 py-3.5"
              >
                Total
              </th>

              <th
                className="!text-[13px] !font-semibold text-center px-6 py-3.5"
              >
                High
              </th>

              <th
                className="!text-[13px] !font-semibold text-center px-6 py-3.5"
              >
                Medium
              </th>

              <th
                className="!text-[13px] !font-semibold text-center px-6 py-3.5"
              >
                Low
              </th>

              <th
                className="!text-[13px] !font-semibold text-center px-6 py-3.5"
              >
                Actions
              </th>

            </tr>

          </thead>

          {/* =================================================
              TABLE BODY
          ================================================= */}

          <tbody
            className={`divide-y ${
              darkMode
                ? 'divide-[#232F1E]'
                : 'divide-gray-100'
            }`}
          >

            {sessions.map((session) => (

              <tr
                key={session.id}
                className={`transition-colors ${rowHover}`}
              >

                {/* FILENAME */}

                <td
                  className={`px-6 py-3.5 text-[14px] font-medium font-mono ${textBody}`}
                >
                  {session.filename}
                </td>

                {/* UPLOADED AT */}

                <td
                  className={`px-6 py-3.5 text-[14px] font-medium ${textBody}`}
                >
                  {new Date(
                    session.uploaded_at
                  ).toLocaleString()}
                </td>

                {/* TOTAL */}

                <td
                  className={`px-6 py-3.5 text-center text-[14px] font-semibold ${textPrimary}`}
                >
                  {session.total_logs.toLocaleString()}
                </td>

                {/* HIGH */}

                <td
                  className="px-6 py-3.5 text-center text-[14px] font-semibold text-[#dc2626]"
                >
                  {session.high_count.toLocaleString()}
                </td>

                {/* MEDIUM */}

                <td
                  className="px-6 py-3.5 text-center text-[14px] font-semibold text-[#e69500]"
                >
                  {session.medium_count.toLocaleString()}
                </td>

                {/* LOW */}

                <td
                  className="px-6 py-3.5 text-center text-[14px] font-semibold text-[#059669]"
                >
                  {session.low_count.toLocaleString()}
                </td>

                {/* ACTIONS */}

                <td className="px-6 py-3.5">

                  <div className="flex items-center justify-center gap-2">

                    {/* VIEW */}

                    <button
                      onClick={() =>
                        onView(session.id)
                      }
                      className={`transition-colors cursor-pointer inline-flex items-center justify-center p-2 rounded-lg ${viewBtn}`}
                      title="View results"
                    >
                      <Eye className="w-5 h-5" />
                    </button>

                    {/* DELETE */}

                    <button
                      onClick={() =>
                        setConfirmId(session.id)
                      }
                      className={`transition-colors cursor-pointer inline-flex items-center justify-center p-2 rounded-lg ${deleteBtn}`}
                      title="Delete session"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                  </div>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* =====================================================
          DELETE CONFIRMATION DIALOG
      ===================================================== */}

      {confirmSession && (

        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${
            darkMode
              ? 'bg-black/60'
              : 'bg-gray-900/40'
          }`}
        >

          <div
            className={`rounded-2xl border max-w-sm w-full p-6 shadow-2xl space-y-5 relative ${cardBg} ${cardBorder}`}
          >

            {/* MODAL HEADER */}

            <div>

              <h4
                className={`font-bold text-base ${textPrimary}`}
              >
                Delete Upload Record
              </h4>

              <p
                className={`text-sm mt-2 ${textSecondary}`}
              >
                Are you sure you want to permanently
                delete this record?
              </p>

              <p
                className={`text-sm mt-2 font-mono font-semibold ${textBody}`}
              >
                {confirmSession.filename}
              </p>

            </div>

            {/* MODAL BUTTONS */}

            <div
              className={`flex gap-3 pt-4 border-t ${borderLight}`}
            >

              {/* CANCEL */}

              <button
                onClick={() =>
                  setConfirmId(null)
                }
                disabled={
                  deletingId === confirmId
                }
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode
                    ? 'bg-[#141A11] border-[#354230] text-gray-300 hover:bg-[#212B1B]'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>

              {/* CONFIRM */}

              <button
                onClick={handleConfirmDelete}
                disabled={
                  deletingId === confirmId
                }
                className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === confirmId
                  ? 'Deleting…'
                  : 'Confirm'}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}