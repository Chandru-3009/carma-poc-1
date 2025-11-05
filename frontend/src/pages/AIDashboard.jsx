import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import nonResponsiveData from "../data/nonResponsiveData.json";
import procurementLogsData from "../data/procurementLogsData.json";
import NonResponsiveTable from "../components/NonResponsiveTable";
import ModuleCard from "../components/ModuleCard";
import KPIStats from "../components/dashboard/KPIStats";
import RiskPieChart from "../components/dashboard/RiskPieChart";
import FollowUpBarChart from "../components/dashboard/FollowUpBarChart";

// ArrowLeft Icon Component
const ArrowLeft = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

export default function AIDashboard() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState("nonresponsive");
  const [selectedProject, setSelectedProject] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get user role and email from localStorage
  const userRole = localStorage.getItem('userRole') || 'project_manager';
  const userEmail = localStorage.getItem('userEmail') || '';

  // Filter data based on role - supervisors only see their assigned projects
  const filteredData = useMemo(() => {
    if (userRole === 'supervisor') {
      // Supervisors see only threads where they are the sender
      return nonResponsiveData.filter((item) => {
        const senders = item.participants?.senders || [];
        return senders.some(sender => 
          sender.toLowerCase().includes(userEmail.toLowerCase().split('@')[0])
        );
      });
    }
    // Project Managers see all data
    return nonResponsiveData;
  }, [userRole, userEmail]);

  // Calculate stats dynamically from filtered data
  const stats = useMemo(() => {
    const totalThreads = filteredData.length;
    const highRisk = filteredData.filter((item) => item.risk_level === "HIGH").length;
    const avgFollowUps = filteredData.reduce((sum, item) => sum + (item.counts?.follow_up_count || 0), 0) / totalThreads || 0;
    const responsiveness = filteredData.filter((item) => item.response_detected).length;
    
    return {
      totalThreads,
      highRisk,
      avgFollowUps: Math.round(avgFollowUps * 10) / 10,
      responsiveness: Math.round((responsiveness / totalThreads) * 100) || 0
    };
  }, [filteredData]);

  // Calculate risk distribution
  const riskData = useMemo(() => {
    const high = filteredData.filter((item) => item.risk_level === "HIGH").length;
    const medium = filteredData.filter((item) => item.risk_level === "MEDIUM").length;
    const low = filteredData.filter((item) => item.risk_level === "LOW").length;
    
    return [
      { level: "High", count: high },
      { level: "Medium", count: medium },
      { level: "Low", count: low }
    ];
  }, [filteredData]);

  // Calculate follow-up data by project
  const followUpData = useMemo(() => {
    const projectMap = {};
    filteredData.forEach((item) => {
      const project = item.project_guess || "Unknown";
      if (!projectMap[project]) {
        projectMap[project] = 0;
      }
      projectMap[project] += item.counts?.follow_up_count || 0;
    });
    
    return Object.entries(projectMap).map(([project, follow_ups]) => ({
      project,
      follow_ups
    }));
  }, [filteredData]);

  // Get unique projects from procurement logs
  const uniqueProjects = useMemo(() => {
    const projects = [...new Set(procurementLogsData.map(item => item.project_name))];
    return projects.sort();
  }, []);

  // Set default selected project on mount
  useEffect(() => {
    if (uniqueProjects.length > 0 && !selectedProject) {
      setSelectedProject(uniqueProjects[0]);
    }
  }, [uniqueProjects, selectedProject]);

  // Filter procurement logs by selected project
  const filteredProcurementLogs = useMemo(() => {
    if (!selectedProject) return [];
    return procurementLogsData.filter(item => item.project_name === selectedProject);
  }, [selectedProject]);

  // Calculate procurement summary stats
  const procurementStats = useMemo(() => {
    const logs = filteredProcurementLogs;
    const totalAttachments = logs.length;
    const totalMissingFields = logs.reduce((sum, log) => sum + (log.missing_fields?.length || 0), 0);
    const avgConfidence = logs.length > 0
      ? logs.reduce((sum, log) => sum + (log.ai_analysis?.confidence_score || 0), 0) / logs.length
      : 0;
    
    return {
      totalAttachments,
      totalMissingFields,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    };
  }, [filteredProcurementLogs]);

  const handleProjectChange = (newProject) => {
    setIsTransitioning(true);
    setIsDropdownOpen(false); // Close dropdown after selection
    setTimeout(() => {
      setSelectedProject(newProject);
      setIsTransitioning(false);
    }, 200);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.custom-dropdown-container')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const handleModuleClick = (module) => {
    if (activeModule === module) {
      setActiveModule(""); // Toggle off if already active
    } else {
      setActiveModule(module);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0E0F11] to-[#1A1D22] text-[#EDEDED] px-8 py-6">
      <header className="p-6 border-b border-[#C9A94A]/20 bg-[#1E2126]/50 backdrop-blur-sm">
        <h1 className="text-2xl font-semibold text-[#C9A94A]">AI Project Insights Dashboard</h1>
        <p className="text-sm text-[#B0B0B0] mt-1">AI Assistant for Construction Performance Monitoring</p>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Back to Projects Button — below header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/projects")}
            className="flex items-center gap-2 text-[#C9A94A] hover:text-[#E0C870] font-medium transition-colors text-sm group"
          >
            <ArrowLeft className="w-4 h-4 transition" />
            <span className="group-hover:underline">Back to Projects</span>
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <ModuleCard 
            title="Non-Responsive Subcontractors"
            description="Track vendor communication delays & risk alerts."
            isActive={activeModule === 'nonresponsive'}
            onClick={() => handleModuleClick('nonresponsive')} 
          />
          {userRole === 'project_manager' && (
            <ModuleCard 
              title="Procurement Log Tracking"
              description="Monitor material status & vendor feedback."
              isActive={activeModule === 'procurement'}
              onClick={() => handleModuleClick('procurement')} 
            />
          )}
          <ModuleCard 
            title="Weekly Reports"
            description="AI-generated progress summaries."
            isActive={activeModule === 'weekly'}
            onClick={() => handleModuleClick('weekly')} 
          />
          
        </div>

        {activeModule === "nonresponsive" && (
          <div className="space-y-6 animate-fadeIn">
            {/* KPI Summary - Only show for Project Managers */}
            {userRole === 'project_manager' && <KPIStats stats={stats} />}

            {/* Charts - Only show for Project Managers */}
            {userRole === 'project_manager' && (
              <div className="grid md:grid-cols-2 gap-6">
                <RiskPieChart data={riskData} />
                <FollowUpBarChart data={followUpData} />
              </div>
            )}

            {/* Detailed Table - Show for both roles */}
            <NonResponsiveTable data={filteredData} userRole={userRole} />
          </div>
        )}

        {activeModule === "procurement" && userRole === 'project_manager' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header Section */}
            <div className="bg-[#1E2126]/90 border border-[#C9A94A]/20 rounded-2xl shadow-[0_0_15px_rgba(201,169,74,0.15)] p-8">
              {/* Title and Controls */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-[#C9A94A]">Procurement Log Tracking</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-3 custom-dropdown-container relative">
                    <label className="text-sm text-[#B0B0B0] whitespace-nowrap">Select Project:</label>
                    
                    {/* Custom Dropdown */}
                    <div className="relative min-w-[200px]">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setIsDropdownOpen(!isDropdownOpen);
                          }
                          if (e.key === 'Escape') {
                            setIsDropdownOpen(false);
                          }
                        }}
                        className="w-full bg-gradient-to-b from-[#0F0F0F] to-[#1A1A1A] border-[1.5px] border-[#D4AF37] text-[#EAEAEA] rounded-[10px] px-4 py-2.5 text-sm font-medium flex items-center justify-between gap-3 hover:border-[#E0C870] hover:shadow-[0_0_10px_rgba(212,175,55,0.5)] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:shadow-[0_0_15px_rgba(212,175,55,0.6)] transition-all duration-200"
                        aria-haspopup="listbox"
                        aria-expanded={isDropdownOpen}
                      >
                        <span className="truncate">{selectedProject || "Select..."}</span>
                        <svg
                          className={`w-4 h-4 text-[#D4AF37] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-[#1A1A1A] border-[1.5px] border-[#D4AF37]/60 rounded-[10px] shadow-[0_0_20px_rgba(212,175,55,0.3)] overflow-hidden animate-fadeIn backdrop-blur-sm">
                          <div className="py-1 max-h-[300px] overflow-y-auto">
                            {uniqueProjects.map((project) => (
                              <button
                                key={project}
                                type="button"
                                onClick={() => handleProjectChange(project)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleProjectChange(project);
                                  }
                                }}
                                className={`w-full text-left px-4 py-3 text-sm transition-all duration-200 ease-in-out ${
                                  selectedProject === project
                                    ? 'bg-[#2A1F00]/50 text-[#F5F5F5] font-medium border-l-2 border-[#D4AF37]'
                                    : 'text-[#B8B8B8] hover:bg-[#2A1F00]/30 hover:text-[#F5F5F5]'
                                }`}
                                role="option"
                                aria-selected={selectedProject === project}
                              >
                                <div className="flex items-center gap-2">
                                  {selectedProject === project && (
                                    <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-pulse"></span>
                                  )}
                                  <span>{project}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      // Simulate re-analysis
                      const event = new Event('reanalyze');
                      window.dispatchEvent(event);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#C9A94A] to-[#E0C870] text-[#1A1D22] font-semibold rounded-xl hover:shadow-[0_0_15px_rgba(201,169,74,0.4)] transition-all text-sm hover:scale-105"
                  >
                    Re-Analyze Logs
                  </button>
                </div>
              </div>

              {/* Overview Stats - Glass-like Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#C9A94A]/20">
                <div className="bg-gradient-to-br from-[#0D0F12]/80 to-[#1A1D22]/80 backdrop-blur-sm border border-[#C9A94A]/30 rounded-2xl p-6 text-center hover:border-[#C9A94A]/60 hover:shadow-[0_0_20px_rgba(201,169,74,0.2)] transition-all duration-300 group">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">📄</span>
                    <p className="text-sm text-[#B0B0B0]">Attachments Analyzed</p>
                  </div>
                  <p className="text-3xl font-bold text-[#C9A94A] mt-2 group-hover:scale-110 transition-transform duration-300">
                    {procurementStats.totalAttachments}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-[#0D0F12]/80 to-[#1A1D22]/80 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6 text-center hover:border-red-500/60 hover:shadow-[0_0_20px_rgba(229,57,70,0.2)] transition-all duration-300 group">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">⚠️</span>
                    <p className="text-sm text-[#B0B0B0]">Missing Fields</p>
                  </div>
                  <p className="text-3xl font-bold text-[#E63946] mt-2 group-hover:scale-110 transition-transform duration-300">
                    {procurementStats.totalMissingFields}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-[#0D0F12]/80 to-[#1A1D22]/80 backdrop-blur-sm border border-[#C9A94A]/30 rounded-2xl p-6 text-center hover:border-[#C9A94A]/60 hover:shadow-[0_0_20px_rgba(201,169,74,0.2)] transition-all duration-300 group">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">🤖</span>
                    <p className="text-sm text-[#B0B0B0]">Confidence Score</p>
                  </div>
                  <p className="text-3xl font-bold text-[#C9A94A] mt-2 group-hover:scale-110 transition-transform duration-300">
                    {Math.round(procurementStats.avgConfidence * 100)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Procurement Cards */}
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-opacity duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
              {filteredProcurementLogs.length > 0 ? (
                filteredProcurementLogs.map((log, idx) => {
                  const hasMissingFields = log.missing_fields && log.missing_fields.length > 0;
                  const confidencePercent = Math.round((log.ai_analysis?.confidence_score || 0) * 100);
                  return (
                    <div
                      key={idx}
                      className="bg-[#1E2126]/90 border border-[#C9A94A]/20 rounded-2xl shadow-[0_0_15px_rgba(201,169,74,0.15)] p-8 hover:border-[#C9A94A]/50 hover:shadow-[0_0_25px_rgba(201,169,74,0.25)] transition-all duration-300 animate-fadeIn hover:-translate-y-1"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-6 pb-4 border-b border-[#C9A94A]/20">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-[#EDEDED] mb-2">{log.vendor}</h3>
                          <p className="text-sm text-[#B0B0B0]">{log.attachment_summary}</p>
                        </div>
                        {hasMissingFields ? (
                          <span className="px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/50 rounded-xl text-xs font-semibold whitespace-nowrap ml-4">
                            ⚠️ Missing Data
                          </span>
                        ) : (
                          <span className="px-4 py-2 bg-green-500/20 text-green-300 border border-green-500/50 rounded-xl text-xs font-semibold whitespace-nowrap ml-4">
                            ✅ All Data Complete
                          </span>
                        )}
                      </div>

                      {/* Split Layout: Fields on Left, AI Insights on Right */}
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Left Side - Fields */}
                        <div className="space-y-5">
                          {/* Missing Fields */}
                          {hasMissingFields && (
                            <div>
                              <p className="text-sm font-semibold text-[#B0B0B0] mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                Missing Fields
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {log.missing_fields.map((field, fieldIdx) => (
                                  <span
                                    key={fieldIdx}
                                    className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/40 rounded-lg text-xs font-medium"
                                  >
                                    {field}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Found Fields */}
                          {log.found_fields && log.found_fields.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-[#B0B0B0] mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Found Fields
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {log.found_fields.map((field, fieldIdx) => (
                                  <span
                                    key={fieldIdx}
                                    className="px-3 py-1.5 bg-green-500/20 text-green-300 border border-green-500/40 rounded-lg text-xs font-medium"
                                  >
                                    {field}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Side - AI Insights */}
                        {log.ai_analysis && (
                          <div className="space-y-5">
                            <div className="bg-[#0D0F12]/50 rounded-xl p-4 border border-[#C9A94A]/20">
                              <p className="text-sm font-semibold text-[#B0B0B0] mb-2">AI Impact</p>
                              <p className="text-sm text-[#EDEDED] leading-relaxed">{log.ai_analysis.impact}</p>
                            </div>
                            <div className="bg-[#0D0F12]/50 rounded-xl p-4 border border-[#C9A94A]/20">
                              <p className="text-sm font-semibold text-[#B0B0B0] mb-2">Recommendation</p>
                              <p className="text-sm text-[#EDEDED] leading-relaxed">{log.ai_analysis.recommendation}</p>
                            </div>
                            <div className="bg-gradient-to-r from-[#0D0F12]/80 to-[#1A1D22]/80 rounded-xl p-4 border border-[#C9A94A]/30">
                              <p className="text-sm font-semibold text-[#B0B0B0] mb-3">Confidence</p>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-[#0D0F12]/50 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#C9A94A] to-[#E0C870] rounded-full transition-all duration-500"
                                    style={{ width: `${confidencePercent}%` }}
                                  ></div>
                                </div>
                                <p className="text-lg font-bold text-[#C9A94A] min-w-[60px] text-right">
                                  {confidencePercent}%
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="mt-6 pt-4 border-t border-[#C9A94A]/10">
                        <div className="flex items-center justify-end">
                          <p className="text-xs text-[#B0B0B0]">
                            Last Updated: <span className="text-[#EDEDED] font-medium">{formatDate(log.last_updated)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-16 text-[#B0B0B0]">
                  <p className="text-lg">No procurement logs available for the selected project.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
