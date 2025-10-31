import { useEffect, useState } from 'react';
import { FaBell, FaUserCircle } from 'react-icons/fa';

function TopBar({ selectedProject, onChangeProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:5000/api/projects');
        const data = await res.json();
        setProjects(data || []);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Project</label>
        <select
          value={selectedProject || ''}
          onChange={(e) => onChangeProject?.(e.target.value)}
          className="border-gray-300 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="" disabled>{loading ? 'Loading…' : 'Select a project'}</option>
          {projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative text-gray-600 hover:text-gray-900">
          <FaBell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">3</span>
        </button>
        <div className="flex items-center gap-2">
          <FaUserCircle className="w-7 h-7 text-gray-500" />
          <span className="hidden sm:block text-sm text-gray-700">Sarah Chen</span>
        </div>
      </div>
    </div>
  );
}

export default TopBar;


