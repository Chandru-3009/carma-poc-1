import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

function NonResponsivePie({ data }) {
  const chartData = data.map((d) => ({ name: d.name, value: d.unanswered }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/2 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} unanswered`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full lg:w-1/2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Subcontractor</th>
                <th className="text-left px-3 py-2 font-semibold">Requests Sent</th>
                <th className="text-left px-3 py-2 font-semibold">Unanswered</th>
                <th className="text-left px-3 py-2 font-semibold">Last Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, idx) => (
                <tr key={row.name} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">{row.name}</td>
                  <td className="px-3 py-2 text-gray-700">{row.total}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.unanswered > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {row.unanswered}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{row.lastContact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-4">Use case: Non-responsive subcontractor tracking for procurement risk.</p>
    </div>
  );
}

export default NonResponsivePie;


