import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function FollowUpBarChart({ data }) {
  return (
    <div className="bg-[#1E2126]/80 border border-[#C9A94A]/20 rounded-2xl p-6 shadow-[0_0_10px_rgba(201,169,74,0.1)]">
      <h3 className="font-semibold mb-4 text-[#EDEDED]">Follow-up Activity</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#C9A94A" opacity={0.2} />
          <XAxis 
            dataKey="project" 
            stroke="#B0B0B0"
            tick={{ fill: '#B0B0B0' }}
          />
          <YAxis 
            stroke="#B0B0B0"
            tick={{ fill: '#B0B0B0' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1E2126', 
              border: '1px solid #C9A94A',
              borderRadius: '8px',
              color: '#EDEDED'
            }}
          />
          <Bar 
            dataKey="follow_ups" 
            fill="#C9A94A" 
            radius={[6, 6, 0, 0]}
            stroke="#E0C870"
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

