export default function ModuleCard({ title, description, onClick, isActive }) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer p-6 rounded-2xl transition-all border
                 ${isActive 
                   ? "bg-[#1E2126]/90 border-[#C9A94A]/40 shadow-[0_0_15px_rgba(201,169,74,0.2)]" 
                   : "bg-[#1E2126]/90 border-[#C9A94A]/20 hover:border-[#C9A94A]/40 shadow-[0_0_15px_rgba(201,169,74,0.15)]"}`}
    >
      <h2 className="text-lg font-semibold text-[#EDEDED] mb-2">{title}</h2>
      <p className="text-sm text-[#B0B0B0]">{description}</p>
    </div>
  );
}

