// models/dashboardModel.js
const pool = require('../config/database');

const Dashboard = {
    // Get dashboard statistics
    getStats: async (tenantId) => {
        // You'll need to replace these with actual database queries
        // For now, returning mock data structure
        return [
            { 
                title: 'EMPLOYEES', 
                value: '156', 
                subtitle: 'Active Today',
                percentage: '↑ 2.5%',
                secondaryValue: '12',
                secondaryLabel: 'On Leave',
                icon: '👥',
                color: '#4299E1'
            },
            { 
                title: 'PROJECTS', 
                value: '28', 
                subtitle: 'Active Projects',
                percentage: '↑ 5.3%',
                secondaryValue: '67',
                secondaryLabel: 'Completed',
                icon: '📋',
                color: '#48BB78'
            },
            { 
                title: 'STUDENTS', 
                value: '2,847', 
                subtitle: 'Active Students',
                percentage: '↑ 8.7%',
                secondaryValue: '142',
                secondaryLabel: 'New This Month',
                icon: '🎯',
                color: '#ED8936'
            },
            { 
                title: 'INTERNSHIPS', 
                value: '84', 
                subtitle: 'Active Internships',
                percentage: '↑ 12.4%',
                secondaryValue: '36',
                secondaryLabel: 'Pending Applications',
                icon: '⚡',
                color: '#F56565'
            }
        ];
    },

    // Get students enrollment data (you'll need to create this table)
    getStudentsChart: async (tenantId) => {
        // Example query - you'll need to adjust based on your actual table structure
        /*
        const query = `
            SELECT 
                DATE_FORMAT(created_at, '%b') as month,
                COUNT(*) as students
            FROM students 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
            ORDER BY MIN(created_at) ASC
        `;
        const [rows] = await pool.execute(query);
        return rows;
        */
        
        // Mock data for now
        return [
            { month: 'Jul', students: 1892 },
            { month: 'Aug', students: 1988 },
            { month: 'Sep', students: 2095 },
            { month: 'Oct', students: 2202 },
            { month: 'Nov', students: 2298 },
            { month: 'Dec', students: 2415 }
        ];
    },

    // Get projects overview
    getProjectsOverview: async (tenantId) => {
        return {
            projects: {
                segments: [
                    { percentage: 60, color: '#A7F3D0', hoverColor: '#85E0B7', label: 'Completed' },
                    { percentage: 25, color: '#BFDBFE', hoverColor: '#9DC3FB', label: 'Ongoing' },
                    { percentage: 15, color: '#FECACA', hoverColor: '#FCA5A5', label: 'Delay' }
                ],
                total: '28 Projects'
            },
            digitalMarketing: {
                segments: [
                    { percentage: 55, color: '#A7F3D0', hoverColor: '#85E0B7', label: 'Completed' },
                    { percentage: 30, color: '#BFDBFE', hoverColor: '#9DC3FB', label: 'Ongoing' },
                    { percentage: 15, color: '#FECACA', hoverColor: '#FCA5A5', label: 'Delay' }
                ],
                total: '15 Campaigns'
            },
            services: {
                segments: [
                    { percentage: 70, color: '#BFDBFE', hoverColor: '#9DC3FB', label: 'Active' },
                    { percentage: 20, color: '#A7F3D0', hoverColor: '#85E0B7', label: 'Completed' },
                    { percentage: 10, color: '#FECACA', hoverColor: '#FCA5A5', label: 'Maintenance' }
                ],
                total: '42 Services'
            }
        };
    },

    // Get recent projects
    getRecentProjects: async (tenantId) => {
        return [
            { 
                name: 'Website Redesign', 
                status: 'DELAYED', 
                progress: 65,
                startDate: 'Jan 15, 2025',
                endDate: 'Apr 30, 2025',
                currentDate: 'Oct 23, 2025'
            }
            // ... other projects
        ];
    },

    // Get notifications
    getNotifications: async (tenantId, userId) => {
        return [
            { id: 1, message: 'New project assigned to you', read: false },
            { id: 2, message: 'Meeting with client in 30 minutes', read: false },
            { id: 3, message: 'Project deadline approaching', read: true }
        ];
    },

    // Mark notification as read
    markNotificationAsRead: async (tenantId, notificationId) => {
        // Implementation for marking notification as read
        return true;
    }
};

module.exports = Dashboard;