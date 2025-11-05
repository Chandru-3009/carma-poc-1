import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usersData from '../data/users.json';

function RoleSelect() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignIn = () => {
    const foundUser = usersData.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );

    if (foundUser) {
      // Normalize role names: "Project Manager" -> "project_manager", "Supervisor" -> "supervisor"
      const normalizedRole = foundUser.role.toLowerCase().replace(/\s+/g, '_');
      const roleKey = normalizedRole === 'project_manager' ? 'project_manager' : 'supervisor';
      
      localStorage.setItem('userRole', roleKey);
      localStorage.setItem('selectedRole', foundUser.role); // Keep for backward compatibility
      localStorage.setItem('userEmail', email.toLowerCase()); // Store email for filtering
      navigate('/aidashboard');
    } else {
      setError('Invalid email. Please use your CARMA account.');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-[#0A0B0D] via-[#14161A] to-[#0D0F12] text-white overflow-hidden px-6">
      {/* Dark top overlay gradient */}
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-black/70 via-[#0D0F12]/50 to-transparent pointer-events-none z-10"></div>

      {/* Top-left Logo */}
      <div className="absolute top-6 left-6 md:left-10 z-20 flex items-center space-x-2">
        <img
          src="https://carmalv.com/wp-content/themes/carma_tw/theme/images/carma_logo_horizontal.jpg"
          alt="CARMA Logo"
          className="w-36 md:w-44 object-contain drop-shadow-[0_0_15px_rgba(201,169,74,0.25)]"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>

      {/* Sign-In Card */}
      <div className="z-10 w-full max-w-md bg-[#1A1D22]/80 backdrop-blur-md border border-[#C9A94A]/40 rounded-2xl shadow-[0_0_25px_rgba(201,169,74,0.15)] p-8 animate-fadeIn">
        <h2 className="text-2xl font-semibold text-[#C9A94A] text-center mb-2">
          Welcome to CARMA AI Dashboard
        </h2>
        <p className="text-gray-400 text-center mb-6">
          Enter your work email to continue
        </p>

        {/* Input Field */}
        <div className="mb-4">
          <input
            type="email"
            placeholder="you@carma.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && email) {
                handleSignIn();
              }
            }}
            className="w-full border border-[#C9A94A]/40 bg-transparent text-gray-200 placeholder-gray-500 rounded-xl p-3 focus:ring-2 focus:ring-[#C9A94A] focus:border-[#C9A94A] focus:outline-none transition"
          />
          {error && (
            <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
          )}
        </div>

        {/* Sign In Button */}
        <button
          onClick={handleSignIn}
          disabled={!email}
          className={`w-full mt-6 py-3 rounded-xl font-medium transition-all duration-300 ${
            email
              ? 'bg-gradient-to-r from-[#C9A94A] to-[#E0C870] text-[#0D0F12] hover:from-[#E0C870] hover:to-[#C9A94A] shadow-[0_0_10px_rgba(201,169,74,0.4)]'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          Sign In
        </button>
      </div>

      {/* Footer */}
      <p className="mt-8 text-gray-500 text-sm tracking-wide text-center z-10">
        © {new Date().getFullYear()} CARMA Construction | AI Dashboard
      </p>
    </div>
  );
}

export default RoleSelect;
