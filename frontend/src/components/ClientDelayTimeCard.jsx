import { FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';

function ClientDelayTimeCard({ data = [] }) {
  // Calculate average delay time from KPI data
  const delays = data
    .map(item => item.kpis?.avg_gap_days || item.kpis?.last_gap_days || 0)
    .filter(d => d > 0);
  
  const avgDelay = delays.length > 0 
    ? (delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(1)
    : 0;
  
  const highRiskItems = data.filter(item => item.risk_level === 'HIGH').length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Client Delay Time</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <FaCalendarAlt className="w-4 h-4" />
            <span className="text-sm">Avg. Delay Days</span>
          </div>
          <span className={`text-lg font-bold ${avgDelay > 3 ? 'text-red-600' : avgDelay > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {avgDelay} days
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <FaExclamationTriangle className="w-4 h-4" />
            <span className="text-sm">High Risk Items</span>
          </div>
          <span className={`text-lg font-bold ${highRiskItems > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {highRiskItems}
          </span>
        </div>
        {highRiskItems > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {highRiskItems} item{highRiskItems > 1 ? 's' : ''} require{highRiskItems === 1 ? 's' : ''} escalation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientDelayTimeCard;

