import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import TopBar from '../components/TopBar.jsx';
import ProjectStatusPie from '../components/ProjectStatusPie.jsx';
import EmailFollowupsCard from '../components/EmailFollowupsCard.jsx';
import ClientDelayTimeCard from '../components/ClientDelayTimeCard.jsx';

function Dashboard() {
  const [project, setProject] = useState('');
  const [nonResponsiveData, setNonResponsiveData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const url = project
          ? `http://localhost:5000/api/non-responsive-subcontractors?project=${encodeURIComponent(project)}`
          : 'http://localhost:5000/api/non-responsive-subcontractors';
        const res = await fetch(url);
        const data = await res.json();
        setNonResponsiveData(data || []);
      } catch (e) {
        console.error('Failed to load non-responsive data:', e);
        setNonResponsiveData([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [project]);

  // Calculate project status from non-responsive data
  const projectStatus = {
    onTrack: project && nonResponsiveData.length === 0 ? 1 : 0,
    atRisk: nonResponsiveData.filter(item => item.risk_level === 'MEDIUM').length,
    delayed: nonResponsiveData.filter(item => item.risk_level === 'HIGH').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <TopBar selectedProject={project} onChangeProject={setProject} />

          <div className="px-4 md:px-6 py-6">
            {/* Dashboard Title */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Project health and procurement risk overview</p>
            </div>

            {/* Main Content: Summary Capsule matching wireframe */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-5">Selected Project Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <ProjectStatusPie data={projectStatus} />
                </div>
                <div className="md:col-span-1">
                  <EmailFollowupsCard data={nonResponsiveData} />
                </div>
                <div className="md:col-span-1">
                  <ClientDelayTimeCard data={nonResponsiveData} />
                </div>
              </div>

              {loading && (
                <div className="mt-4 text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading data...</p>
                </div>
              )}

              {!loading && nonResponsiveData.length === 0 && (
                <div className="mt-4 p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                  <p className="text-sm text-gray-500">No non-responsive subcontractors found.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;


