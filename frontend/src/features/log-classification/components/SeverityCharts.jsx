import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export default function SeverityCharts({ results = [] }) {
  let highCount = 213;
  let medCount = 4477;
  let lowCount = 310;

  if (results.length > 0) {
    highCount = results.filter((r) => r.severity === 'High').length;
    medCount = results.filter((r) => r.severity === 'Medium').length;
    lowCount = results.filter((r) => r.severity === 'Low').length;
  }

  const totalLogs = results.length > 0 ? results.length : 5000;
  const highPct = ((highCount / totalLogs) * 100).toFixed(1);
  const medPct = ((medCount / totalLogs) * 100).toFixed(1);
  const lowPct = ((lowCount / totalLogs) * 100).toFixed(1);

  const pieData = [
    { name: 'High', value: highCount, color: '#dc2626', pct: `${highPct}%` },
    { name: 'Medium', value: medCount, color: '#e69500', pct: `${medPct}%` },
    { name: 'Low', value: lowCount, color: '#059669', pct: `${lowPct}%` },
  ];

  const barData = [
    { name: 'Low', value: lowCount, color: '#059669' },
    { name: 'Medium', value: medCount, color: '#e69500' },
    { name: 'High', value: highCount, color: '#dc2626' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 1. Classification Distribution Donut Card */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Classification Distribution</h3>
          <p className="text-xs text-gray-500 mb-2">Breakdown of classified logs</p>

          <div className="flex items-center justify-between gap-4 py-2">
            {/* Donut Chart with Center Text */}
            <div className="w-52 h-52 relative flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={82}
                    paddingAngle={2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-black text-gray-900 tracking-tight leading-none">
                  {totalLogs.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-gray-500 mt-1">Total</span>
              </div>
            </div>

            {/* Right Legend List */}
            <div className="flex-1 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
                  <span className="font-medium text-gray-700">High</span>
                </div>
                <span className="font-bold text-gray-900">
                  {highCount.toLocaleString()} ({highPct}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e69500]" />
                  <span className="font-medium text-gray-700">Medium</span>
                </div>
                <span className="font-bold text-gray-900">
                  {medCount.toLocaleString()} ({medPct}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                  <span className="font-medium text-gray-700">Low</span>
                </div>
                <span className="font-bold text-gray-900">
                  {lowCount.toLocaleString()} ({lowPct}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Severity Counts Bar Chart Card */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Severity Counts</h3>
          <p className="text-xs text-gray-500 mb-2">Count distribution of classified logs by severity level</p>

          <div className="h-52 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={100}>
                  {barData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                  <LabelList dataKey="value" position="top" style={{ fill: '#0f172a', fontSize: 11, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
