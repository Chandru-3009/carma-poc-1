import { useState, useEffect } from 'react';

function ReplyDialog({ email, isOpen, onClose }) {
  const [aiReplies, setAiReplies] = useState([]);
  const [selectedReply, setSelectedReply] = useState('');
  const [customReply, setCustomReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && email) {
      fetchAIReplies();
    } else {
      // Reset state when dialog closes
      setAiReplies([]);
      setSelectedReply('');
      setCustomReply('');
      setError(null);
    }
  }, [isOpen, email]);

  const fetchAIReplies = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/ai/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI replies');
      }

      const data = await response.json();
      setAiReplies(data.replies || []);
    } catch (err) {
      setError(err.message || 'Failed to generate reply suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const messageToSend = customReply || selectedReply;
    if (!messageToSend.trim()) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/sendEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email.from,
          subject: `Re: ${email.subject}`,
          body: messageToSend,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      const data = await response.json();
      alert(`Email sent successfully to ${data.to}`);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">AI Reply Assistant</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs font-medium text-blue-900 mb-1">Original Email Summary:</p>
            <p className="text-sm text-blue-800">{email.summary || 'No summary available'}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Generating AI reply suggestions...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              ⚠️ {error}
            </div>
          ) : (
            <>
              {aiReplies.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">AI Suggested Replies:</h3>
                  <div className="space-y-2">
                    {aiReplies.map((reply, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setSelectedReply(reply);
                          setCustomReply(''); // Clear custom reply when selecting AI suggestion
                        }}
                        className={`cursor-pointer border rounded-lg p-4 text-sm transition-all ${
                          selectedReply === reply
                            ? 'bg-blue-50 border-blue-500 shadow-sm'
                            : 'hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            selectedReply === reply ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}>
                            {selectedReply === reply && (
                              <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <p className="flex-1 text-gray-700 leading-relaxed">{reply}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Or Write Your Own Reply:</h3>
                <textarea
                  className="w-full bg-white text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none overflow-y-auto hover:shadow-sm transition-all custom-scrollbar"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#d1d5db #f9fafb'
                  }}
                  rows="6"
                  placeholder="Type your custom reply here..."
                  value={customReply}
                  onChange={(e) => {
                    setCustomReply(e.target.value);
                    setSelectedReply(''); // Clear AI selection when typing custom reply
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || (!customReply && !selectedReply) || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              'Send Reply'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReplyDialog;

