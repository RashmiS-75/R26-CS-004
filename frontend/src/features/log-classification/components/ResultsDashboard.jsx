import SummaryCards from './SummaryCards';
import SeverityCharts from './SeverityCharts';
import ThreatTable from './ThreatTable';
import ExportButton from './ExportButton';

export default function ResultsDashboard({ rawRows, predictions }) {
  const tableRows = rawRows.map((raw, i) => ({ ...predictions[i], raw, index: i }));

  return (
    <div className="space-y-5">
      <SummaryCards results={predictions} total={rawRows.length} />
      <SeverityCharts results={predictions} />
      <ThreatTable rows={tableRows} />
      <ExportButton rows={rawRows} predictions={predictions} />
    </div>
  );
}
