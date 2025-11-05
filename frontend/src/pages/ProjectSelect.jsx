import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ArrowLeft Icon Component
const ArrowLeft = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

// ChevronRight Icon Component
const ChevronRight = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 18l6-6-6-6"/>
  </svg>
);

function ProjectSelect() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const selectedRole = localStorage.getItem('userRole') || localStorage.getItem('selectedRole') || 'User';

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (project) => {
    navigate(`/inbox/${encodeURIComponent(project)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Back Button */}
        <button
          onClick={() => navigate('/role')}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-all duration-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Back</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Select a Project
            </h1>
            <button
              onClick={() => navigate('/aidashboard')}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition font-medium text-sm"
            >
              Go to AI Dashboard →
            </button>
          </div>
          <p className="text-gray-600 mt-1 mb-8">
            Welcome, <span className="font-medium text-blue-600">{selectedRole}</span>
          </p>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading projects...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {projects.map((project, index) => (
              <div
                key={project}
                onClick={() => handleProjectClick(project)}
                className="flex flex-col justify-between p-6 bg-white rounded-xl shadow-md hover:shadow-lg
                           hover:-translate-y-1 transition-all duration-200 cursor-pointer border border-gray-100
                           hover:border-blue-300 animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{project}</h3>
                  <p className="text-sm text-gray-500 mt-1">Click to view AI-Powered summary</p>
                </div>
                <div className="flex justify-end mt-4">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectSelect;
