import { FaEnvelope, FaClock } from 'react-icons/fa';

function EmailFollowupsCard({ data = [] }) {
  const totalFollowups = data.reduce((sum, item) => sum + (item.counts?.follow_up_count || 0), 0);
  const totalUnanswered = data.reduce((sum, item) => sum + (item.counts?.unanswered_emails || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Email Followups</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <FaEnvelope className="w-4 h-4" />
            <span className="text-sm">Total Follow-ups</span>
          </div>
          <span className="text-lg font-bold text-gray-900">{totalFollowups}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <FaClock className="w-4 h-4" />
            <span className="text-sm">Unanswered</span>
          </div>
          <span className={`text-lg font-bold ${totalUnanswered > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {totalUnanswered}
          </span>
        </div>
        {totalUnanswered > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {totalUnanswered} email{totalUnanswered > 1 ? 's' : ''} require{totalUnanswered === 1 ? 's' : ''} immediate attention
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailFollowupsCard;

