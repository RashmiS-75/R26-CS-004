import { FileText, AlertTriangle, Shield, ShieldCheck } from 'lucide-react';

export default function SummaryCards({ results, total }) {
  const high = results.filter((r) => r.severity === 'High').length;
  const medium = results.filter((r) => r.severity === 'Medium').length;
  const low = results.filter((r) => r.severity === 'Low').length;

  const highPct = total > 0 ? ((high / total) * 100).toFixed(1) : '0.0';
  const medPct = total > 0 ? ((medium / total) * 100).toFixed(1) : '0.0';
  const lowPct = total > 0 ? ((low / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Logs */}
      <div className="rounded-2xl bg-[#4A5C2E] text-white p-5 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
          <FileText className="w-6 h-6 stroke-[1.8]" />
        </div>
        <div>
          <span className="text-xs font-medium text-white/90">Total Logs</span>
          <div className="text-3xl font-black tracking-tight leading-tight mt-0.5">{total.toLocaleString()}</div>
          <span className="text-[11px] font-normal text-white/80">Processed records</span>
        </div>
      </div>

      {/* High */}
      <div className="rounded-2xl bg-[#dc2626] text-white p-5 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
          <AlertTriangle className="w-6 h-6 stroke-[1.8]" />
        </div>
        <div>
          <span className="text-xs font-medium text-white/90">High</span>
          <div className="text-3xl font-black tracking-tight leading-tight mt-0.5">{high.toLocaleString()}</div>
          <span className="text-[11px] font-normal text-white/80">{highPct}% of total</span>
        </div>
      </div>

      {/* Medium */}
      <div className="rounded-2xl bg-[#e69500] text-white p-5 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
          <Shield className="w-6 h-6 stroke-[1.8]" />
        </div>
        <div>
          <span className="text-xs font-medium text-white/90">Medium</span>
          <div className="text-3xl font-black tracking-tight leading-tight mt-0.5">{medium.toLocaleString()}</div>
          <span className="text-[11px] font-normal text-white/80">{medPct}% of total</span>
        </div>
      </div>

      {/* Low */}
      <div className="rounded-2xl bg-[#059669] text-white p-5 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
          <ShieldCheck className="w-6 h-6 stroke-[1.8]" />
        </div>
        <div>
          <span className="text-xs font-medium text-white/90">Low</span>
          <div className="text-3xl font-black tracking-tight leading-tight mt-0.5">{low.toLocaleString()}</div>
          <span className="text-[11px] font-normal text-white/80">{lowPct}% of total</span>
        </div>
      </div>
    </div>
  );
}
