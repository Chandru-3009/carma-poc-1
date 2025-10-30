import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CategoryDropdown from '../components/CategoryDropdown.jsx';
import ReplyDialog from '../components/ReplyDialog.jsx';

// Simple SVG Icons
const SparklesIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const CheckCircleIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

function InboxSummary() {
  const { projectName } = useParams();
  const navigate = useNavigate();
  const project = decodeURIComponent(projectName || '');
  const selectedRole = localStorage.getItem('selectedRole') || 'User';

  const [allSummaries, setAllSummaries] = useState([]); // Store all summaries from AI
  const [emails, setEmails] = useState([]); // Filtered emails for display
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const previousProjectRef = useRef(null);

  const handleRefreshSummaries = async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    setAllSummaries([]);
    setEmails([]);

    try {
      const selectedRole = localStorage.getItem('selectedRole') || null;
      
      // Use GET endpoint to summarize ALL emails (no category filter)
      const params = new URLSearchParams({ 
        project,
        category: 'All' // Always summarize all emails
      });
      if (selectedRole) params.append('role', selectedRole);
      
      const response = await fetch(`http://localhost:5000/api/summarize?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh summaries');
      }

      const data = await response.json();
      // Store all summaries in state
      const summaries = data.summaries || [];
      setAllSummaries(summaries);
      setEmails(summaries); // Initialize displayed emails with all summaries
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'An error occurred while refreshing summaries');
    } finally {
      setLoading(false);
    }
  };

  // Auto-summarize once when project is selected or changes
  useEffect(() => {
    if (project && project !== previousProjectRef.current) {
      // Project changed - reset filter and auto-trigger summarization once
      previousProjectRef.current = project;
      setCategoryFilter('All'); // Reset category filter when switching projects
      handleRefreshSummaries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  // Filter locally when category changes (no backend call)
  useEffect(() => {
    if (allSummaries.length > 0) {
      if (categoryFilter === 'All') {
        setEmails(allSummaries);
      } else {
        // Filter locally by category
        const filtered = allSummaries.filter(
          (item) => item.category?.toLowerCase() === categoryFilter.toLowerCase()
        );
        setEmails(filtered);
      }
    }
  }, [categoryFilter, allSummaries]);

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-amber-100 text-amber-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryBadgeClass = (category) => {
    const key = (category || '').toLowerCase();
    if (key.includes('rfi')) return 'bg-indigo-100 text-indigo-700';
    if (key.includes('material')) return 'bg-yellow-100 text-yellow-700';
    if (key.includes('schedule')) return 'bg-blue-100 text-blue-700';
    if (key.includes('submittal')) return 'bg-green-100 text-green-700';
    if (key.includes('coordination')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  // Apply search filter locally (category filter is already applied via useEffect)
  const normalized = (s) => (s || '').toString().toLowerCase();
  const filteredEmails = emails.filter((e) => {
    if (!searchQuery) return true;
    const searchLower = normalized(searchQuery);
    return (
      normalized(e.from).includes(searchLower) ||
      normalized(e.subject).includes(searchLower) ||
      normalized(e.category).includes(searchLower) ||
      normalized(e.summary).includes(searchLower) ||
      normalized(e.action_required || '').includes(searchLower)
    );
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">{project || 'Inbox Summarization'}</h1>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition">
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>
          <p className="text-gray-600 mt-1">AI-powered construction email management • <span className="font-semibold">{selectedRole}</span></p>
        </div>

        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inbox"
                autoComplete="off"
                className="border border-gray-300 rounded-lg px-4 py-2 w-full text-gray-800 bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                style={{ backgroundColor: '#ffffff' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  aria-label="Clear search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            <CategoryDropdown value={categoryFilter} onChange={setCategoryFilter} />
          </div>

          <button
            onClick={handleRefreshSummaries}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-gray-200 text-blue-600 font-medium px-4 py-2 rounded-lg shadow-sm hover:shadow-md hover:bg-blue-50 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
            </svg>
            <span className="text-sm">{loading ? 'Refreshing...' : 'Refresh Summaries'}</span>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center text-gray-500 mt-6 animate-pulse">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
            AI is analyzing and categorizing emails… please wait.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">
            ⚠️ Error: {error}
          </div>
        )}

        {/* Results Table */}
        {filteredEmails.length > 0 && (
          <div className="transition-opacity duration-700 ease-in-out">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white shadow-sm rounded-xl overflow-hidden">
                <thead className="bg-gray-100 text-gray-700 text-sm font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">From</th>
                    <th className="px-4 py-3 text-left">Subject</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Summary</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Priority</th>
                    <th className="px-4 py-3 text-left">Due Date</th>
                    <th className="px-4 py-3 text-left">Reply</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {filteredEmails.map((email, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-all animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800">{email.from}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700 font-medium max-w-xs truncate" title={email.subject}>
                          {email.subject}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCategoryBadgeClass(email.category)}`}>
                          {email.category || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700 leading-relaxed max-w-md">
                          {email.summary || 'No summary available'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-600">
                          {email.action_required || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(email.priority)}`}>
                          {email.priority || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {email.due_date || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedEmail(email);
                            setReplyDialogOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                        >
                          Reply
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredEmails.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-gray-300 py-20 px-6 text-center shadow-sm">
            <div className="w-16 h-16 flex items-center justify-center bg-blue-50 rounded-full mb-4">
              <span className="text-blue-600 text-2xl">✨</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {allSummaries.length === 0 
                ? 'No summarized emails yet' 
                : 'No emails match your filters'}
            </h3>
            <p className="text-gray-500 mt-1">
              {allSummaries.length === 0 ? (
                <>
                  Summarization is in progress... or click <span className="font-medium text-blue-600">"Refresh Summaries"</span> to analyze emails for this project.
                </>
              ) : (
                <>Try adjusting your search or category filter to see more results.</>
              )}
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-gray-400 mt-10">© 2025 Carma – Construction AI Management Assistant</footer>

        {/* Reply Dialog */}
        <ReplyDialog
          email={selectedEmail}
          isOpen={replyDialogOpen}
          onClose={() => {
            setReplyDialogOpen(false);
            setSelectedEmail(null);
          }}
        />
      </div>
    </div>
  );
}

export default InboxSummary;

