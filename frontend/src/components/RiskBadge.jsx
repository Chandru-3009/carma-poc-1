export default function RiskBadge({ level }) {
  const colorMap = {
    HIGH: "bg-red-500/20 text-red-400 border-red-500/40",
    MEDIUM: "bg-[#C9A94A]/20 text-[#C9A94A] border-[#C9A94A]/40",
    LOW: "bg-green-500/20 text-green-400 border-green-500/40"
  };
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${colorMap[level] || ""}`}>
      {level}
    </span>
  );
}

