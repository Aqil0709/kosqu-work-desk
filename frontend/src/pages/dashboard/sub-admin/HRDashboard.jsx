import React, { useState, useEffect } from 'react';
import './HRDashboard.css';
import dashboardAPI from '../../../services/dashboardAPI';
import brandingAPI from '../../../services/brandingAPI';
import { useAuth } from '../../../contexts/AuthContext';
import {
  HiOutlineDocumentText,
  HiOutlineCurrencyDollar,
  HiOutlineClipboardDocumentList,
  HiOutlineUsers,
  HiOutlineBriefcase,
  HiOutlineArrowRight
} from "react-icons/hi2";

const HRDashboard = ({ setActiveTab }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    employees: "0",
    offersSent: "0",
    activeJobs: "0",
    pendingTasks: "0"
  });

  const [companyName, setCompanyName] = useState('company');
  const isKosquOrganization = (user?.tenant_slug || '').toLowerCase() === 'kosqu';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await dashboardAPI.getStats();
        const stats = res.data.stats || [];

        // Find specific stats from the array safely and case-insensitively
        const findStat = (title) => stats.find(s => s.title && s.title.toUpperCase() === title);
        
        const empStat = findStat('EMPLOYEES');
        const internStat = findStat('INTERNSHIPS') || findStat('ACTIVE_JOBS');
        const offerStat = findStat('OFFERS_SENT');

        setStatsData({
          employees: empStat?.value || "0",
          offersSent: offerStat?.value || "0",
          activeJobs: internStat?.value || "0",
          pendingTasks: internStat?.secondaryValue || "0"
        });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchBranding = async () => {
      try {
        const res = await brandingAPI.get();
        if (res.data?.success && res.data?.branding?.company_name) {
          setCompanyName(res.data.branding.company_name);
        }
      } catch (err) {
        console.error("Error fetching branding:", err);
      }
    };

    fetchStats();
    fetchBranding();
  }, []);

  const stats = [
    { label: "Total Employees", value: statsData.employees, icon: <HiOutlineUsers />, color: "#6366f1" },
    { label: "Offers Sent", value: statsData.offersSent, icon: <HiOutlineDocumentText />, color: "#10b981" },
    // { label: "Active Jobs", value: statsData.activeJobs, icon: <HiOutlineBriefcase />, color: "#f59e0b" },
    // { label: "Pending Tasks", value: statsData.pendingTasks, icon: <HiOutlineClipboardDocumentList />, color: "#ef4444" },
  ];

  return (
    <div className="hr-dashboard-container">
      <header className="hr-header">
        <div className="hr-header-info">
          <h1 style={{ fontSize: '28px', color: 'var(--theme-text-strong,#1e293b)', marginBottom: '8px', fontWeight: 'bold' }}>HR Management Hub</h1>
          <p style={{ color: 'var(--theme-text-muted,#64748b)', fontSize: '16px' }}>Streamline your HR operations and documents in one place.</p>
        </div>
      </header>

      {/* Stats Section */}
      <div className="hr-stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="hr-stat-card">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="section-title">Essential Tools</h2>
      <div className="hr-tools-grid">
        {/* Offer Letter Card */}
        <div className="hr-tool-card" onClick={() => setActiveTab('offer-letter')}>
          <div className="tool-icon-wrapper doc">
            <HiOutlineDocumentText />
          </div>
          <div className="tool-info">
            <h3>Offer Letter</h3>
            <p>Generate professional offer letters with {companyName} branding.</p>
          </div>
          <div className="tool-action">
            <HiOutlineArrowRight />
          </div>
        </div>

        {!isKosquOrganization && (
          <>
            {/* Salary Slip Card */}
            <div className="hr-tool-card" onClick={() => setActiveTab('salary-slip')}>
              <div className="tool-icon-wrapper cash">
                <HiOutlineCurrencyDollar />
              </div>
              <div className="tool-info">
                <h3>Salary Slip</h3>
                <p>Manage and generate monthly employee salary slips for {companyName}.</p>
              </div>
              <div className="tool-action">
                <HiOutlineArrowRight />
              </div>
            </div>


            {/* Resignation Card */}
            <div className="hr-tool-card" onClick={() => setActiveTab('resignation')}>
              <div className="tool-icon-wrapper resign">
                <HiOutlineClipboardDocumentList />
              </div>
              <div className="tool-info">
                <h3>Resignation</h3>
                <p>Process employee resignations and exit formalities for {companyName}.</p>
              </div>
              <div className="tool-action">
                <HiOutlineArrowRight />
              </div>
            </div>

            {/* Experience Letter Card */}
            <div className="hr-tool-card" onClick={() => setActiveTab('experience-letter')}>
              <div className="tool-icon-wrapper doc">
                <HiOutlineDocumentText />
              </div>
              <div className="tool-info">
                <h3>Experience Letter</h3>
                <p>Generate experience letters and relieve employees for {companyName}.</p>
              </div>
              <div className="tool-action">
                <HiOutlineArrowRight />
              </div>
            </div>

            {/* Increment Letter Card */}
            <div className="hr-tool-card" onClick={() => setActiveTab('increment-letter')}>
              <div className="tool-icon-wrapper cash">
                <HiOutlineCurrencyDollar />
              </div>
              <div className="tool-info">
                <h3>Increment Letter</h3>
                <p>Generate automated salary increment letters for {companyName}.</p>
              </div>
              <div className="tool-action">
                <HiOutlineArrowRight />
              </div>
            </div>

            {/* Employees Card */}
            <div className="hr-tool-card" onClick={() => setActiveTab('hr-employee-directory')}>
              <div className="tool-icon-wrapper emp">
                <HiOutlineUsers />
              </div>
              <div className="tool-info">
                <h3>Employee Directory</h3>
                <p>Access and manage detailed employee information.</p>
              </div>
              <div className="tool-action">
                <HiOutlineArrowRight />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HRDashboard;
