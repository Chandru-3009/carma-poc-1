import React, { useState } from "react";
import AIReplyModal from "./AIReplyModal";
import EscalationEmailModal from "./EscalationEmailModal";

export default function ConversationSummaryModal({ isOpen, onClose, threadData, onEscalate, userRole = 'project_manager' }) {
  const [aiReplyModalOpen, setAiReplyModalOpen] = useState(false);
  const [escalationModalOpen, setEscalationModalOpen] = useState(false);
  const [aiReply, setAiReply] = useState(null);
  const [loading, setLoading] = useState(false);
  if (!isOpen || !threadData) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncateText = (text, maxLength = 150) => {
    if (!text) return "No content";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const getTypeBadge = (type) => {
    const badges = {
      initial: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      "follow-up": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
      escalation: "bg-red-500/20 text-red-300 border-red-500/40",
    };
    return badges[type] || "bg-gray-500/20 text-gray-300 border-gray-500/40";
  };

  const handleGenerateAIReply = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/vendors/generate-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subcontractor_data: threadData
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate reply");
      }
      
      const result = await response.json();
      setAiReply(result);
      setAiReplyModalOpen(true);
    } catch (error) {
      console.error("AI generation failed:", error);
      // Fallback: generate a simple reply
      const vendorEmail = threadData.conversation_history?.[0]?.to || 
                         threadData.participants?.receivers?.[0] || 
                         "vendor@example.com";
      setAiReply({
        subject: `Re: ${threadData.thread_subject}`,
        body: `Dear Team,\n\nFollowing up on our previous communications regarding ${threadData.thread_subject}. We would appreciate your response at your earliest convenience to avoid any delays.\n\nThank you,\nProject Manager\nCARMA Construction`
      });
      setAiReplyModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAIReply = (text) => {
    console.log("AI Reply sent:", text);
    alert("Reply sent successfully!");
    setAiReplyModalOpen(false);
    setAiReply(null);
    onClose();
  };

  const handleSupervisorEscalation = () => {
    // Supervisor escalation - send to PM instead of vendor
    setEscalationModalOpen(true);
  };

  const handleEscalationSend = () => {
    // This will be handled by EscalationEmailModal
    setEscalationModalOpen(false);
    onClose();
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all m-0 p-0 overflow-hidden !top-0 !left-0 !right-0 !bottom-0"
      onClick={onClose}
      style={{ margin: 0, padding: 0, position: 'fixed' }}
    >
      <div
        className="bg-[#1A1D22]/95 backdrop-blur-md border border-[#C9A94A]/40 rounded-2xl shadow-[0_0_30px_rgba(201,169,74,0.2)] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-[#C9A94A]/20">
          <div>
            <h2 className="text-2xl font-semibold text-[#C9A94A] mb-2">
              Conversation Summary – {threadData.project_guess}
            </h2>
            <p className="text-gray-400 text-sm">{threadData.thread_subject}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[#C9A94A] transition text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Metadata */}
        <div className="p-6 border-b border-[#C9A94A]/20 bg-[#0D0F12]/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Emails:</span>
              <span className="text-[#EDEDED] ml-2 font-medium">
                {threadData.counts?.total_emails || 0}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Follow-ups:</span>
              <span className="text-[#EDEDED] ml-2 font-medium">
                {threadData.counts?.follow_up_count || 0}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Days Active:</span>
              <span className="text-[#EDEDED] ml-2 font-medium">
                {threadData.timeline?.days_between_first_and_last || 0}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Risk Level:</span>
              <span
                className={`ml-2 font-medium ${
                  threadData.risk_level === "HIGH"
                    ? "text-red-400"
                    : threadData.risk_level === "MEDIUM"
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {threadData.risk_level}
              </span>
            </div>
          </div>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {threadData.conversation_history && threadData.conversation_history.length > 0 ? (
            threadData.conversation_history.map((email, idx) => (
              <div
                key={idx}
                className="bg-[#0D0F12]/50 border border-[#C9A94A]/20 rounded-xl p-5 hover:border-[#C9A94A]/40 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs border ${getTypeBadge(email.type)}`}>
                        {email.type === "initial"
                          ? "Initial"
                          : email.type === "follow-up"
                          ? "Follow-up"
                          : "Escalation"}
                      </span>
                      <span className="text-[#EDEDED] font-medium text-sm">
                        {email.from || "Unknown"}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm font-medium mb-1">{email.subject}</p>
                    <p className="text-gray-400 text-xs mb-3">
                      {formatDate(email.date)} • To: {email.to || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#C9A94A]/10">
                  <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-[#A0A0A0] text-sm leading-relaxed whitespace-pre-wrap break-words py-2">
                      {email.body || "No content"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No conversation history available for this thread.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {/* <div className="p-6 border-t border-[#C9A94A]/20 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-[#B0B0B0] hover:text-[#EDEDED] transition"
          >
            Close
          </button>
          {userRole === 'project_manager' ? (
            <button
              onClick={handleGenerateAIReply}
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-[#C9A94A] to-[#E0C870] text-[#1A1D22] font-semibold rounded-lg hover:shadow-[0_0_12px_rgba(201,169,74,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "AI Reply"}
            </button>
          ) : (
            <button
              onClick={handleSupervisorEscalation}
              className="px-5 py-2 bg-gradient-to-r from-[#C9A94A] to-[#E0C870] text-[#1A1D22] font-semibold rounded-lg hover:shadow-[0_0_12px_rgba(201,169,74,0.4)] transition-all"
            >
              Escalate to Project Manager
            </button>
          )}
        </div> */}
      </div>

      {/* AI Reply Modal - Only for Project Managers */}
      {userRole === 'project_manager' && (
        <AIReplyModal
          isOpen={aiReplyModalOpen}
          onClose={() => {
            setAiReplyModalOpen(false);
            setAiReply(null);
          }}
          aiReply={aiReply}
          onSend={handleSendAIReply}
        />
      )}

      {/* Escalation Modal - For Supervisor escalation to PM */}
      {userRole === 'supervisor' && (
        <EscalationEmailModal
          isOpen={escalationModalOpen}
          onClose={() => {
            setEscalationModalOpen(false);
          }}
          threadData={threadData}
          userRole={userRole}
        />
      )}
    </div>
  );
}

