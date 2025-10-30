import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoleDropdown from '../components/RoleDropdown.jsx';

const roles = [
  'Project Manager',
  'Project Engineer',
  'Superintendent',
  'Subcontractor',
  'Executive'
];

function RoleSelect() {
  const [selectedRole, setSelectedRole] = useState('');
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!selectedRole) return;
    localStorage.setItem('selectedRole', selectedRole);
    navigate('/projects');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 animate-fadeIn">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            Carma Construction AI
          </h1>
          <p className="text-gray-500 text-sm">Select Your Role</p>
        </div>

        {/* Dropdown */}
        <div className="mb-6 text-left">
          <label className="block text-sm font-medium text-blue-900 mb-2">Your Role</label>
          <RoleDropdown roles={roles} value={selectedRole} onChange={setSelectedRole} />
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedRole}
          className={`w-full py-2.5 px-4 rounded-lg font-semibold text-white transition-all duration-200
              ${selectedRole 
                ? 'bg-blue-600 hover:bg-blue-700 shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' 
                : 'bg-gray-400 cursor-not-allowed'}`}
        >
          Continue
        </button>
      </div>

      <style>{`
        select {
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
        }
        select option {
          background-color: #ffffff !important;
          color: #111827 !important;
          padding: 0.5rem;
        }
        select:focus option:checked {
          background-color: #f3f4f6 !important;
          color: #111827 !important;
        }
      `}</style>
    </div>
  );
}

export default RoleSelect;
