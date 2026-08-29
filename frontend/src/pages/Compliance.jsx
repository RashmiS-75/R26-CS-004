import ComplianceApp from '../features/compliance/App'
import '../features/compliance/style.css'

export default function Compliance() {
  return (
    <div className="compliance-embed" style={{ width: "100%", minHeight: "80vh" }}>
  <ComplianceApp />
</div>
  )
}

