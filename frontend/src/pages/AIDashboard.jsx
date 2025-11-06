import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import nonResponsiveData from "../data/nonResponsiveData.json";
import procurementLogsData from "../data/procurementLogsData.json";
// Static import kept as fallback for project list initialization
import procurementLogsDetailedData from "../data/procurementLogsDetailedData.json";
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

// LogOut Icon Component
const LogOut = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function AIDashboard() {
  const navigate = useNavigate();
  // Get user role and email from localStorage
  const userRole = localStorage.getItem('userRole') || 'project_manager';
  const userEmail = localStorage.getItem('userEmail') || '';
  
  // Static project list for Procurement Log Tracking
  const projectList = ["Penthouse A", "Project Cascade", "Skyline Tower"];
  
  // Set default active module based on user role
  // Project managers see Procurement Log Tracking by default, supervisors see Non-Responsive Subcontractors
  const [activeModule, setActiveModule] = useState(
    userRole === 'project_manager' ? 'procurement' : 'nonresponsive'
  );
  const [selectedProject, setSelectedProject] = useState(projectList[0]); // Default to "Penthouse A"
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Procurement API state
  const [procurementData, setProcurementData] = useState([]);
  const [procurementLoading, setProcurementLoading] = useState(false);
  const [procurementError, setProcurementError] = useState(null);

  // Ensure activeModule is set correctly on mount
  useEffect(() => {
    // Set default module based on role on initial mount
    if (userRole === 'project_manager') {
      setActiveModule('procurement');
    } else {
      setActiveModule('nonresponsive');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount - userRole is read from localStorage and doesn't change during component lifecycle

  // Normalize status from API response to match dashboard logic
  const normalizeStatus = (status) => {
    if (!status) return "Pending";
    const statusLower = status.toLowerCase();
    if (statusLower.includes("confirmed") || statusLower.includes("delivered") || statusLower.includes("complete")) {
      return "Confirmed";
    }
    if (statusLower.includes("delayed") || statusLower.includes("overdue")) {
      return "Delayed";
    }
    if (statusLower.includes("pending") || statusLower.includes("awaiting")) {
      return "Pending";
    }
    return "Pending"; // Default to Pending for unknown statuses
  };

  // Generate unique key for a procurement record
  const getRecordKey = (record) => {
    const project = (record.project_name || '').trim().toLowerCase();
    const material = (record.material_equipment || '').trim().toLowerCase();
    const vendor = (record.vendor_name || '').trim().toLowerCase();
    return `${project}||${material}||${vendor}`;
  };

  // Deduplicate procurement data by replacing existing records with same key
  // First deduplicates within the new data itself, then merges with existing data
  const deduplicateProcurementData = (newData, existingData, currentProject) => {
    // Step 1: Deduplicate within new data itself (in case API returns duplicates)
    const newDataMap = new Map();
    newData.forEach(record => {
      const key = getRecordKey(record);
      // Keep the latest record if duplicates exist (based on array order)
      newDataMap.set(key, record);
    });
    const deduplicatedNewData = Array.from(newDataMap.values());

    // Step 2: If no existing data, return deduplicated new data
    if (!existingData || existingData.length === 0) {
      return deduplicatedNewData;
    }

    // Step 3: Create a map of existing records, excluding records from current project
    const existingMap = new Map();
    existingData.forEach(record => {
      const key = getRecordKey(record);
      const recordProject = (record.project_name || '').trim().toLowerCase();
      const currentProjectLower = (currentProject || '').trim().toLowerCase();
      
      // Keep records from other projects, but remove records from current project
      // (they will be replaced with new data)
      if (recordProject !== currentProjectLower) {
        existingMap.set(key, record);
      }
    });

    // Step 4: Merge new data with existing data (new data replaces existing for current project)
    deduplicatedNewData.forEach(newRecord => {
      const key = getRecordKey(newRecord);
      existingMap.set(key, newRecord); // Replace or add new record
    });

    // Step 5: Convert map back to array
    return Array.from(existingMap.values());
  };

  // Fetch procurement data from API
  const fetchProcurementData = async (projectName) => {
    if (!projectName) {
      setProcurementData([]);
      return;
    }

    setProcurementLoading(true);
    setProcurementError(null);

    try {
      const response = await fetch('/api/procurement/emails/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: [projectName] }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
        throw new Error(errorData.detail || `Failed to fetch procurement data: ${response.status}`);
      }

      const data = await response.json();
      
      // Normalize status fields in the response
      const normalizedData = Array.isArray(data) ? data.map(item => ({
        ...item,
        status: normalizeStatus(item.status)
      })) : [];
      
      // Deduplicate: replace existing records with same project_name + material_equipment + vendor_name
      // Remove old records for current project and replace with new ones
      setProcurementData(prevData => {
        return deduplicateProcurementData(normalizedData, prevData, projectName);
      });
    } catch (error) {
      console.error('Error fetching procurement data:', error);
      setProcurementError(error.message || 'Failed to fetch procurement data');
      setProcurementData([]);
    } finally {
      setProcurementLoading(false);
    }
  };

  // Fetch procurement data when project changes or module is activated
  useEffect(() => {
    if (selectedProject && activeModule === 'procurement') {
      fetchProcurementData(selectedProject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, activeModule]);

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

  // Use static project list
  const uniqueProjects = projectList;

  // Filter and sort detailed procurement logs by selected project (always sorted by risk)
  const filteredProcurementLogs = useMemo(() => {
    if (!selectedProject) return [];
    
    // Use API data if available, otherwise fallback to static data
    const dataSource = procurementData.length > 0 ? procurementData : procurementLogsDetailedData;
    let filtered = dataSource.filter(item => item.project_name === selectedProject);
    
    // Deduplicate within filtered data (in case there are still duplicates)
    const deduplicatedMap = new Map();
    filtered.forEach(record => {
      const key = getRecordKey(record);
      // Keep the latest record if duplicates exist
      deduplicatedMap.set(key, record);
    });
    filtered = Array.from(deduplicatedMap.values());
    
    // Always sort by risk priority
    filtered = [...filtered].sort((a, b) => {
      // Status priority: Delayed (1) > Pending (2) > Confirmed (3)
      const statusPriority = {
        "Delayed": 1,
        "Pending": 2,
        "Confirmed": 3
      };
      
      const priorityA = statusPriority[a.status] || 99;
      const priorityB = statusPriority[b.status] || 99;
      
      // If same priority, further sort by delivery_date (Pending dates first)
      if (priorityA === priorityB) {
        if (a.delivery_date === "Pending" && b.delivery_date !== "Pending") return -1;
        if (a.delivery_date !== "Pending" && b.delivery_date === "Pending") return 1;
        return 0;
      }
      
      return priorityA - priorityB;
    });
    
    return filtered;
  }, [selectedProject, procurementData]);

  // Calculate procurement summary stats from detailed data
  const procurementStats = useMemo(() => {
    const logs = filteredProcurementLogs;
    
    // Total Items Tracked: Count of all procurement records for the selected project
    const totalItems = logs.length;
    
    // Pending Confirmations: Count items where status is "Pending" OR delivery_date is "Pending"/empty/null
    const pendingConfirmations = logs.filter(log => {
      const statusPending = log.status?.toLowerCase() === 'pending';
      const deliveryDatePending = !log.delivery_date || 
                                  log.delivery_date === 'Pending' || 
                                  (typeof log.delivery_date === 'string' && log.delivery_date.trim() === '');
      return statusPending || deliveryDatePending;
    }).length;
    
    // On-Time Deliveries: Count items where status is "Confirmed" AND delivery_date has a valid date (not "Pending")
    const confirmedItems = logs.filter(log => {
      const statusConfirmed = log.status?.toLowerCase() === 'confirmed';
      const hasValidDeliveryDate = log.delivery_date && 
                                  typeof log.delivery_date === 'string' &&
                                  log.delivery_date !== 'Pending' && 
                                  log.delivery_date.trim() !== '';
      return statusConfirmed && hasValidDeliveryDate;
    }).length;
    
    const delayedItems = logs.filter(log => log.status === "Delayed").length;
    
    // Calculate risk level based on percentage of pending items
    const pendingPercentage = totalItems > 0 ? (pendingConfirmations / totalItems) * 100 : 0;
    let procurementRiskLevel = "";
    let procurementRiskLabel = "";
    let riskColor = "";
    let riskGlow = "";
    
    if (delayedItems > 0 || pendingPercentage > 50) {
      procurementRiskLevel = "high";
      procurementRiskLabel = "High Risk";
      riskColor = "red";
      riskGlow = "shadow-[0_0_25px_rgba(239,68,68,0.4)]";
    } else if (pendingPercentage >= 20 && pendingPercentage <= 50) {
      procurementRiskLevel = "moderate";
      procurementRiskLabel = "Moderate Risk";
      riskColor = "yellow";
      riskGlow = "shadow-[0_0_25px_rgba(234,179,8,0.4)]";
    } else {
      procurementRiskLevel = "low";
      procurementRiskLabel = "Low Risk";
      riskColor = "green";
      riskGlow = "shadow-[0_0_25px_rgba(34,197,94,0.4)]";
    }
    
    // Generate AI tip for risk card tooltip
    let riskTip = "";
    if (delayedItems > 0) {
      const delayedVendor = logs.find(log => log.status === "Delayed")?.vendor_name || "vendor";
      riskTip = `AI Tip: Contact ${delayedVendor} — delay risk flagged.`;
    } else if (pendingConfirmations > 0) {
      // Find first pending item (by status or delivery_date)
      const pendingLog = logs.find(log => 
        log.status?.toLowerCase() === 'pending' || 
        !log.delivery_date || 
        log.delivery_date === 'Pending'
      );
      const pendingVendor = pendingLog?.vendor_name || "vendor";
      riskTip = `AI Tip: Contact ${pendingVendor} — confirmation needed.`;
    } else {
      riskTip = "AI Tip: All procurement items on track.";
    }
    
    // Group by vendor for AI insights
    const vendorMap = {};
    logs.forEach(log => {
      if (!vendorMap[log.vendor_name]) {
        vendorMap[log.vendor_name] = [];
      }
      vendorMap[log.vendor_name].push(log);
    });
    
    return {
      totalItems,
      pendingConfirmations,
      confirmedItems,
      delayedItems,
      procurementRiskLevel,
      procurementRiskLabel,
      riskColor,
      riskGlow,
      riskTip,
      vendorMap
    };
  }, [filteredProcurementLogs]);

  // Generate AI tip based on data
  const aiTip = useMemo(() => {
    const { pendingConfirmations, delayedItems, vendorMap } = procurementStats;
    const pendingVendors = Object.keys(vendorMap).filter(vendor => 
      vendorMap[vendor].some(log => 
        log.status?.toLowerCase() === 'pending' || 
        !log.delivery_date || 
        log.delivery_date === 'Pending'
      )
    );
    
    if (delayedItems > 0) {
      return `⚠️ ${delayedItems} item(s) delayed — escalate immediately to avoid project timeline impact.`;
    } else if (pendingConfirmations > 0) {
      return `ℹ️ ${pendingConfirmations} item(s) pending confirmation — prioritize ${pendingVendors[0] || 'vendor'} follow-up today.`;
    } else {
      return "✅ All procurement items confirmed — continue regular tracking.";
    }
  }, [procurementStats]);

  const handleProjectChange = (newProject) => {
    setIsTransitioning(true);
    setIsDropdownOpen(false); // Close dropdown after selection
    setSelectedProject(newProject);
    // fetchProcurementData will be called automatically via useEffect when selectedProject changes
    setTimeout(() => {
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
    if (!dateString || dateString === "Pending") return dateString || "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap";
    switch (status) {
      case "Confirmed":
        return `${baseClasses} bg-green-700 text-white`;
      case "Pending":
        return `${baseClasses} bg-yellow-600 text-black`;
      case "Delayed":
        return `${baseClasses} bg-red-700 text-white`;
      default:
        return `${baseClasses} bg-gray-500/20 text-gray-300 border border-gray-500/50`;
    }
  };

  const getImpactColor = (impact) => {
    if (impact.toLowerCase().includes("no risk") || impact.toLowerCase().includes("no major risk")) {
      return "text-green-400";
    } else if (impact.toLowerCase().includes("high risk") || impact.toLowerCase().includes("delay")) {
      return "text-red-400";
    } else {
      return "text-yellow-400";
    }
  };

  const handleLogout = () => {
    // Clear user session data
    localStorage.removeItem("userRole");
    localStorage.removeItem("selectedRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("authToken");
    
    // Redirect to login page
    navigate("/role");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0E0F11] to-[#1A1D22] text-[#EDEDED] px-8 py-6">
      <header className="p-6 border-b border-[#C9A94A]/20 bg-[#1E2126]/50 backdrop-blur-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#C9A94A]">AI Project Insights Dashboard</h1>
            <p className="text-sm text-[#B0B0B0] mt-1">AI Assistant for Construction Performance Monitoring</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-gradient-to-r from-[#FFD54F] to-[#FFB300] text-[#121212] font-semibold rounded-xl hover:from-[#FFB300] hover:to-[#FFD54F] hover:shadow-[0_0_15px_rgba(255,213,79,0.4)] transition-all duration-300 flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="grid md:grid-cols-3 gap-6">
        {userRole === 'project_manager' && (
            <ModuleCard 
              title="Procurement Log Tracking"
              description="Monitor material status & vendor feedback."
              isActive={activeModule === 'procurement'}
              onClick={() => handleModuleClick('procurement')} 
            />
          )}
          <ModuleCard 
            title="Non-Responsive Subcontractors"
            description="Track vendor communication delays & risk alerts."
            isActive={activeModule === 'nonresponsive'}
            onClick={() => handleModuleClick('nonresponsive')} 
          />
          {/* <ModuleCard 
            title="Weekly Reports"
            description="AI-generated progress summaries."
            isActive={activeModule === 'weekly'}
            onClick={() => handleModuleClick('weekly')} 
          /> */}
          
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
                      // Refetch procurement data from API
                      if (selectedProject) {
                        fetchProcurementData(selectedProject);
                      }
                    }}
                    disabled={procurementLoading || !selectedProject}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#C9A94A] to-[#E0C870] text-[#1A1D22] font-semibold rounded-xl hover:shadow-[0_0_15px_rgba(201,169,74,0.4)] transition-all text-sm hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                  >
                    {procurementLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <span>Re-Analyze Logs</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Overview Stats - Three Clean Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#C9A94A]/20">
                {/* Total Items Tracked */}
                <div className="bg-gradient-to-br from-[#0D0F12]/80 to-[#1A1D22]/80 backdrop-blur-sm border border-[#C9A94A]/30 rounded-2xl p-6 text-center hover:border-[#C9A94A]/60 hover:shadow-[0_0_20px_rgba(201,169,74,0.2)] transition-all duration-300 group">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-2xl">🧱</span>
                    <p className="text-sm text-[#FFD54F] font-semibold">Total Items Tracked</p>
                  </div>
                  <p className="text-3xl font-bold text-yellow-400 mb-2 group-hover:scale-110 transition-transform duration-300">
                    {procurementStats.totalItems}
                  </p>
                  <p className="text-xs text-[#AAAAAA]">Materials analyzed</p>
                </div>

                {/* Pending Confirmations */}
                <div className="bg-gradient-to-br from-[#0D0F12]/80 to-[#1A1D22]/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6 text-center hover:border-yellow-500/60 hover:shadow-[0_0_20px_rgba(234,179,8,0.2)] transition-all duration-300 group">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-2xl">⏳</span>
                    <p className="text-sm text-[#FFD54F] font-semibold">Pending Confirmations</p>
                  </div>
                  <p className="text-3xl font-bold text-yellow-400 mb-2 group-hover:scale-110 transition-transform duration-300">
                    {procurementStats.pendingConfirmations}
                  </p>
                  <p className="text-xs text-[#AAAAAA]">
                    {procurementStats.pendingConfirmations > 0 
                      ? `${procurementStats.pendingConfirmations} pending item${procurementStats.pendingConfirmations > 1 ? 's' : ''}`
                      : "Awaiting vendor response"}
                  </p>
                </div>

                {/* On-Time Deliveries */}
                <div className="bg-gradient-to-br from-[#0D0F12]/80 to-[#1A1D22]/80 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6 text-center hover:border-green-500/60 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all duration-300 group">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-2xl">✅</span>
                    <p className="text-sm text-[#FFD54F] font-semibold">On-Time Deliveries</p>
                  </div>
                  <p className="text-3xl font-bold text-green-400 mb-2 group-hover:scale-110 transition-transform duration-300">
                    {procurementStats.confirmedItems}
                  </p>
                  <p className="text-xs text-[#AAAAAA]">
                    {procurementStats.confirmedItems === procurementStats.totalItems && procurementStats.totalItems > 0
                      ? "All materials on track"
                      : `${procurementStats.confirmedItems} confirmed`}
                  </p>
                </div>
              </div>
            </div>

            {/* Procurement Table */}
            <div className={`bg-[#1E2126]/90 border border-[#C9A94A]/20 rounded-2xl shadow-[0_0_15px_rgba(201,169,74,0.15)] overflow-hidden transition-opacity duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
              <div className="p-6 border-b border-[#C9A94A]/20">
                <h3 className="text-xl font-bold text-[#C9A94A] flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-[#C9A94A] to-[#E0C870] rounded"></span>
                  Procurement Details
                </h3>
              </div>
              <div className="overflow-x-auto">
                {procurementLoading ? (
                  <div className="px-6 py-16 text-center">
                    <div className="inline-flex items-center gap-3 text-[#C9A94A]">
                      <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-[#EDEDED]">Loading procurement data...</span>
                    </div>
                  </div>
                ) : procurementError ? (
                  <div className="px-6 py-16 text-center">
                    <div className="text-red-400 mb-2">
                      <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-400 font-semibold mb-2">Error Loading Data</p>
                    <p className="text-[#B0B0B0] text-sm mb-4">{procurementError}</p>
                    <button
                      onClick={() => selectedProject && fetchProcurementData(selectedProject)}
                      className="px-4 py-2 bg-gradient-to-r from-[#C9A94A] to-[#E0C870] text-[#1A1D22] font-medium rounded-lg hover:shadow-[0_0_10px_rgba(201,169,74,0.4)] transition-all text-sm"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#0D0F12]/50 border-b border-[#C9A94A]/30">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-[#C9A94A]">Material/Equipment</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-[#C9A94A]">Vendor</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-[#C9A94A]">Quantity</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-[#C9A94A]">Lead Time</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-[#C9A94A]">Delivery Date</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-[#C9A94A]">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-[#C9A94A]">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProcurementLogs.length > 0 ? (
                        filteredProcurementLogs.map((log, idx) => {
                          const hasMissingDeliveryDate = log.delivery_date === "Pending";
                          
                          return (
                            <tr 
                              key={log.id || idx} 
                              className={`border-b border-[#C9A94A]/10 transition-all duration-200 hover:bg-[#0D0F12]/30 hover:border-[#C9A94A]/20 animate-fadeIn ${
                                idx % 2 === 0 ? 'bg-[#1A1D22]/30' : 'bg-[#1E2126]/50'
                              }`}
                              style={{ animationDelay: `${idx * 50}ms` }}
                            >
                              <td className="px-6 py-4 text-sm text-[#EDEDED] font-medium">
                                {log.material_equipment || "N/A"}
                              </td>
                              <td className="px-6 py-4 text-sm text-[#B0B0B0]">
                                {log.vendor_name || "N/A"}
                              </td>
                              <td className="px-6 py-4 text-sm text-center text-[#EDEDED]">
                                {log.quantity || 0} {log.unit || ""}
                              </td>
                              <td className="px-6 py-4 text-sm text-center text-[#B0B0B0]">
                                {log.lead_time_days || 0} days
                              </td>
                              <td className={`px-6 py-4 text-sm text-center ${
                                hasMissingDeliveryDate 
                                  ? 'text-[#b3b3b3] italic' 
                                  : 'text-[#EDEDED]'
                              }`}>
                                {formatDate(log.delivery_date)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={getStatusBadge(log.status)}>
                                  {log.status || "Pending"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-[#B0B0B0]">
                                {log.remarks || "N/A"}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-16 text-center text-[#B0B0B0]">
                            {selectedProject 
                              ? "No procurement logs available for the selected project."
                              : "Please select a project to view procurement logs."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* AI Insights Panel */}
            <div className="bg-[#1E2126]/90 border border-[#C9A94A]/20 rounded-2xl shadow-[0_0_15px_rgba(201,169,74,0.15)] p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#C9A94A]/20">
                <h3 className="text-xl font-bold text-[#C9A94A] flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  AI Procurement Summary – {selectedProject}
                </h3>
              </div>

              {/* Vendor Insights */}
              <div className="space-y-6 mb-6">
                {procurementLoading ? (
                  <div className="text-center py-8 text-[#B0B0B0]">
                    <p>Loading AI insights...</p>
                  </div>
                ) : procurementError ? (
                  <div className="text-center py-8 text-[#B0B0B0]">
                    <p>Unable to load AI insights. Please retry.</p>
                  </div>
                ) : Object.keys(procurementStats.vendorMap).length === 0 ? (
                  <div className="text-center py-8 text-[#B0B0B0]">
                    <p>No vendor insights available for this project.</p>
                  </div>
                ) : (
                  Object.entries(procurementStats.vendorMap).map(([vendorName, vendorLogs]) => {
                  const vendorImpact = vendorLogs[0]?.ai_analysis?.impact || "No analysis available";
                  const vendorRecommendation = vendorLogs[0]?.ai_analysis?.recommendation || "Continue regular tracking.";
                  
                  // Get the most recent delivery date from vendor logs
                  const getLastUpdatedDate = () => {
                    // Try to find a confirmed delivery date
                    const confirmedLog = vendorLogs.find(log => 
                      log.delivery_date && log.delivery_date !== "Pending" && log.status === "Confirmed"
                    );
                    
                    if (confirmedLog?.delivery_date) {
                      return formatDate(confirmedLog.delivery_date);
                    }
                    
                    // Fallback: use current date formatted nicely
                    return new Date().toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                  };
                  
                  return (
                    <div 
                      key={vendorName}
                      className="bg-[#0D0F12]/50 rounded-xl p-5 border border-[#C9A94A]/20 hover:border-[#C9A94A]/40 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="text-lg font-semibold text-[#C9A94A]">{vendorName}</h4>
                        <span className="px-3 py-1.5 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg text-xs font-medium whitespace-nowrap">
                          Last Updated: {getLastUpdatedDate()}
                        </span>
                      </div>
                      <div className="space-y-4">
                        <div className="pb-3 border-b border-[#C9A94A]/10">
                          <p className="text-xs text-[#B0B0B0] mb-1.5 font-medium">Impact</p>
                          <p className={`text-sm font-medium leading-relaxed ${getImpactColor(vendorImpact)}`}>
                            {vendorImpact}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#B0B0B0] mb-1.5 font-medium">Recommendation</p>
                          <p className="text-sm text-[#EDEDED] leading-relaxed">{vendorRecommendation}</p>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>

              {/* AI Tip Section */}
              {/* <div className="bg-gradient-to-r from-[#0D0F12]/80 to-[#1A1D22]/80 rounded-xl p-5 border border-[#C9A94A]/30">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#C9A94A] mb-2">AI Tip</p>
                    <p className="text-sm text-[#EDEDED]">{aiTip}</p>
                  </div>
                </div>
              </div> */}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
