export default function KPIStats({ stats }) {
  const cards = [
    { label: "Total Threads", value: stats.totalThreads, color: "text-[#C9A94A]" },
    { label: "High Risk", value: stats.highRisk, color: "text-[#E63946]" },
    { label: "Avg Follow-ups", value: stats.avgFollowUps, color: "text-[#C9A94A]" },
    { label: "Responsiveness", value: stats.responsiveness + "%", color: "text-[#4CAF50]" }
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      {cards.map((c, i) => (
        <div key={i} className="bg-[#1E2126]/80 border border-[#C9A94A]/10 rounded-xl p-5 text-center shadow-inner hover:border-[#C9A94A]/30 transition-all">
          <p className="text-[#B0B0B0] text-sm mb-2">{c.label}</p>
          <h3 className={`text-2xl font-bold ${c.color}`}>{c.value}</h3>
        </div>
      ))}
    </div>
  );
}

