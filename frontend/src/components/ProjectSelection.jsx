import { useEffect, useState } from 'react';
import { FaChevronRight } from 'react-icons/fa';

function ProjectSelection({ selectedProject, onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:5000/api/projects');
        const data = await res.json();
        setProjects(data || []);
      } catch (e) {
        console.error('Failed to load projects:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Project Selection</h3>
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-xs text-gray-500 mt-2">Loading projects...</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {projects.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No projects available</p>
          ) : (
            projects.map((project) => (
              <div
                key={project}
                onClick={() => onSelectProject?.(project)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedProject === project
                    ? 'bg-blue-50 border border-blue-200 shadow-sm'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    selectedProject === project ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {project}
                  </span>
                  {selectedProject === project && (
                    <FaChevronRight className="w-3 h-3 text-blue-600" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default ProjectSelection;

