import SummaryCards from './SummaryCards';
import SeverityCharts from './SeverityCharts';
import ThreatTable from './ThreatTable';
import ExportButton from './ExportButton';

export default function ResultsDashboard({ rawRows, predictions, darkMode = false }) {
  const tableRows = rawRows.map((raw, i) => ({ ...predictions[i], raw, index: i }));

  return (
    <div className="space-y-5">
      <SummaryCards results={predictions} total={rawRows.length} />
      <SeverityCharts results={predictions} darkMode={darkMode} />
      <ThreatTable rows={tableRows} darkMode={darkMode} />
      <ExportButton rows={rawRows} predictions={predictions} darkMode={darkMode} />
    </div>
  );
}
