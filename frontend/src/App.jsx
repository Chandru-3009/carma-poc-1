import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoleSelect from './pages/RoleSelect';
import ProjectSelect from './pages/ProjectSelect';
import InboxSummary from './pages/InboxSummary';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/role" replace />} />
        <Route path="/role" element={<RoleSelect />} />
        <Route path="/projects" element={<ProjectSelect />} />
        <Route path="/inbox/:projectName" element={<InboxSummary />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;

