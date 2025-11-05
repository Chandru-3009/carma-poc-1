import React, { useState, useMemo } from "react";
import RiskBadge from "./RiskBadge";
import ConversationSummaryModal from "./ConversationSummaryModal";
import EscalationEmailModal from "./EscalationEmailModal";

export default function NonResponsiveTable({ data, userRole = 'project_manager' }) {
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [escalationModalOpen, setEscalationModalOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [selectedEscalationThread, setSelectedEscalationThread] = useState(null);

  // Sort by risk level: HIGH > MEDIUM > LOW
  const sortedData = useMemo(() => {
    if (!data) return [];
    const riskOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
    return [...data].sort((a, b) => {
      const aRisk = riskOrder[a.risk_level] || 99;
      const bRisk = riskOrder[b.risk_level] || 99;
      return aRisk - bRisk;
    });
  }, [data]);

  const handleViewSummary = (thread) => {
    setSelectedThread(thread);
    setSummaryModalOpen(true);
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#1E2126]/90 border border-[#C9A94A]/20 rounded-2xl shadow-[0_0_15px_rgba(201,169,74,0.15)] p-6">
        <h3 className="text-lg font-semibold mb-4 text-[#EDEDED]">Non-Responsive Subcontractors</h3>
        <div className="text-center py-8 text-[#B0B0B0]">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#1E2126]/90 border border-[#C9A94A]/20 rounded-2xl shadow-[0_0_15px_rgba(201,169,74,0.15)] p-6">
        <h3 className="text-lg font-semibold mb-4 text-[#EDEDED]">Non-Responsive Subcontractors</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="text-[#B0B0B0] border-b border-[#C9A94A]/20">
              <tr>
                <th className="py-3 px-2">Project</th>
                <th className="py-3 px-2">Thread Subject</th>
                <th className="py-3 px-2">Impact Area</th>
                <th className="py-3 px-2">Risk</th>
                <th className="py-3 px-2">Issue</th>
                <th className="py-3 px-2">Action</th>
                <th className="py-3 px-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, idx) => (
                <tr key={idx} className="border-b border-[#C9A94A]/10 hover:bg-[#1E2126]/50 transition">
                  <td className="py-3 px-2 font-medium text-[#EDEDED]">{item.project_guess}</td>
                  <td className="py-3 px-2 text-[#EDEDED]">{item.thread_subject}</td>
                  <td className="py-3 px-2 text-[#B0B0B0]">{item.impact_area}</td>
                  <td className="py-3 px-2"><RiskBadge level={item.risk_level} /></td>
                  <td className="py-3 px-2 text-[#B0B0B0]">{item.issue_detected}</td>
                  <td className="py-3 px-2 text-[#B0B0B0] max-w-xs truncate">{item.recommended_action}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleViewSummary(item)}
                      className="px-4 py-2 bg-gradient-to-r from-[#C9A94A] to-[#E0C870] text-[#1A1D22] font-medium rounded-lg hover:shadow-[0_0_10px_rgba(201,169,74,0.3)] transition-all"
                    >
                      View Summary
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConversationSummaryModal
        isOpen={summaryModalOpen}
        onClose={() => {
          setSummaryModalOpen(false);
          setSelectedThread(null);
        }}
        threadData={selectedThread}
        userRole={userRole}
        onEscalate={(thread) => {
          setSummaryModalOpen(false);
          setSelectedEscalationThread(thread);
          setEscalationModalOpen(true);
        }}
      />

      <EscalationEmailModal
        isOpen={escalationModalOpen}
        onClose={() => {
          setEscalationModalOpen(false);
          setSelectedEscalationThread(null);
        }}
        threadData={selectedEscalationThread}
        userRole={userRole}
      />
    </>
  );
}
