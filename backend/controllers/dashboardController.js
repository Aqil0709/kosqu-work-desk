// controllers/dashboardController.js
const pool = require('../config/database');

const dashboardController = {
    getStats: async (req, res) => {
        try {
            console.log('Fetching dashboard stats...');
            const tenantId = req.tenantId;
            
            // Get employees count from employee_details table
            const [employeesResult] = await pool.execute(
                'SELECT COUNT(*) as total FROM employee_details WHERE tenant_id = ?',
                [tenantId]
            );
            
            // Get projects count
            let projectsTotal = 0;
            let projectsCompleted = 0;
            try {
                const [projectsResult] = await pool.execute(
                    `SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN LOWER(status) = "completed" THEN 1 ELSE 0 END) as completed
                     FROM projects WHERE tenant_id = ?`,
                     [tenantId]
                );
                projectsTotal = projectsResult[0]?.total || 0;
                projectsCompleted = projectsResult[0]?.completed || 0;
            } catch (error) {
                console.log('Projects table issue or not found:', error.message);
            }
            
            // Get students count
            let studentsTotal = 0;
            try {
                const [studentsResult] = await pool.execute(
                    'SELECT COUNT(*) as total FROM students WHERE status = "active" AND tenant_id = ?',
                    [tenantId]
                );
                studentsTotal = studentsResult[0]?.total || 0;
            } catch (error) {
                console.log('Students table not found, using default values');
            }
            
            // Get internships count
            let internshipsTotal = 0;
            let internshipsPending = 0;
            try {
                const [internshipsResult] = await pool.execute(
                    `SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN LOWER(status) = "pending" THEN 1 ELSE 0 END) as pending
                     FROM internships WHERE tenant_id = ?`,
                     [tenantId]
                );
                internshipsTotal = internshipsResult[0]?.total || 0;
                internshipsPending = internshipsResult[0]?.pending || 0;
            } catch (error) {
                console.log('Internships table not found, using default values');
            }

            // Get offer letters count
            let offersSentTotal = 0;
            try {
                const [offersResult] = await pool.execute(
                    'SELECT COUNT(*) as total FROM offer_letters ol JOIN users u ON ol.employee_id = u.id WHERE u.tenant_id = ?',
                    [tenantId]
                );
                offersSentTotal = offersResult[0]?.total || 0;
            } catch (error) {
                console.log('Offer letters table not found, using default values');
            }

            const stats = [
                { 
                    title: 'EMPLOYEES', 
                    value: employeesResult[0]?.total?.toString() || '0', 
                    subtitle: 'Active Employees',
                    secondaryValue: '0',
                    secondaryLabel: 'On Leave',
                    icon: '👥',
                    color: '#4299E1'
                },
                { 
                    title: 'PROJECTS', 
                    value: projectsTotal.toString(), 
                    subtitle: 'Active Projects',
                    secondaryValue: projectsCompleted.toString(),
                    secondaryLabel: 'Completed',
                    icon: '📋',
                    color: '#48BB78'
                },
                { 
                    title: 'OFFERS_SENT', 
                    value: offersSentTotal.toString(), 
                    subtitle: 'Offers Sent',
                    secondaryValue: '0',
                    secondaryLabel: 'Accepted',
                    icon: '📄',
                    color: '#4299E1'
                },
                // { 
                //     title: 'STUDENTS', 
                //     value: studentsTotal.toLocaleString(), 
                //     subtitle: 'Active Students',
                //     secondaryValue: '0',
                //     secondaryLabel: 'New This Month',
                //     icon: '🎯',
                //     color: '#ED8936'
                // },
                { 
                    title: 'INTERNSHIPS', 
                    value: internshipsTotal.toString(), 
                    subtitle: 'Active Internships',
                    secondaryValue: internshipsPending.toString(),
                    secondaryLabel: 'Pending Applications',
                    icon: '⚡',
                    color: '#F56565'
                }
            ];
            
            console.log('Stats data:', stats);
            res.json({ stats });
            
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({ 
                message: 'Error fetching dashboard statistics',
                error: error.message 
            });
        }
    },

    getStudentsChart: async (req, res) => {
        try {
            console.log('Fetching students chart data...');
            const tenantId = req.tenantId;
            let studentsData = [];
            
            try {
                // Try to get real student enrollment data from last 6 months
                const [rows] = await pool.execute(`
                    SELECT 
                        DATE_FORMAT(created_at, '%b') as month,
                        COUNT(*) as students
                    FROM students 
                    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND tenant_id = ?
                    GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
                    ORDER BY MIN(created_at) ASC
                    LIMIT 6
                `, [tenantId]);
                
                studentsData = rows;
            } catch (error) {
                console.log('Students chart query failed:', error.message);
                studentsData = [];
            }
            
            console.log('Students chart data:', studentsData);
            res.json({ studentsData });
            
        } catch (error) {
            console.error('Get students chart error:', error);
            res.status(500).json({ 
                message: 'Error fetching students chart data',
                error: error.message 
            });
        }
    },

    getProjectsOverview: async (req, res) => {
        try {
            console.log('Fetching projects overview...');
            const tenantId = req.tenantId;
            
            let pieChartData = {
                projects: {
                    segments: [
                        { percentage: 0, color: '#A7F3D0', hoverColor: '#85E0B7', label: 'Completed' },
                        { percentage: 0, color: '#BFDBFE', hoverColor: '#9DC3FB', label: 'Ongoing' },
                        { percentage: 0, color: '#FECACA', hoverColor: '#FCA5A5', label: 'Delay' }
                    ],
                    total: '0 Projects'
                },
                digitalMarketing: {
                    segments: [
                        { percentage: 0, color: '#A7F3D0', hoverColor: '#85E0B7', label: 'Completed' },
                        { percentage: 0, color: '#BFDBFE', hoverColor: '#9DC3FB', label: 'Ongoing' },
                        { percentage: 0, color: '#FECACA', hoverColor: '#FCA5A5', label: 'Delay' }
                    ],
                    total: '0 Campaigns'
                },
                services: {
                    segments: [
                        { percentage: 0, color: '#BFDBFE', hoverColor: '#9DC3FB', label: 'Active' },
                        { percentage: 0, color: '#A7F3D0', hoverColor: '#85E0B7', label: 'Completed' },
                        { percentage: 0, color: '#FECACA', hoverColor: '#FCA5A5', label: 'Maintenance' }
                    ],
                    total: '0 Services'
                }
            };
            
            try {
                // Get real project status data
                const [projectStats] = await pool.execute(`
                    SELECT 
                        status,
                        COUNT(*) as count,
                        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM projects WHERE tenant_id = ?)), 1) as percentage
                    FROM projects
                    WHERE tenant_id = ?
                    GROUP BY status
                `, [tenantId, tenantId]);

                if (projectStats.length > 0) {
                    const projectsData = formatProjectData(projectStats);
                    pieChartData.projects = projectsData;
                }
            } catch (error) {
                console.log('Projects overview query failed:', error.message);
            }
            
            console.log('Projects overview data:', pieChartData);
            res.json(pieChartData);
            
        } catch (error) {
            console.error('Get projects overview error:', error);
            res.status(500).json({ 
                message: 'Error fetching projects overview',
                error: error.message 
            });
        }
    },

    getRecentProjects: async (req, res) => {
        try {
            console.log('Fetching recent projects...');
            const tenantId = req.tenantId;
            let projects = [];
            
            try {
                const [rows] = await pool.execute(`
                    SELECT 
                        name,
                        status,
                        progress,
                        DATE_FORMAT(start_date, '%b %d, %Y') as startDate,
                        DATE_FORMAT(end_date, '%b %d, %Y') as endDate,
                        DATE_FORMAT(NOW(), '%b %d, %Y') as currentDate
                    FROM projects
                    WHERE tenant_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT 4
                `, [tenantId]);
                
                projects = rows.map(project => ({
                    ...project,
                    status: project.status ? project.status.toUpperCase() : 'PLANNING'
                }));
            } catch (error) {
                console.log('Recent projects query failed:', error.message);
                projects = [];
            }
            
            console.log('Recent projects data:', projects);
            res.json({ projects });
            
        } catch (error) {
            console.error('Get recent projects error:', error);
            res.status(500).json({ 
                message: 'Error fetching recent projects',
                error: error.message 
            });
        }
    },

    getNotifications: async (req, res) => {
        try {
            console.log('Fetching notifications for user:', req.user.id);
            let notifications = [];
            
            try {
                // We scope by user_id which is inherently tenant specific since users reside in tenants
                const [rows] = await pool.execute(`
                    SELECT 
                        id,
                        message,
                        is_read as read,
                        created_at
                    FROM notifications 
                    WHERE user_id = ?
                    ORDER BY created_at DESC 
                    LIMIT 10
                `, [req.user.id]);
                
                notifications = rows;
            } catch (error) {
                console.log('Notifications query failed:', error.message);
                notifications = [];
            }
            
            console.log('Notifications data:', notifications);
            res.json({ notifications });
            
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({ 
                message: 'Error fetching notifications',
                error: error.message 
            });
        }
    },

    markNotificationAsRead: async (req, res) => {
        try {
            await pool.execute(
                'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?',
                [req.params.id, req.user.id] // Scoped to user
            );
            res.json({ message: 'Notification marked as read' });
        } catch (error) {
            console.error('Mark notification read error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    markAllNotificationsAsRead: async (req, res) => {
        try {
            await pool.execute(
                'UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false',
                [req.user.id] // Scoped to user
            );
            res.json({ message: 'All notifications marked as read' });
        } catch (error) {
            console.error('Mark all notifications read error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

// Helper function to format project data
function formatProjectData(projectStats) {
    const segments = [];
    let totalProjects = 0;

    projectStats.forEach(stat => {
        let label = stat.status.charAt(0).toUpperCase() + stat.status.slice(1).toLowerCase();
        let color, hoverColor;

        switch (stat.status.toLowerCase()) {
            case 'completed':
                color = '#A7F3D0';
                hoverColor = '#85E0B7';
                break;
            case 'ongoing':
            case 'active':
                color = '#BFDBFE';
                hoverColor = '#9DC3FB';
                break;
            case 'delayed':
            case 'delay':
                color = '#FECACA';
                hoverColor = '#FCA5A5';
                break;
            default:
                color = '#BFDBFE';
                hoverColor = '#9DC3FB';
        }

        segments.push({
            percentage: parseFloat(stat.percentage) || 0,
            color,
            hoverColor,
            label
        });

        totalProjects += stat.count;
    });

    return {
        segments,
        total: `${totalProjects} Projects`
    };
}

module.exports = dashboardController;