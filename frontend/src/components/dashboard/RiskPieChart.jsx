import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";

export default function RiskPieChart({ data }) {
  const COLORS = ["#E63946", "#C9A94A", "#4CAF50"]; // High: red, Medium: gold, Low: green

  return (
    <div className="bg-[#1E2126]/80 border border-[#C9A94A]/20 rounded-2xl p-6 shadow-[0_0_10px_rgba(201,169,74,0.1)]">
      <h3 className="font-semibold mb-4 text-[#EDEDED]">Risk Level Distribution</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie 
            data={data} 
            dataKey="count" 
            nameKey="level" 
            outerRadius={80} 
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1E2126', 
              border: '1px solid #C9A94A',
              borderRadius: '8px',
              color: '#EDEDED'
            }}
          />
          <Legend 
            wrapperStyle={{ color: '#EDEDED' }}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

