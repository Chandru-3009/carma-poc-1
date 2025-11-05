import React, { useState, useEffect } from "react";
import usersData from "../data/users.json";

export default function EscalationEmailModal({ isOpen, onClose, threadData, userRole = 'project_manager' }) {
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    body: "",
  });

  useEffect(() => {
    if (threadData && isOpen) {
      let recipientEmail = "";
      let body = "";

      if (userRole === 'supervisor') {
        // Supervisor escalation: send to Project Manager
        const pmUser = usersData.find(user => 
          user.role.toLowerCase() === 'project manager'
        );
        recipientEmail = pmUser?.email || "chandru-pm@carma.com"; // Fallback to default PM email
        
        // Generate escalation body for PM
        body = `Hi ${pmUser?.email?.split('@')[0] || "Project Manager"},

I am escalating an issue regarding the project "${threadData.project_guess}".

Despite multiple follow-ups, we have not received any response from the vendor regarding the following:

Subject: ${threadData.thread_subject}
Impact Area: ${threadData.impact_area}
Risk Level: ${threadData.risk_level}

Issue Summary:
${threadData.reason || "Multiple follow-ups have been sent without any response, which may affect our project schedule."}

Timeline:
- First Contact: ${threadData.timeline?.first_email_date || "N/A"}
- Last Follow-Up: ${threadData.timeline?.last_email_date || "N/A"}
- Days Elapsed: ${threadData.timeline?.days_between_first_and_last || 0}
- Follow-Up Attempts: ${threadData.counts?.follow_up_count || 0}

${threadData.recommended_action || "Please review and advise on escalation or alternative vendor action."}

Best regards,
${localStorage.getItem('userEmail')?.split('@')[0] || "Supervisor"}
CARMA Construction`;
      } else {
        // Project Manager escalation: send to vendor
        recipientEmail =
          threadData.conversation_history?.[0]?.to ||
          threadData.participants?.receivers?.[0] ||
          `vendor@${threadData.participants?.to_domain || "example.com"}`;

        body = `Dear ${threadData.participants?.receivers?.[0]?.split("@")[0] || "Team"},

I am reaching out to escalate an urgent matter related to the project "${threadData.project_guess}".

We have been trying to obtain a response regarding the following communication without success:

Subject: ${threadData.thread_subject}
Impact Area: ${threadData.impact_area}
Risk Level: ${threadData.risk_level}

Summary:
${threadData.reason || "Multiple follow-ups have been sent without any response, which may affect our project schedule."}

Timeline:
First Contact: ${threadData.timeline?.first_email_date || "N/A"}
Last Follow-Up: ${threadData.timeline?.last_email_date || "N/A"}
Days Elapsed: ${threadData.timeline?.days_between_first_and_last || 0}
Follow-Up Attempts: ${threadData.counts?.follow_up_count || 0}

We kindly request your immediate attention to this matter. Please provide an update or confirmation by the end of the day to avoid further impact on the project timeline.

Thank you.

Best regards,
Chandru
Project Manager
CARMA Construction`;
      }

      // Generate escalation subject
      const subject = userRole === 'supervisor' 
        ? `Escalation – Vendor Non-Response on ${threadData.project_guess}`
        : `URGENT: Escalation - ${threadData.thread_subject}`;

      setEmailData({
        to: recipientEmail,
        subject,
        body,
      });
    }
  }, [threadData, isOpen, userRole]);

  const handleSend = () => {
    // TODO: Implement actual email sending
    console.log("Escalation email sent:", emailData);
    const successMessage = userRole === 'supervisor' 
      ? "Escalation sent to Project Manager successfully!"
      : "Escalation email sent successfully!";
    alert(successMessage);
    onClose();
    setEmailData({ to: "", subject: "", body: "" });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all m-0 p-0 overflow-hidden !top-0 !left-0 !right-0 !bottom-0"
      onClick={onClose}
      style={{ margin: 0, padding: 0, position: 'fixed' }}
    >
      <div
        className="bg-[#1A1D22]/95 backdrop-blur-md border border-[#C9A94A]/40 rounded-2xl shadow-[0_0_30px_rgba(201,169,74,0.2)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#C9A94A]/20">
          <h2 className="text-xl font-semibold text-[#C9A94A]">
            {userRole === 'supervisor' ? "Escalate to Project Manager" : "AI-Powered Escalation Email"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[#C9A94A] transition text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Info Message */}
          <p className="text-gray-400 text-sm bg-[#0D0F12]/50 p-3 rounded-lg border border-[#C9A94A]/20">
            {userRole === 'supervisor' 
              ? "Review and send escalation email to the Project Manager."
              : "You can review or edit the AI-generated escalation email before sending."}
          </p>

          {/* To Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#EDEDED]">To</label>
            <input
              type="email"
              value={emailData.to}
              onChange={(e) =>
                setEmailData({ ...emailData, to: e.target.value })
              }
              className="w-full border border-[#C9A94A]/40 bg-transparent text-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#C9A94A] focus:border-[#C9A94A] focus:outline-none transition"
              placeholder="vendor@example.com"
            />
          </div>

          {/* Subject Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#EDEDED]">Subject</label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) =>
                setEmailData({ ...emailData, subject: e.target.value })
              }
              className="w-full border border-[#C9A94A]/40 bg-transparent text-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#C9A94A] focus:border-[#C9A94A] focus:outline-none transition"
              placeholder="Escalation email subject"
            />
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#EDEDED]">Message</label>
            <textarea
              rows={12}
              value={emailData.body}
              onChange={(e) =>
                setEmailData({ ...emailData, body: e.target.value })
              }
              className="w-full border border-[#C9A94A]/40 bg-transparent text-gray-200 placeholder-gray-500 rounded-xl p-3 focus:ring-2 focus:ring-[#C9A94A] focus:border-[#C9A94A] focus:outline-none transition resize-none"
              placeholder="AI-generated escalation email body..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[#C9A94A]/20 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-400 hover:text-[#EDEDED] font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!emailData.to || !emailData.subject || !emailData.body}
            className={`px-5 py-2 rounded-lg font-medium transition-all duration-300 ${
              emailData.to && emailData.subject && emailData.body
                ? "bg-gradient-to-r from-[#C9A94A] to-[#E0C870] text-[#0D0F12] hover:from-[#E0C870] hover:to-[#C9A94A] shadow-[0_0_10px_rgba(201,169,74,0.4)]"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
}

