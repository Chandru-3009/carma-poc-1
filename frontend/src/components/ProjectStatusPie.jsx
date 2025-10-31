import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444']; // green, amber, red

function ProjectStatusPie({ data = {} }) {
  // Transform data to match pie chart format
  const chartData = [
    { name: 'On Track', value: data.onTrack || 0 },
    { name: 'At Risk', value: data.atRisk || 0 },
    { name: 'Delayed', value: data.delayed || 0 }
  ].filter(item => item.value > 0);

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Project Status</h3>
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-gray-500">No status data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Project Status</h3>
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value}`, 'Count']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ProjectStatusPie;

