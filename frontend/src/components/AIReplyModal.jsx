import React, { useState, useEffect } from "react";

export default function AIReplyModal({ isOpen, onClose, aiReply, onSend }) {
  const [manualText, setManualText] = useState(aiReply?.body || "");

  useEffect(() => {
    if (aiReply?.body) {
      setManualText(aiReply.body);
    }
  }, [aiReply]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all m-0 p-0 overflow-hidden !top-0 !left-0 !right-0 !bottom-0"
      style={{ margin: 0, padding: 0, position: 'fixed' }}
      onClick={onClose}
    >
      <div 
        className="bg-[#1A1D22]/95 backdrop-blur-md border border-[#C9A94A]/40 rounded-2xl shadow-[0_0_30px_rgba(201,169,74,0.2)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-[#C9A94A]/20">
          <h3 className="text-xl font-semibold text-[#C9A94A]">AI-Powered Reply ✨</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-[#C9A94A] transition text-2xl leading-none">
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-gray-400 text-sm bg-[#0D0F12]/50 p-3 rounded-lg border border-[#C9A94A]/20">
            You can edit the AI-generated message before sending.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#EDEDED]">Subject</label>
            <input
              type="text"
              value={aiReply?.subject || ""}
              readOnly
              className="w-full border border-[#C9A94A]/40 bg-transparent text-gray-200 rounded-xl p-3 bg-[#0D0F12]/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#EDEDED]">Message</label>
            <textarea
              rows={8}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="AI-generated reply will appear here..."
              className="w-full bg-transparent border border-[#C9A94A]/40 text-gray-200 placeholder-gray-500 rounded-xl p-3 focus:ring-2 focus:ring-[#C9A94A] focus:border-[#C9A94A] focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-[#C9A94A]/20 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-5 py-2 text-gray-400 hover:text-[#EDEDED] font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSend(manualText)}
            className="px-5 py-2 bg-gradient-to-r from-[#C9A94A] to-[#E0C870] text-[#0D0F12] rounded-lg hover:from-[#E0C870] hover:to-[#C9A94A] font-medium transition shadow-[0_0_10px_rgba(201,169,74,0.4)]"
          >
            Send Reply
          </button>
        </div>
      </div>
    </div>
  );
}

