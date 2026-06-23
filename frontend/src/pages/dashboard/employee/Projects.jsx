import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaBell, FaUsers, FaTasks, FaPlus, FaTrash, FaEye, FaCheck, FaFileExcel, FaUpload, FaCheckCircle, FaHourglassHalf, FaClock, FaUserPlus, FaDownload, FaSync, FaEdit } from 'react-icons/fa';
import { projectAPI } from '../../../services/projectAPI';
import './Projects.css';
import * as XLSX from 'xlsx';

const ProjectManagement = () => {
  // User context
  const [currentUser, setCurrentUser] = useState({
    id: null,
    employeeId: null,
    name: '',
    role: '',
    isProjectLead: false,
    managedProjects: []
  });

  // State variables
  const [projects, setProjects] = useState([]);
  const [projectLeads, setProjectLeads] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedTaskEmployees, setSelectedTaskEmployees] = useState([]);
  const [availableTeamMembers, setAvailableTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);
  const [isDeleteTaskModalOpen, setIsDeleteTaskModalOpen] = useState(false);
  const [isDeleteTeamModalOpen, setIsDeleteTeamModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [selectedProjectTeams, setSelectedProjectTeams] = useState([]);
  const [isExcelEditorOpen, setIsExcelEditorOpen] = useState(false);
  const [editableTasks, setEditableTasks] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);

  // Edit form states
  const [editFormData, setEditFormData] = useState({
    name: '',
    department: '',
    manager: '',
    start_date: '',
    end_date: '',
    current_phase: '',
    status: ''
  });

  const [assignFormData, setAssignFormData] = useState({
    assigned_department: '',
    manager_name: '',
    team: []
  });

  const [editTaskData, setEditTaskData] = useState({
    title: '',
    description: '',
    status: '',
    remarks: '',
    priority: '',
    due_date: '',
    progress: 0
  });

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    project_lead: '',
    start_date: '',
    end_date: '',
    current_phase: '',
    status: 'On Track',
    description: ''
  });
  
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    estimated_hours: 0,
    due_date: '',
    project_id: '',
    team_id: '',
    assigned_to_members: []
  });
  
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    team_lead_id: '',
    project_id: '',
    description: '',
    members: []
  });

  const [phaseFormData, setPhaseFormData] = useState({
    status: '',
    progress: '',
    comments: ''
  });

  const [filters, setFilters] = useState({
    status: '',
    department: ''
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardStats, setDashboardStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    delayedProjects: 0,
    completedProjects: 0
  });

  const phases = ['Requirement Specification', 'System Design', 'Development', 'Integration & Testing', 'Deployment', 'Maintenance & Repeat Cycle'];
  const projectStatuses = ['On Track', 'Delayed', 'At Risk', 'Completed', 'On Hold'];
  const taskPriorities = ['High', 'Medium', 'Low'];
  const taskStatuses = ['To-Do', 'In Progress', 'Ready for Review', 'Completed', 'Blocked', 'Cancelled'];
  const reviewStatuses = ['Not Reviewed', 'Approved', 'Rejected', 'Needs Rework'];
// Add this helper function to ensure phases exist
const getProjectPhases = (project) => {
  if (project.phases && project.phases.length > 0) {
    return project.phases;
  }
  // Create default phases if none exist
  return phases.map(phaseName => ({
    name: phaseName,
    status: 'Not Started',
    progress: 0,
    comments: ''
  }));
};
  const canDeleteTask = (task) => {
    if (currentUser.role === 'hr') return true;
    return currentUser.isProjectLead && currentUser.managedProjects.includes(task.project_id);
  };

  const canDeleteTeam = (team) => {
    if (currentUser.role === 'hr') return true;
    return currentUser.isProjectLead && currentUser.managedProjects.includes(team.project_id);
  };

  const canEditTask = (task) => {
    if (currentUser.role === 'hr') return true;
    if (currentUser.isProjectLead && currentUser.managedProjects.includes(task.project_id)) return true;
    return false;
  };

  const canEditTaskDescription = (task) => {
    if (currentUser.role === 'hr') return true;
    if (task.assigned_to_member == currentUser.id) return true;
    return false;
  };

  const canEditTaskStatusAndRemarks = (task) => {
    if (currentUser.role === 'hr') return true;
    if (currentUser.isProjectLead && currentUser.managedProjects.includes(task.project_id)) return true;
    return false;
  };

  const canCreateProject = () => currentUser.role === 'hr';
  const canCreateTeam = () => currentUser.role === 'hr';
  const canCreateTask = (projectId) => currentUser.role === 'hr' && currentUser.managedProjects.includes(projectId);
  const canEditProject = () => currentUser.role === 'hr';
  const canViewTeamManagement = () => currentUser.role === 'hr';

  // Helper functions
  const filterTasksByMonth = (tasks, month, year) => {
    return tasks.filter(task => {
      if (!task.created_at && !task.due_date) return true;
      const taskDate = task.created_at ? new Date(task.created_at) : (task.due_date ? new Date(task.due_date) : null);
      if (!taskDate) return true;
      return taskDate.getMonth() === month && taskDate.getFullYear() === year;
    });
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Group tasks by project and title for dashboard display
const getGroupedTasks = (tasksList) => {
  const groupedMap = new Map();
  
  tasksList.forEach(task => {
    // Create a unique key using project_id + title
    const key = `${task.project_id}_${task.title}`;
    
    if (groupedMap.has(key)) {
      const existing = groupedMap.get(key);
      // Add employee if not already in the list
      const employeeExists = existing.assigned_employees.some(emp => emp.id === task.assigned_to_member);
      if (!employeeExists && task.assigned_to_member) {
        existing.assigned_employees.push({
          id: task.assigned_to_member,
          name: task.assigned_to_name || 'Not Assigned'
        });
        existing.employee_count = existing.assigned_employees.length;
      }
      
      // Store all task IDs for this grouped task
      if (!existing.task_ids) {
        existing.task_ids = [existing.id];
      }
      if (task.id && !existing.task_ids.includes(task.id)) {
        existing.task_ids.push(task.id);
      }
      
      // Combine descriptions if they are different
      if (task.description && task.description !== 'No description' && !existing.description.includes(task.description)) {
        existing.description = existing.description === 'No description' 
          ? task.description 
          : `${existing.description}\n\n[${task.assigned_to_name}]: ${task.description}`;
      }
      
      // Combine remarks if they are different
      if (task.remarks && task.remarks !== 'No remarks' && !existing.remarks.includes(task.remarks)) {
        existing.remarks = existing.remarks === 'No remarks' 
          ? task.remarks 
          : `${existing.remarks}\n[${task.assigned_to_name}]: ${task.remarks}`;
      }
    } else {
      // New task, create entry
      groupedMap.set(key, {
        id: task.id,
        task_ids: [task.id],
        title: task.title,
        description: task.description || 'No description',
        status: task.status,
        remarks: task.remarks || 'No remarks',
        priority: task.priority,
        due_date: task.due_date,
        project_id: task.project_id,
        project_name: task.project_name,
        created_at: task.created_at,
        assigned_employees: task.assigned_to_member ? [{
          id: task.assigned_to_member,
          name: task.assigned_to_name || 'Not Assigned'
        }] : [],
        employee_count: task.assigned_to_member ? 1 : 0
      });
    }
  });
  
  return Array.from(groupedMap.values());
};

  // Open Full Month Editor
  const openFullMonthEditor = (project, month, year) => {
    setSelectedProject(project);
    setSelectedMonth(month);
    setSelectedYear(year);
    setShowMonthFilter(true);
    
    let projectTasks = tasks.filter(t => t.project_id == project.id);
    projectTasks = filterTasksByMonth(projectTasks, month, year);
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const tasksByDate = {};
    
    projectTasks.forEach(t => {
      const tDate = t.created_at ? new Date(t.created_at) : (t.due_date ? new Date(t.due_date) : new Date());
      const day = tDate.getDate();
      if (!tasksByDate[day]) {
        tasksByDate[day] = [];
      }
      tasksByDate[day].push(t);
    });
    
    const monthlyTasks = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      if (tasksByDate[day] && tasksByDate[day].length > 0) {
        tasksByDate[day].forEach(t => {
          monthlyTasks.push({
            id: t.id,
            date: dateStr,
            displayDate: `${day}/${month + 1}/${year}`,
            project: project.name,
            task: t.title,
            description: t.description || '',
            status: t.status,
            remarks: t.remarks || '',
            priority: t.priority,
            dueDate: t.due_date ? formatDate(t.due_date) : 'Not set',
            assignedTo: t.assigned_to_name || 'Not Assigned',
            assignedToId: t.assigned_to_member
          });
        });
      } else {
        monthlyTasks.push({
          id: null,
          date: dateStr,
          displayDate: `${day}/${month + 1}/${year}`,
          project: project.name,
          task: '',
          description: '',
          status: 'To-Do',
          remarks: '',
          priority: 'Medium',
          dueDate: 'Not set',
          assignedTo: '',
          assignedToId: null
        });
      }
    }
    
    setEditableTasks(monthlyTasks);
    setIsExcelEditorOpen(true);
  };

  // Export current month's full data to Excel
  const exportCurrentMonthExcel = () => {
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }
    
    if (editableTasks.length === 0) {
      alert('No data to export');
      return;
    }
    
    const exportData = editableTasks.map(task => ({
      'Date': task.displayDate,
      'Day': new Date(task.date).toLocaleDateString('en-US', { weekday: 'long' }),
      'Project': task.project,
      'Task/Activity': task.task,
      'Description': task.description,
      'Status': task.status,
      'Remarks': task.remarks,
      'Priority': task.priority,
      'Due Date': task.dueDate,
      'Assigned To': task.assignedTo
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${selectedProject.name}_${getMonthName(selectedMonth)}_${selectedYear}`);
    
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 35 },
      { wch: 40 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 20 }
    ];
    
    const fileName = `${selectedProject.name}_${getMonthName(selectedMonth)}_${selectedYear}_FullMonth.xlsx`;
    XLSX.writeFile(workbook, fileName);
    alert(`✅ Exported complete month of ${getMonthName(selectedMonth)} ${selectedYear} with ${editableTasks.filter(t => t.task).length} tasks`);
  };

  // Export filtered month report
  const exportFilteredMonthReport = (project) => {
    let projectTasks = userTasks.filter(task => task.project_id == project.id);
    
    if (showMonthFilter) {
      projectTasks = filterTasksByMonth(projectTasks, selectedMonth, selectedYear);
    }
    
    if (projectTasks.length === 0) {
      alert(`No tasks found for ${getMonthName(selectedMonth)} ${selectedYear}!`);
      return;
    }
    
    const workbook = XLSX.utils.book_new();
    
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const tasksByDate = {};
    
    projectTasks.forEach(task => {
      const taskDate = task.created_at ? new Date(task.created_at) : (task.due_date ? new Date(task.due_date) : new Date());
      const day = taskDate.getDate();
      if (!tasksByDate[day]) {
        tasksByDate[day] = [];
      }
      tasksByDate[day].push(task);
    });
    
    const monthData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (tasksByDate[day] && tasksByDate[day].length > 0) {
        tasksByDate[day].forEach(task => {
          monthData.push({
            'Date': `${day}/${selectedMonth + 1}/${selectedYear}`,
            'Day': dayName,
            'Task Title': task.title,
            'Description': task.description || 'No description',
            'Status': task.status,
            'Remarks': task.remarks || 'No remarks',
            'Priority': task.priority,
            'Due Date': task.due_date ? formatDate(task.due_date) : 'Not set',
            'Assigned To': task.assigned_to_name || 'Not Assigned',
            'Project': project.name
          });
        });
      } else {
        monthData.push({
          'Date': `${day}/${selectedMonth + 1}/${selectedYear}`,
          'Day': dayName,
          'Task Title': 'No tasks',
          'Description': '-',
          'Status': '-',
          'Remarks': '-',
          'Priority': '-',
          'Due Date': '-',
          'Assigned To': '-',
          'Project': project.name
        });
      }
    }
    
    const monthSheet = XLSX.utils.json_to_sheet(monthData);
    XLSX.utils.book_append_sheet(workbook, monthSheet, `${getMonthName(selectedMonth)}_${selectedYear}`);
    
    const groupedTasks = getGroupedTasks(projectTasks);
    const groupedData = groupedTasks.map(task => ({
      'Task Title': task.title,
      'Description': task.description,
      'Status': task.status,
      'Remarks': task.remarks,
      'Priority': task.priority,
      'Due Date': task.due_date ? formatDate(task.due_date) : 'Not set',
      'Assigned To': task.assigned_employees.map(e => e.name).join(', '),
      'Employee Count': task.employee_count
    }));
    
    const groupedSheet = XLSX.utils.json_to_sheet(groupedData);
    XLSX.utils.book_append_sheet(workbook, groupedSheet, 'Tasks_Summary');
    
    const employeeMap = new Map();
    projectTasks.forEach(task => {
      const empName = task.assigned_to_name || 'Not Assigned';
      if (!employeeMap.has(empName)) {
        employeeMap.set(empName, []);
      }
      employeeMap.get(empName).push({
        title: task.title,
        description: task.description,
        status: task.status,
        remarks: task.remarks,
        due_date: task.due_date ? formatDate(task.due_date) : 'Not set'
      });
    });
    
    const employeeData = [];
    employeeMap.forEach((tasks, employee) => {
      tasks.forEach(task => {
        employeeData.push({
          'Employee': employee,
          'Task Title': task.title,
          'Description': task.description,
          'Status': task.status,
          'Remarks': task.remarks,
          'Due Date': task.due_date
        });
      });
    });
    
    const employeeSheet = XLSX.utils.json_to_sheet(employeeData);
    XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Tasks_By_Employee');
    
    const fileName = `${project.name}_${getMonthName(selectedMonth)}_${selectedYear}_FullReport.xlsx`;
    XLSX.writeFile(workbook, fileName);
    alert(`✅ Exported complete report for ${getMonthName(selectedMonth)} ${selectedYear}`);
  };

  // Load current user
  useEffect(() => {
    const loadUser = () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData) {
          const userId = userData.employee_id || userData.id || userData.user_id;
          setCurrentUser({
            id: userId,
            employeeId: userId,
            name: userData.name || `${userData.first_name} ${userData.last_name}` || 'User',
            role: userData.role || userData.user_role || 'team_member',
            isProjectLead: false,
            managedProjects: []
          });
        } else {
          setCurrentUser({
            id: 1,
            employeeId: 1,
            name: 'Test User',
            role: 'team_member',
            isProjectLead: false,
            managedProjects: []
          });
        }
      } catch (err) {
        console.error('Error loading user:', err);
      }
    };
    loadUser();
    fetchAllData();
  }, []);
  
  // Set project lead status
  useEffect(() => {
    if (projects.length > 0 && currentUser.name) {
      const managed = projects.filter(p => p.manager === currentUser.name);
      setCurrentUser(prev => ({
        ...prev,
        isProjectLead: managed.length > 0,
        managedProjects: managed.map(p => p.id)
      }));
    }
  }, [projects, currentUser.name]);

  useEffect(() => {
    if (taskFormData.project_id) {
      const projectTeams = teams.filter(t => t.project_id === parseInt(taskFormData.project_id));
      setSelectedProjectTeams(projectTeams);
      setTaskFormData(prev => ({ ...prev, team_id: '' }));
      setAvailableTeamMembers([]);
      setSelectedTaskEmployees([]);
    } else {
      setSelectedProjectTeams([]);
      setAvailableTeamMembers([]);
    }
  }, [taskFormData.project_id, teams]);
  
  useEffect(() => {
    if (taskFormData.team_id) {
      loadTeamMembers(taskFormData.team_id);
    } else {
      setAvailableTeamMembers([]);
      setSelectedTaskEmployees([]);
    }
  }, [taskFormData.team_id]);

  useEffect(() => {
    if (isTaskModalOpen && selectedProject?.id) {
      setTaskFormData(prev => ({
        ...prev,
        project_id: selectedProject.id
      }));
    }
  }, [isTaskModalOpen, selectedProject]);

  async function loadTeamMembers(teamId) {
    try {
      setLoadingTeamMembers(true);
      const response = await projectAPI.getTeamMembers(teamId);
      let membersList = [];
      
      if (response.data && response.data.success && response.data.data) {
        membersList = response.data.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        membersList = response.data.data;
      } else if (Array.isArray(response.data)) {
        membersList = response.data;
      }
      
      if (membersList.length === 0) {
        setAvailableTeamMembers([]);
        setLoadingTeamMembers(false);
        return;
      }
      
      const formattedMembers = membersList.map(member => ({
        id: member.user_id || member.id,
        user_id: member.user_id || member.id,
        employee_detail_id: member.employee_detail_id || member.employee_id,
        name: member.name,
        position: member.position || 'Team Member',
        email: member.email || ''
      }));
      
      setAvailableTeamMembers(formattedMembers);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setAvailableTeamMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }
  }

  async function fetchAllData() {
    try {
      setLoading(true);
      const isHrUser = currentUser.role === 'hr';

      const [projectsRes, statsRes, employeesRes, departmentsRes, teamsRes, tasksRes] = await Promise.allSettled([
        isHrUser ? projectAPI.getAll() : projectAPI.getMyProjects(),
        isHrUser ? projectAPI.getStats() : Promise.resolve({ data: { success: true, data: null } }),
        isHrUser ? projectAPI.getEmployees() : Promise.resolve({ data: { success: true, data: [] } }),
        isHrUser ? projectAPI.getDepartments() : Promise.resolve({ data: { success: true, data: [] } }),
        isHrUser ? projectAPI.getAllTeams() : projectAPI.getMyTeams(),
        isHrUser ? projectAPI.getAllTasks() : projectAPI.getMyTasks()
      ]);

      if (projectsRes.status === 'fulfilled' && projectsRes.value?.data?.success) {
        setProjects(projectsRes.value.data.data || []);
      } else {
        setProjects([]);
      }

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.success) {
        if (statsRes.value.data.data) {
          setDashboardStats(statsRes.value.data.data || {});
        }
      }

      if (employeesRes.status === 'fulfilled' && employeesRes.value?.data?.success) {
        const employeesData = employeesRes.value.data.data || [];
        const validEmployees = employeesData.filter(emp => emp && emp.id).map(emp => ({
          ...emp,
          employee_detail_id: emp.id,
          user_id: emp.user_id || emp.userId || null,
          id: emp.user_id || emp.id,
          name: emp.name
        }));
        
        setEmployees(validEmployees);
        
        const leads = validEmployees.filter(emp => {
          const role = emp.role_name?.toLowerCase();
          const position = emp.position?.toLowerCase();
          return role !== 'hr' && position !== 'hr';
        });
        setProjectLeads(leads);
      }
      
      if (departmentsRes.status === 'fulfilled' && departmentsRes.value?.data?.success) {
        setDepartments(departmentsRes.value.data.data || []);
      }

      if (teamsRes.status === 'fulfilled' && teamsRes.value?.data?.success) {
        const teamsData = teamsRes.value.data.data || [];
        const teamsWithMembers = teamsData.map(team => ({
          ...team,
          members: team.members || [],
          member_count: team.members?.length || 0
        }));
        setTeams(teamsWithMembers);
      }

      if (tasksRes.status === 'fulfilled' && tasksRes.value?.data?.success) {
        setTasks(tasksRes.value.data.data || []);
      } else {
        setTasks([]);
      }

      if (!isHrUser) {
        const projectList = projectsRes.status === 'fulfilled' && projectsRes.value?.data?.success
          ? (projectsRes.value.data.data || [])
          : [];

        setDashboardStats({
          totalProjects: projectList.length,
          activeProjects: projectList.filter(project => project.status !== 'Completed').length,
          delayedProjects: projectList.filter(project => project.status === 'Delayed').length,
          completedProjects: projectList.filter(project => project.status === 'Completed').length
        });
      }

      setError('');
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  // Get filtered data based on user role
  const getUserProjects = () => {
    const userIdStr = String(currentUser.id);
    
    if (currentUser.role === 'hr') {
      return projects;
    }
    
    if (currentUser.isProjectLead) {
      return projects.filter(p => currentUser.managedProjects.includes(p.id));
    }
    
    const userTasks = tasks.filter(t => String(t.assigned_to_member) === userIdStr);
    const projectIds = [...new Set(userTasks.map(t => t.project_id))];
    return projects.filter(p => projectIds.includes(p.id));
  };

  const getUserTasks = () => {
    const userIdStr = String(currentUser.id);
    
    if (currentUser.role === 'hr') {
      return tasks;
    }
    
    if (currentUser.isProjectLead) {
      return tasks.filter(t => currentUser.managedProjects.includes(t.project_id));
    }
    
    return tasks.filter(t => String(t.assigned_to_member) === userIdStr);
  };

  const getUserTeams = () => {
    if (currentUser.role === 'hr') {
      return teams;
    }
    
    if (currentUser.isProjectLead) {
      return teams.filter(team => currentUser.managedProjects.includes(team.project_id));
    }
    
    const userIdStr = String(currentUser.id);
    return teams.filter(team => 
      team.members && team.members.some(member => String(member.user_id) === userIdStr)
    );
  };

  const userProjects = getUserProjects();
  const userTasks = getUserTasks();
  const userTeams = getUserTeams();

  const filteredProjects = userProjects.filter(project => {
    if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filters.status && project.status !== filters.status) return false;
    if (filters.department && project.department !== filters.department) return false;
    return true;
  });

  // Handle Edit Task Submit
  const handleEditTaskSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    try {
      const updateData = {};
      
      if (editTaskData.description !== selectedTask.description && canEditTaskDescription(selectedTask)) {
        updateData.description = editTaskData.description;
      }
      
      if (editTaskData.status !== selectedTask.status && canEditTaskStatusAndRemarks(selectedTask)) {
        updateData.status = editTaskData.status;
        if (editTaskData.status === 'Completed') {
          updateData.progress = 100;
          updateData.completed_date = new Date().toISOString().split('T')[0];
        } else if (editTaskData.status === 'In Progress') {
          updateData.progress = 50;
        } else if (editTaskData.status === 'Ready for Review') {
          updateData.progress = 80;
        } else if (editTaskData.status === 'To-Do') {
          updateData.progress = 0;
        } else if (editTaskData.status === 'Blocked') {
          updateData.progress = 0;
        }
      }
      
      if (editTaskData.progress !== selectedTask.progress && canEditTaskStatusAndRemarks(selectedTask)) {
        updateData.progress = editTaskData.progress;
      }
      
      if (editTaskData.remarks !== selectedTask.remarks && canEditTaskStatusAndRemarks(selectedTask)) {
        updateData.remarks = editTaskData.remarks;
      }
      
      if (editTaskData.priority !== selectedTask.priority && canEditTask(selectedTask)) {
        updateData.priority = editTaskData.priority;
      }
      
      if (editTaskData.title !== selectedTask.title && canEditTask(selectedTask)) {
        updateData.title = editTaskData.title;
      }
      
      if (editTaskData.due_date !== selectedTask.due_date && canEditTask(selectedTask)) {
        updateData.due_date = editTaskData.due_date;
      }
      
      if (Object.keys(updateData).length > 0) {
        await projectAPI.updateTask(selectedTask.id, updateData);
        await fetchAllData();
        alert('Task updated successfully!');
      } else {
        alert('No changes detected or you don\'t have permission to edit these fields');
      }
      
      setIsEditTaskModalOpen(false);
      setSelectedTask(null);
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Failed to update task: ' + (err.response?.data?.message || err.message));
    }
  };

  const openEditTaskModal = (task) => {
    setSelectedTask(task);
    setEditTaskData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'To-Do',
      remarks: task.remarks || '',
      priority: task.priority || 'Medium',
      due_date: task.due_date || '',
      progress: task.progress || 0
    });
    setIsEditTaskModalOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    if (!canDeleteTask(selectedTask)) {
      alert('Only Project Leads can delete tasks');
      return;
    }
    try {
      await projectAPI.updateTask(selectedTask.id, { status: 'Cancelled' });
      await fetchAllData();
      setIsDeleteTaskModalOpen(false);
      setSelectedTask(null);
      alert('Task deleted successfully!');
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;
    if (!canDeleteTeam(selectedTeam)) {
      alert('Only Project Leads can delete teams');
      return;
    }
    try {
      await projectAPI.deleteTeam(selectedTeam.id);
      await fetchAllData();
      setIsDeleteTeamModalOpen(false);
      setSelectedTeam(null);
      alert('Team deleted successfully!');
    } catch (err) {
      console.error('Error deleting team:', err);
      alert('Failed to delete team: ' + (err.response?.data?.message || err.message));
    }
  };

  // Save Excel edits
  const saveExcelEdits = async () => {
    let updatedCount = 0;
    let createdCount = 0;
    let errors = [];
    
    for (const editedTask of editableTasks) {
      const updateData = {};
      
      if (!editedTask.id && editedTask.task && editedTask.task.trim()) {
        try {
          const employeeName = editedTask.assignedTo;
          const employee = employees.find(e => e.name === employeeName);
          
          if (!employee) {
            errors.push(`No employee found for task "${editedTask.task}"`);
            continue;
          }
          
          const taskData = {
            title: editedTask.task.trim(),
            description: editedTask.description || '',
            priority: editedTask.priority || 'Medium',
            due_date: editedTask.date || null,
            project_id: selectedProject.id,
            assigned_by: currentUser.id,
            assigned_by_name: currentUser.name,
            status: editedTask.status || 'To-Do',
            remarks: editedTask.remarks || '',
            assigned_to_member: employee.id
          };
          
          const response = await projectAPI.createTask(taskData);
          if (response.data.success) {
            createdCount++;
          }
        } catch (err) {
          errors.push(`Error creating task "${editedTask.task}": ${err.message}`);
        }
        continue;
      }
      
      const originalTask = tasks.find(t => t.id == editedTask.id);
      if (!originalTask) continue;
      
      const isAssignedToMe = editedTask.assignedTo === currentUser.name;
      const isProjectLeadUser = currentUser.isProjectLead && currentUser.managedProjects.includes(selectedProject?.id);
      const isHR = currentUser.role === 'hr';
      
      if (editedTask.description !== originalTask.description && (isAssignedToMe || isHR)) {
        updateData.description = editedTask.description;
      }
      
      if (editedTask.status !== originalTask.status && (isProjectLeadUser || isHR)) {
        updateData.status = editedTask.status;
        if (editedTask.status === 'Completed') {
          updateData.progress = 100;
        } else if (editedTask.status === 'In Progress') {
          updateData.progress = 50;
        } else if (editedTask.status === 'Ready for Review') {
          updateData.progress = 80;
        } else if (editedTask.status === 'To-Do') {
          updateData.progress = 0;
        } else if (editedTask.status === 'Blocked') {
          updateData.progress = 0;
        }
      }
      
      if (editedTask.remarks !== originalTask.remarks && (isProjectLeadUser || isHR)) {
        updateData.remarks = editedTask.remarks;
      }
      
      if (Object.keys(updateData).length > 0) {
        try {
          await projectAPI.updateTask(editedTask.id, updateData);
          updatedCount++;
        } catch (err) {
          errors.push(`Task ${editedTask.task}: ${err.message}`);
        }
      }
    }
    
    if (updatedCount > 0 || createdCount > 0) {
      await fetchAllData();
      alert(`✅ Updated: ${updatedCount} tasks | Created: ${createdCount} new tasks`);
  
    } else {
      alert('No changes detected');
    }
    
    setIsExcelEditorOpen(false);
    setEditableTasks([]);
  };

  const updateEditableTask = (index, field, value) => {
    const updated = [...editableTasks];
    updated[index][field] = value;
    setEditableTasks(updated);
  };

  // Handle Edit Project
  const handleEditProject = (project) => {
    setSelectedProject(project);
    setEditFormData({
      name: project.name || '',
      department: project.department || '',
      manager: project.manager || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      current_phase: project.current_phase || '',
      status: project.status || 'On Track'
    });
    setIsEditModalOpen(true);
    setIsViewModalOpen(false);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      const response = await projectAPI.update(selectedProject.id, editFormData);
      if (response.data.success) {
        await fetchAllData();
        setIsEditModalOpen(false);
        alert('Project updated successfully!');
      }
    } catch (err) {
      console.error('Error updating project:', err);
      alert('Failed to update project');
    }
  };

  const handleAssignProject = (project) => {
    setSelectedProject(project);
    setAssignFormData({
      assigned_department: project.department || '',
      manager_name: project.manager || '',
      team: project.team ? project.team.map(member => member.employee_id) : []
    });
    setIsAssignModalOpen(true);
    setIsViewModalOpen(false);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await projectAPI.assignTeam(selectedProject.id, assignFormData);
      if (response.data.success) {
        await fetchAllData();
        setIsAssignModalOpen(false);
        alert('Project team assigned successfully!');
      }
    } catch (err) {
      console.error('Error assigning team:', err);
      alert('Failed to assign team');
    }
  };

  const handleTeamMemberToggle = (employeeId) => {
    setAssignFormData(prev => {
      const team = [...prev.team];
      const index = team.indexOf(employeeId);
      if (index > -1) {
        team.splice(index, 1);
      } else {
        team.push(employeeId);
      }
      return { ...prev, team };
    });
  };

  const handleStartNewCycle = async (project) => {
    try {
      const newProjectData = {
        ...project,
        name: `${project.name} - Cycle ${Math.floor(Math.random() * 100) + 1}`,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        progress: 0,
        status: 'On Track',
        phases: project.phases ? project.phases.map(phase => ({
          ...phase,
          status: 'Not Started',
          progress: 0,
          comments: ''
        })) : []
      };

      const response = await projectAPI.create(newProjectData);
      if (response.data.success) {
        await fetchAllData();
        alert('New project cycle started successfully!');
      }
    } catch (err) {
      console.error('Error starting new cycle:', err);
      alert('Failed to start new cycle');
    }
  };

  const handleEditPhase = (project, phase) => {
    setSelectedProject(project);
    setSelectedPhase(phase);
    setPhaseFormData({
      status: phase.status || 'Not Started',
      progress: phase.progress || 0,
      comments: phase.comments || ''
    });
    setIsPhaseModalOpen(true);
    setIsViewModalOpen(false);
  };

  const handleUpdatePhase = async (e, shouldClose = false) => {
    e.preventDefault();
    if (!selectedProject || !selectedPhase) return;
    
    if (!canEditTaskStatusAndRemarks(selectedProject)) {
      alert('Only Project Leads can edit phases');
      return;
    }
    
    try {
      const response = await projectAPI.updatePhase(selectedProject.id, selectedPhase.name, phaseFormData);
      if (response.data.success) {
        await fetchAllData();
        alert('Phase updated successfully!');
        if (shouldClose) {
          setIsPhaseModalOpen(false);
          setSelectedPhase(null);
        }
      }
    } catch (err) {
      console.error('Error updating phase:', err);
      alert('Failed to update phase');
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    try {
      const response = await projectAPI.delete(selectedProject.id);
      if (response.data.success) {
        setIsDeleteModalOpen(false);
        setIsViewModalOpen(false);
        await fetchAllData();
        alert('Project deleted successfully!');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project');
    }
  };

  const handleDeleteClick = (project) => {
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!canCreateProject()) {
      alert('Only HR can create projects');
      return;
    }
    if (!formData.name || !formData.department || !formData.project_lead) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const selectedLead = projectLeads.find(lead => String(lead.id) === String(formData.project_lead));
      if (!selectedLead) {
        alert('Selected project lead not found');
        return;
      }

      const projectData = {
        name: formData.name,
        department: formData.department,
        manager: selectedLead.name,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        current_phase: formData.current_phase || 'Planning',
        status: formData.status,
        description: formData.description || ''
      };

      const response = await projectAPI.create(projectData);
      if (response.data.success) {
        setFormData({ name: '', department: '', project_lead: '', start_date: '', end_date: '', current_phase: '', status: 'On Track', description: '' });
        setIsModalOpen(false);
        await fetchAllData();
        alert('Project created successfully!');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      alert(err.response?.data?.message || 'Failed to create project');
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    
    if (!teamFormData.name) {
      alert('Team name is required');
      return;
    }
    if (!teamFormData.project_id) {
      alert('Please select a project for this team');
      return;
    }
    
    const validMembers = selectedEmployees.filter(id => {
      return id && id !== 'null' && id !== 'undefined' && id !== '' && id !== null;
    });
    
    if (validMembers.length === 0) {
      alert('Please select at least one valid team member');
      return;
    }

    try {
      const teamData = {
        name: teamFormData.name,
        project_id: parseInt(teamFormData.project_id),
        team_lead_id: teamFormData.team_lead_id ? parseInt(teamFormData.team_lead_id) : null,
        description: teamFormData.description || '',
        status: 'Active',
        members: validMembers
      };
      
      const response = await projectAPI.createTeam(teamData);
      
      if (response.data.success) {
        setTeamFormData({ 
          name: '', 
          team_lead_id: '', 
          project_id: '', 
          description: '', 
          members: [] 
        });
        setSelectedEmployees([]);
        setIsTeamModalOpen(false);
        await fetchAllData();
        alert(response.data.message);
        setActiveTab('teams');
      } else {
        alert(response.data.message || 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      alert(error.response?.data?.message || 'Failed to create team');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    if (!taskFormData.title || !taskFormData.title.trim()) {
      alert('Task title is required');
      return;
    }
    if (!taskFormData.project_id) {
      alert('Project is required');
      return;
    }
    if (selectedTaskEmployees.length === 0) {
      alert('Please select at least one employee to assign this task to');
      return;
    }

    try {
      let createdCount = 0;
      let failedTasks = [];
      
      for (const userId of selectedTaskEmployees) {
        const taskData = {
          title: taskFormData.title.trim(),
          description: taskFormData.description?.trim() || '',
          priority: taskFormData.priority || 'Medium',
          estimated_hours: Number(taskFormData.estimated_hours) || 0,
          due_date: taskFormData.due_date || null,
          project_id: Number(taskFormData.project_id),
          team_id: taskFormData.team_id ? Number(taskFormData.team_id) : null,
          assigned_by: currentUser?.id ? Number(currentUser.id) : null,
          assigned_by_name: currentUser?.name || null,
          status: 'To-Do',
          review_status: 'Not Reviewed',
          progress: 0,
          assigned_to_member: Number(userId)
        };
        
        const response = await projectAPI.createTask(taskData);
        
        if (response.data.success) {
          createdCount++;
        } else {
          failedTasks.push({ id: userId, reason: response.data.message });
        }
      }
      
      setTaskFormData({ 
        title: '', 
        description: '', 
        priority: 'Medium', 
        estimated_hours: 0, 
        due_date: '', 
        project_id: selectedProject?.id || '',
        team_id: '',
        assigned_to_members: [] 
      });
      setSelectedTaskEmployees([]);
      setIsTaskModalOpen(false);
      
      await fetchAllData();
      
      if (createdCount > 0) {
        alert(`${createdCount} task(s) created successfully!`);
        
      } else {
        alert('Failed to create tasks. Check console for details.');
      }
    } catch (err) {
      console.error('Error creating task:', err);
      alert(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleEmployeeSelection = (employeeId) => {
    if (!employeeId || employeeId === 'null' || employeeId === 'undefined' || employeeId === '') {
      return;
    }
    const id = String(employeeId).trim();
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (project) => {
    const statusMap = {
      'On Track': 'proj-status-active',
      'Delayed': 'proj-status-inactive',
      'At Risk': 'proj-status-inactive',
      'Completed': 'proj-status-active',
      'On Hold': 'proj-status-inactive'
    };
    return (
      <span className={`proj-status-badge ${statusMap[project.status] || 'proj-status-inactive'}`}>
        {project.status?.toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  const getPhaseStatusBadge = (status) => {
    const statusConfig = {
      'Completed': 'proj-status-active',
      'In Progress': 'proj-status-active',
      'Not Started': 'proj-status-inactive',
      'On Hold': 'proj-status-inactive',
      'Review': 'proj-status-active'
    };
    return (
      <span className={`proj-status-badge ${statusConfig[status] || 'proj-status-inactive'}`}>
        {status?.toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  const getTaskPriorityBadge = (priority) => {
    const priorityMap = { 'High': 'priority-high', 'Medium': 'priority-medium', 'Low': 'priority-low' };
    return <span className={`task-priority-badge ${priorityMap[priority]}`}>{priority}</span>;
  };

  const getTaskStatusIcon = (status) => {
    switch(status) {
      case 'Completed': return <FaCheckCircle style={{ color: '#28a745' }} />;
      case 'In Progress': return <FaHourglassHalf style={{ color: '#ffc107' }} />;
      case 'To-Do': return <FaClock style={{ color: '#6c757d' }} />;
      case 'Blocked': return <FaExclamationTriangle style={{ color: '#dc3545' }} />;
      default: return null;
    }
  };

  const handleExportProjects = () => {
    try {
      if (filteredProjects.length === 0) {
        alert('No projects to export!');
        return;
      }

      const exportData = filteredProjects.map(project => ({
        'Project Name': project.name,
        'Department': project.department,
        'Project Lead': project.manager,
        'Start Date': formatDate(project.start_date),
        'End Date': formatDate(project.end_date),
        'Current Phase': project.current_phase,
        'Progress': `${project.progress}%`,
        'Status': project.status
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
      XLSX.writeFile(workbook, `Projects_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      alert(`Exported ${filteredProjects.length} projects successfully!`);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="proj-management-section">
        <div className="proj-loading">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="proj-management-section">
        <div className="proj-error">{error}</div>
        <button onClick={fetchAllData} className="proj-retry-btn">Try Again</button>
      </div>
    );
  }

  return (
    <div className="proj-management-section" id="proj-management-main">
      {/* Header */}
      <div className="proj-management-header">
        <h2 id="proj-management-title">
          Project Management System
          {currentUser.role === 'hr' && <span className="proj-hr-badge">HR Access</span>}
          {currentUser.isProjectLead && <span className="proj-lead-badge">Project Lead</span>}
        </h2>
        <div className="proj-user-info">
          <span className="proj-user-name">{currentUser.name}</span>
          <span className="proj-user-role">
            {currentUser.role === 'hr' ? 'HR Administrator' : (currentUser.isProjectLead ? 'Project Lead' : 'Team Member')}
          </span>
        </div>
        <div className="proj-header-actions">
          <button className={`proj-tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
            <FaTasks /> Projects ({userProjects.length})
          </button>
          {canViewTeamManagement() && (
            <button className={`proj-tab-btn ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>
              <FaUsers /> Teams ({userTeams.filter(t => currentUser.managedProjects.includes(t.project_id)).length})
            </button>
          )}
          <button className={`proj-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
            <FaTasks /> Tasks ({userTasks.length})
          </button>
          {canCreateProject() && activeTab === 'projects' && (
            <button className="proj-add-btn" onClick={() => setIsModalOpen(true)}><FaPlus /> Create Project</button>
          )}
          {canCreateTeam() && activeTab === 'teams' && (
            <button className="proj-add-btn" onClick={() => setIsTeamModalOpen(true)}><FaUsers /> Create Team</button>
          )}
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="proj-dashboard-stats">
        <div className="proj-stat-card"><div className="proj-stat-number">{dashboardStats.totalProjects}</div><div className="proj-stat-label">Total Projects</div></div>
        <div className="proj-stat-card"><div className="proj-stat-number">{dashboardStats.activeProjects}</div><div className="proj-stat-label">Active Projects</div></div>
        <div className="proj-stat-card"><div className="proj-stat-number">{dashboardStats.delayedProjects}</div><div className="proj-stat-label">Delayed Projects</div></div>
        <div className="proj-stat-card"><div className="proj-stat-number">{userTeams.length}</div><div className="proj-stat-label">Teams</div></div>
        <div className="proj-stat-card"><div className="proj-stat-number">{userTasks.length}</div><div className="proj-stat-label">My Tasks</div></div>
      </div>

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="proj-table-container">
          <div className="proj-table-header">
            <h3>Project Directory</h3>
            <div className="proj-table-actions">
              <input type="text" placeholder="Search projects..." className="proj-filter-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <select className="proj-filter-select" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                <option value="">All Status</option>
                {projectStatuses.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
              <select className="proj-filter-select" value={filters.department} onChange={(e) => handleFilterChange('department', e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
              
            </div>
          </div>
          <div className="proj-table-wrapper">
            <table className="proj-main-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Department</th>
                  <th>Project Lead</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Current Phase</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map(project => (
                  <tr key={project.id}>
                    <td>{project.name}</td>
                    <td>{project.department}</td>
                    <td>{project.manager}</td>
                    <td>{formatDate(project.start_date)}</td>
                    <td>{formatDate(project.end_date)}</td>
                    <td>{project.current_phase}</td>
                    <td>{project.progress}%</td>
                    <td>{getStatusBadge(project)}</td>
                    <td style={{ minWidth: '120px' }}>
                      <button onClick={() => { setSelectedProject(project); setIsViewModalOpen(true); }} className="proj-action-btn" title="View Details">
                        <FaEye />
                      </button>
                      {canEditProject() && (
                        <button onClick={() => { setSelectedProject(project); setIsDeleteModalOpen(true); }} className="proj-action-btn" title="Delete Project" style={{ color: '#dc3545' }}>
                          <FaTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && canViewTeamManagement() && (
        <div className="proj-table-container">
          <div className="proj-table-header">
            <h3>Teams ({userTeams.filter(t => currentUser.managedProjects.includes(t.project_id)).length})</h3>
            <div className="proj-table-actions">
              {canCreateTeam() && <button className="proj-add-btn" onClick={() => setIsTeamModalOpen(true)}><FaUsers /> Create Team</button>}
            </div>
          </div>
          <div className="proj-table-wrapper">
            {userTeams.filter(t => currentUser.managedProjects.includes(t.project_id)).length === 0 ? (
              <div className="proj-empty-state">
                <div className="proj-empty-icon">👥</div>
                <p>No teams found. Create a team to get started!</p>
              </div>
            ) : (
              <table className="proj-main-table">
                <thead>
                  <tr>
                    <th>Team Name</th>
                    <th>Project</th>
                    <th>Team Lead</th>
                    <th>Members</th>
                    <th>Member Count</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userTeams.filter(team => currentUser.managedProjects.includes(team.project_id)).map(team => {
                    const project = projects.find(p => p.id === team.project_id);
                    const membersList = team.members || [];
                    return (
                      <tr key={team.id}>
                        <td><strong>{team.name}</strong></td>
                        <td>{project ? <span className="project-badge">{project.name}</span> : <span className="text-muted">Not Assigned</span>}</td>
                        <td>{team.team_lead_name || 'Not Assigned'}</td>
                        <td>
                          <div className="team-members-list">
                            {membersList && membersList.length > 0 ? (
                              membersList.map((member, index) => (
                                <div key={member.id || index} className="member-item">
                                  <span className="member-name">{member.name || 'Unknown'}</span>
                                  <small className="member-position">{member.position || 'Member'}</small>
                                </div>
                              ))
                            ) : (
                              <span className="text-muted">No members assigned</span>
                            )}
                          </div>
                        </td>
                        <td>{membersList.length || team.member_count || 0}</td>
                        <td>
                          <span className={`team-status-badge ${team.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                            {team.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ minWidth: '120px' }}>
                          {canDeleteTeam(team) && (
                            <button 
                              onClick={() => { setSelectedTeam(team); setIsDeleteTeamModalOpen(true); }} 
                              className="proj-action-btn" 
                              title="Delete Team" 
                              style={{ color: '#dc3545' }}
                            >
                              <FaTrash />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tasks Tab - GROUPED VIEW */}
      {activeTab === 'tasks' && (
        <div className="proj-table-container">
          <div className="proj-table-header">
            <h3>Tasks (Grouped View)</h3>
            <div className="proj-table-actions">
              <select 
                className="proj-filter-select" 
                value={selectedProject?.id || ''} 
                onChange={(e) => {
                  const projectId = e.target.value;
                  if (projectId) {
                    const project = userProjects.find(p => p.id == projectId);
                    setSelectedProject(project);
                  } else {
                    setSelectedProject(null);
                  }
                }}
                style={{ minWidth: '250px', padding: '8px', borderRadius: '4px', border: '1px solid var(--card-border,#ddd)' }}
              >
                <option value="">-- Select a Project --</option>
                {userProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              
              <button 
                className={`proj-filter-btn ${showMonthFilter ? 'active' : ''}`}
                onClick={() => setShowMonthFilter(!showMonthFilter)}
                style={{
                  padding: '8px 12px',
                  background: showMonthFilter ? '#4caf50' : '#6c757d',
                  color: 'var(--card-bg,#fff)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                📅 {showMonthFilter ? 'Filter ON' : 'Filter OFF'}
              </button>
              
              {showMonthFilter && (
                <>
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="proj-filter-select"
                    style={{ padding: '8px', borderRadius: '4px' }}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>{getMonthName(i)}</option>
                    ))}
                  </select>
                  
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="proj-filter-select"
                    style={{ padding: '8px', borderRadius: '4px' }}
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </>
              )}
              
              {canCreateTask(selectedProject?.id) && (
                <button className="proj-add-btn" onClick={() => setIsTaskModalOpen(true)}><FaPlus /> Create Task</button>
              )}
              
              {selectedProject && (
                <button 
                  className="proj-export-btn" 
                  onClick={() => exportFilteredMonthReport(selectedProject)}
                  style={{ background: '#17a2b8' }}
                >
                  <FaFileExcel /> Export {showMonthFilter ? getMonthName(selectedMonth) : 'Full'} Report
                </button>
              )}
            </div>
          </div>
          
          {selectedProject && (
            <div style={{ 
              padding: '15px 20px', 
              background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
              borderBottom: '1px solid var(--card-border,#e9ecef)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ fontSize: '13px', color: 'var(--theme-text-muted,#666)' }}>
                Total Task Assignments: {userTasks.filter(t => t.project_id == selectedProject.id).length} | 
                Unique Tasks: {getGroupedTasks(userTasks.filter(t => t.project_id == selectedProject.id)).length} |
                Completed: {userTasks.filter(t => t.project_id == selectedProject.id && t.status === 'Completed').length} |
                In Progress: {userTasks.filter(t => t.project_id == selectedProject.id && t.status === 'In Progress').length}
                {showMonthFilter && (
                  <span style={{ marginLeft: '10px', padding: '4px 8px', background: 'rgba(37,99,235,0.1)', borderRadius: '4px' }}>
                    Showing: {getMonthName(selectedMonth)} {selectedYear}
                  </span>
                )}
              </div>
            </div>
          )}
          
          <div className="proj-table-wrapper">
            {!selectedProject ? (
              <div className="proj-empty-state">
                <div className="proj-empty-icon">📋</div>
                <p>Please select a project from the dropdown above to view its tasks.</p>
              </div>
            ) : (() => {
              let projectTasks = userTasks.filter(task => task.project_id == selectedProject.id);
              
              if (showMonthFilter) {
                projectTasks = filterTasksByMonth(projectTasks, selectedMonth, selectedYear);
              }
              
              const groupedTasks = getGroupedTasks(projectTasks);
              
              if (groupedTasks.length === 0) {
                return (
                  <div className="proj-empty-state">
                    <div className="proj-empty-icon">📋</div>
                    <p>No tasks found for project: <strong>{selectedProject.name}</strong></p>
                    {showMonthFilter && (
                      <p style={{ fontSize: '13px', color: 'var(--theme-text-muted,#666)' }}>
                        Filter applied: {getMonthName(selectedMonth)} {selectedYear}
                      </p>
                    )}
                    {canCreateTask(selectedProject?.id) && (
                      <button className="proj-add-btn" onClick={() => setIsTaskModalOpen(true)} style={{ marginTop: '15px' }}>
                        <FaPlus /> Create First Task
                      </button>
                    )}
                  </div>
                );
              }
              
              return (
                <table className="proj-main-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Task/Activity</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Remarks</th>
                      <th>Assigned To</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedTasks.map(task => (
                      <tr key={`${task.project_id}_${task.title}`}>
                        <td style={{ whiteSpace: 'nowrap' }}>{task.created_at ? formatDate(task.created_at) : formatDate(new Date())}</td>
                        <td>{selectedProject?.name}</td>
                        <td>
                          <strong>{task.title}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--theme-text-muted,#666)', marginTop: '4px' }}>
                            Priority: {getTaskPriorityBadge(task.priority)}
                          </div>
                          {task.due_date && (
                            <div style={{ fontSize: '11px', color: 'var(--theme-text-muted,#666)' }}>Due: {formatDate(task.due_date)}</div>
                          )}
                        </td>
                        <td style={{ minWidth: '250px' }}>
                          {task.description && task.description !== 'No description' ? (
                            <div className="description-multiple">
                              {task.description.split('\n').map((line, idx) => (
                                <div key={idx} style={{ marginBottom: '4px', fontSize: '12px' }}>
                                  {line}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--theme-text-muted,#999)', fontStyle: 'italic' }}>No description</span>
                          )}
                        </td>
                        <td style={{ minWidth: '150px' }}>
                          <div className="task-status-text">
                            {getTaskStatusIcon(task.status)}
                            {task.status}
                          </div>
                        </td>
                        <td style={{ minWidth: '200px' }}>{task.remarks || <span style={{ color: 'var(--theme-text-muted,#999)', fontStyle: 'italic' }}>No remarks</span>}</td>
                        <td style={{ minWidth: '200px' }}>
                          <div className="assigned-employees-list">
                            {task.assigned_employees.map((emp, idx) => (
                              <span key={idx} className="assigned-employee-badge">
                                {emp.name}
                              </span>
                            ))}
                            <div style={{ fontSize: '11px', color: 'var(--theme-text-muted,#666)', marginTop: '4px' }}>
                              ({task.employee_count} employee{task.employee_count > 1 ? 's' : ''})
                            </div>
                          </div>
                        </td>
                        <td style={{ minWidth: '150px' }}>
           <button 
  onClick={() => {
    // Find ALL tasks with this title for the selected project
    const allTasksForThisTitle = tasks.filter(t => 
      t.title === task.title && t.project_id == selectedProject.id
    );
    if (allTasksForThisTitle.length > 0) {
      // Take the first task as the main one (has the main progress/status)
      const mainTask = { ...allTasksForThisTitle[0] };
      // Add all assigned employees
      mainTask.assigned_employees = allTasksForThisTitle.map(t => ({
        id: t.assigned_to_member,
        name: t.assigned_to_name || 'Not Assigned'
      }));
      // Store all assignments for reference
      mainTask.task_assignments = allTasksForThisTitle;
      
      setSelectedTask(mainTask);
      setIsTaskDetailsModalOpen(true);
    }
  }} 
  className="proj-action-btn" 
  title="View Details"
>
  <FaEye />
</button>
                          <button 
                            onClick={() => {
                              const originalTask = tasks.find(t => t.title === task.title && t.project_id == selectedProject.id);
                              if (originalTask) {
                                const taskDate = originalTask.created_at ? new Date(originalTask.created_at) : (originalTask.due_date ? new Date(originalTask.due_date) : new Date());
                                const month = taskDate.getMonth();
                                const year = taskDate.getFullYear();
                                openFullMonthEditor(selectedProject, month, year);
                              }
                            }} 
                            className="proj-action-btn" 
                            title="Edit Full Month View" 
                            style={{ color: '#4caf50' }}
                          >
                            <FaFileExcel /> Month View
                          </button>
                          {canDeleteTask(task) && (
                            <button 
                              onClick={() => {
                                const originalTask = tasks.find(t => t.title === task.title && t.project_id == selectedProject.id);
                                if (originalTask) {
                                  setSelectedTask(originalTask);
                                  setIsDeleteTaskModalOpen(true);
                                }
                              }} 
                              className="proj-action-btn" 
                              title="Delete Task" 
                              style={{ color: '#dc3545' }}
                            >
                              <FaTrash />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}

      {/* Excel Editor Modal - Full Month View */}
      {isExcelEditorOpen && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content" style={{ maxWidth: '95%', width: '1400px', maxHeight: '85vh' }}>
            <div className="proj-modal-header">
              <h2>📅 Edit Tasks - {selectedProject?.name} - {getMonthName(selectedMonth)} {selectedYear}</h2>
              <button className="proj-close-btn" onClick={() => setIsExcelEditorOpen(false)}>×</button>
            </div>
            
            <div style={{ padding: '10px', background: 'var(--theme-surface-muted,#f8f9fa)', borderBottom: '1px solid var(--card-border,#dee2e6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '12px', color: 'var(--theme-text-muted,#666)' }}>
                📊 Showing all days of {getMonthName(selectedMonth)} {selectedYear}
                {editableTasks.filter(t => t.id).length} existing tasks, {editableTasks.filter(t => !t.id && t.task).length} new tasks
                {currentUser.isProjectLead && <span style={{ marginLeft: '10px', color: '#ff9800' }}>🔓 You can edit Status & Remarks for all tasks</span>}
                {!currentUser.isProjectLead && currentUser.role !== 'hr' && <span style={{ marginLeft: '10px', color: '#4caf50' }}>✏️ You can only edit your own task descriptions</span>}
              </div>
              <button onClick={exportCurrentMonthExcel} style={{ padding: '8px 16px', background: '#28a745', color: 'var(--card-bg,#fff)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                <FaDownload /> Export Full Month
              </button>
            </div>
            
            <div style={{ padding: '20px', overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto' }}>
              <table className="proj-main-table" style={{ minWidth: '1200px' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '100px' }}>Date</th>
                    <th style={{ minWidth: '100px' }}>Day</th>
                    <th style={{ minWidth: '200px' }}>Task/Activity</th>
                    <th style={{ minWidth: '250px' }}>Description</th>
                    <th style={{ minWidth: '120px' }}>Status</th>
                    <th style={{ minWidth: '200px' }}>Remarks</th>
                    <th style={{ minWidth: '100px' }}>Priority</th>
                    <th style={{ minWidth: '120px' }}>Due Date</th>
                    <th style={{ minWidth: '150px' }}>Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {editableTasks.map((task, index) => {
                    const isAssignedToMe = task.assignedTo === currentUser.name;
                    const isProjectLeadUser = currentUser.isProjectLead && currentUser.managedProjects.includes(selectedProject?.id);
                    const isHR = currentUser.role === 'hr';
                    const isWeekend = new Date(task.date).getDay() === 0 || new Date(task.date).getDay() === 6;
                    
                    const canEditTaskName = isProjectLeadUser || isHR;
                    const canEditDescription = isAssignedToMe || isHR;
                    const canEditStatus = isProjectLeadUser || isHR;
                    const canEditRemarks = isProjectLeadUser || isHR;
                    const canEditPriority = isProjectLeadUser || isHR;
                    const canEditAssignedTo = isProjectLeadUser || isHR;
                    
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayName = dayNames[new Date(task.date).getDay()];
                    
                    return (
                      <tr key={index} style={isWeekend ? { background: 'rgba(220,38,38,0.06)' } : (!task.id && !task.task ? { background: 'var(--theme-surface-muted,#f9f9f9)' } : {})}>
                        <td style={{ whiteSpace: 'nowrap' }}>{task.displayDate}</td>
                        <td style={{ whiteSpace: 'nowrap', color: isWeekend ? '#dc3545' : '#666' }}>{dayName}</td>
                        <td>
                          {canEditTaskName ? (
                            <input type="text" value={task.task} onChange={(e) => updateEditableTask(index, 'task', e.target.value)} placeholder="Enter task name..." style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid var(--card-border,#ddd)' }} />
                          ) : (
                            <strong>{task.task || <span style={{ color: 'var(--theme-text-muted,#999)' }}>No task</span>}</strong>
                          )}
                          <div style={{ fontSize: '11px', color: 'var(--theme-text-muted,#666)', marginTop: '4px' }}>
                            Priority: {getTaskPriorityBadge(task.priority)}
                          </div>
                        </td>
                        <td>
                          {canEditDescription ? (
                            <textarea value={task.description} onChange={(e) => updateEditableTask(index, 'description', e.target.value)} rows="2" style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid var(--card-border,#ddd)' }} placeholder="What did you do?" />
                          ) : (
                            <div style={{ padding: '5px', background: 'var(--theme-surface-muted,#f5f5f5)', borderRadius: '4px', minHeight: '50px' }}>{task.description || <span style={{ color: 'var(--theme-text-muted,#999)' }}>No description</span>}</div>
                          )}
                        </td>
                        <td>
                          {canEditStatus ? (
                            <select value={task.status} onChange={(e) => updateEditableTask(index, 'status', e.target.value)} style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid var(--card-border,#ddd)' }}>
                              {taskStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <div className="task-status-text">{getTaskStatusIcon(task.status)} {task.status}</div>
                          )}
                        </td>
                        <td>
                          {canEditRemarks ? (
                            <textarea value={task.remarks} onChange={(e) => updateEditableTask(index, 'remarks', e.target.value)} rows="2" style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid var(--card-border,#ddd)' }} placeholder="Add remarks here..." />
                          ) : (
                            <div style={{ padding: '5px', background: 'var(--theme-surface-muted,#f5f5f5)', borderRadius: '4px', minHeight: '50px' }}>{task.remarks || <span style={{ color: 'var(--theme-text-muted,#999)' }}>No remarks</span>}</div>
                          )}
                        </td>
                        <td>{getTaskPriorityBadge(task.priority)}</td>
                        <td>{task.dueDate}</td>
                        <td>
                          {canEditAssignedTo ? (
                            <input type="text" value={task.assignedTo} onChange={(e) => updateEditableTask(index, 'assignedTo', e.target.value)} placeholder="Employee name" style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid var(--card-border,#ddd)' }} />
                          ) : (
                            task.assignedTo || 'Not Assigned'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="proj-form-actions" style={{ padding: '15px', borderTop: '1px solid var(--card-border,#e9ecef)' }}>
              <button onClick={() => setIsExcelEditorOpen(false)} className="proj-cancel-btn">Cancel</button>
              <button onClick={saveExcelEdits} className="proj-submit-btn">Save All Changes</button>
            </div>
          </div>
        </div>
      )}

            {/* View Project Details Modal - READ ONLY (Only Project Information) */}
      {isViewModalOpen && selectedProject && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content">
            <div className="proj-modal-header">
              <h2>Project Details - {selectedProject.name}</h2>
              <button className="proj-close-btn" onClick={() => setIsViewModalOpen(false)}>×</button>
            </div>
            <div className="proj-details-content">
              {/* Project Information Section */}
              <div className="proj-form-section">
                <h3 className="proj-section-title"><FaBell /> Project Information</h3>
                <div className="proj-details-grid">
                  <div className="proj-detail-item">
                    <label>Project ID</label>
                    <span>PROJ{String(selectedProject.id).padStart(3, '0')}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Project Name</label>
                    <span>{selectedProject.name}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Department</label>
                    <span>{selectedProject.department || 'Not specified'}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Project Lead</label>
                    <span>{selectedProject.manager || 'Not assigned'}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Start Date</label>
                    <span>{formatDate(selectedProject.start_date)}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>End Date</label>
                    <span>{formatDate(selectedProject.end_date)}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Current Phase</label>
                    <span>{selectedProject.current_phase || 'Planning'}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Status</label>
                    <span>{getStatusBadge(selectedProject)}</span>
                  </div>
                  {selectedProject.description && (
                    <div className="proj-detail-item full-width">
                      <label>Description</label>
                      <span>{selectedProject.description}</span>
                    </div>
                  )}
                </div>
              </div>

           

              {/* Close Button */}
              <div className="proj-form-actions">
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="proj-cancel-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {isDeleteModalOpen && selectedProject && canEditProject() && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content">
            <div className="proj-modal-header">
              <h2>Delete Project</h2>
              <button className="proj-close-btn" onClick={() => setIsDeleteModalOpen(false)}>×</button>
            </div>
            <div className="proj-delete-confirm">
              <div className="emp-delete-icon"><FaExclamationTriangle /></div>
              <h3>Delete {selectedProject.name}?</h3>
              <p>Are you sure you want to delete this project? This action cannot be undone.</p>
              <div className="proj-delete-actions">
                <button onClick={() => setIsDeleteModalOpen(false)} className="proj-cancel-btn">Cancel</button>
                <button onClick={handleDeleteProject} className="proj-delete-btn">Delete Project</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && selectedProject && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content">
            <div className="proj-modal-header">
              <h2>Edit Project</h2>
              <button className="proj-close-btn" onClick={() => setIsEditModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateProject} className="proj-form">
              <div className="proj-form-section">
                <h3 className="proj-section-title">Project Information</h3>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Project Name *</label>
                    <input type="text" name="name" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} required />
                  </div>
                  <div className="proj-form-group">
                    <label>Department *</label>
                    <select name="department" value={editFormData.department} onChange={(e) => setEditFormData({...editFormData, department: e.target.value})} required>
                      <option value="">Select Department</option>
                      {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                </div>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Project Lead *</label>
                    <select name="manager" value={editFormData.manager} onChange={(e) => setEditFormData({...editFormData, manager: e.target.value})} required>
                      <option value="">Select Project Lead</option>
                      {projectLeads.map(lead => <option key={lead.id} value={lead.name}>{lead.name}</option>)}
                    </select>
                  </div>
                  <div className="proj-form-group">
                    <label>Status</label>
                    <select name="status" value={editFormData.status} onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}>
                      {projectStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                </div>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Start Date</label>
                    <input type="date" name="start_date" value={editFormData.start_date} onChange={(e) => setEditFormData({...editFormData, start_date: e.target.value})} />
                  </div>
                  <div className="proj-form-group">
                    <label>End Date</label>
                    <input type="date" name="end_date" value={editFormData.end_date} onChange={(e) => setEditFormData({...editFormData, end_date: e.target.value})} />
                  </div>
                </div>
                <div className="proj-form-group">
                  <label>Current Phase</label>
                  <select name="current_phase" value={editFormData.current_phase} onChange={(e) => setEditFormData({...editFormData, current_phase: e.target.value})}>
                    <option value="">Select Phase</option>
                    {phases.map(phase => <option key={phase} value={phase}>{phase}</option>)}
                  </select>
                </div>
              </div>
              <div className="proj-form-actions">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="proj-cancel-btn">Cancel</button>
                <button type="submit" className="proj-submit-btn">Update Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Project Modal */}
      {isAssignModalOpen && selectedProject && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content proj-large-modal">
            <div className="proj-modal-header">
              <h2>Assign Project Team - {selectedProject.name}</h2>
              <button className="proj-close-btn" onClick={() => setIsAssignModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAssignSubmit} className="proj-form">
              <div className="proj-form-section">
                <h3 className="proj-section-title">Team Members</h3>
                <div className="proj-team-selection" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {employees.filter(emp => emp.role_name?.toLowerCase() !== 'hr').map(employee => (
                    <div key={employee.id} className="proj-team-member-checkbox" style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={assignFormData.team.includes(employee.id)} onChange={() => handleTeamMemberToggle(employee.id)} />
                        <span>{employee.name} ({employee.department || 'No Dept'}) - {employee.position || 'Employee'}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="proj-form-actions">
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="proj-cancel-btn">Cancel</button>
                <button type="submit" className="proj-submit-btn">Assign Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Phase Modal */}
      {isPhaseModalOpen && selectedProject && selectedPhase && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content">
            <div className="proj-modal-header">
              <h2>Edit Phase - {selectedPhase.name}</h2>
              <button className="proj-close-btn" onClick={() => setIsPhaseModalOpen(false)}>×</button>
            </div>
            <form onSubmit={(e) => handleUpdatePhase(e, true)} className="proj-form">
              <div className="proj-form-section">
                <h3 className="proj-section-title">Phase Information</h3>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Status</label>
                    <select name="status" value={phaseFormData.status} onChange={(e) => setPhaseFormData({...phaseFormData, status: e.target.value})}>
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                  <div className="proj-form-group">
                    <label>Progress (%)</label>
                    <input type="number" name="progress" value={phaseFormData.progress} onChange={(e) => setPhaseFormData({...phaseFormData, progress: e.target.value})} min="0" max="100" />
                  </div>
                </div>
                <div className="proj-form-group">
                  <label>Comments</label>
                  <textarea name="comments" value={phaseFormData.comments} onChange={(e) => setPhaseFormData({...phaseFormData, comments: e.target.value})} rows="3" placeholder="Enter phase comments or updates..." />
                </div>
              </div>
              <div className="proj-form-actions">
                <button type="button" onClick={() => setIsPhaseModalOpen(false)} className="proj-cancel-btn">Cancel</button>
                <button type="submit" className="proj-submit-btn">Update Phase</button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Task Details Modal - Shows All Assigned Employees with Single Progress */}
      {isTaskDetailsModalOpen && selectedTask && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content proj-large-modal">
            <div className="proj-modal-header">
              <h2>Task Details - {selectedTask.title}</h2>
              <button className="proj-close-btn" onClick={() => setIsTaskDetailsModalOpen(false)}>×</button>
            </div>
            <div className="proj-details-content">
              <div className="proj-form-section">
                <h3 className="proj-section-title"><FaTasks /> Task Information</h3>
                <div className="proj-details-grid">
                  <div className="proj-detail-item">
                    <label>Task Title</label>
                    <span>{selectedTask.title}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Project</label>
                    <span>{selectedTask.project_name || selectedProject?.name || 'N/A'}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Priority</label>
                    <span>{getTaskPriorityBadge(selectedTask.priority)}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Due Date</label>
                    <span>{formatDate(selectedTask.due_date)}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Assigned Employees</label>
                    <span>
                      {selectedTask.assigned_employees?.map((emp, idx) => (
                        <span key={idx} className="assigned-employee-badge" style={{ marginRight: '5px', display: 'inline-block', background: 'rgba(37,99,235,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                          👤 {emp.name}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Single Progress for the Task - Editable by Project Lead */}
              <div className="proj-form-section">
                <h3 className="proj-section-title">Task Progress</h3>
                <div className="proj-detail-item full-width">
                  {canEditTaskStatusAndRemarks(selectedTask) ? (
                    <div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="10"
                        value={selectedTask.progress || 0}
                        onChange={async (e) => {
                          const newProgress = parseInt(e.target.value);
                          // Update local state immediately
                          setSelectedTask(prev => ({ ...prev, progress: newProgress }));
                          // Update all assignments for this task
                          if (selectedTask.task_assignments) {
                            for (const assignment of selectedTask.task_assignments) {
                              try {
                                await projectAPI.updateTask(assignment.id, { progress: newProgress });
                                setTasks(prev => prev.map(t => 
                                  t.id === assignment.id ? { ...t, progress: newProgress } : t
                                ));
                              } catch (err) {
                                console.error('Failed to update progress for assignment', assignment.id);
                              }
                            }
                          } else {
                            try {
                              await projectAPI.updateTask(selectedTask.id, { progress: newProgress });
                              setTasks(prev => prev.map(t => 
                                t.id === selectedTask.id ? { ...t, progress: newProgress } : t
                              ));
                            } catch (err) {
                              alert('Failed to update progress');
                            }
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                      <div style={{ textAlign: 'center', marginTop: '8px', fontWeight: 'bold' }}>
                        {selectedTask.progress || 0}% Complete
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="progress-bar" style={{
                        width: '100%',
                        background: 'var(--theme-surface-muted,#e0e0e0)',
                        borderRadius: '4px',
                        height: '20px'
                      }}>
                        <div style={{ 
                          width: `${selectedTask.progress || 0}%`, 
                          background: '#4caf50', 
                          borderRadius: '4px',
                          height: '100%',
                          textAlign: 'center',
                          color: 'var(--card-bg,#fff)',
                          fontSize: '12px',
                          lineHeight: '20px'
                        }}>
                          {selectedTask.progress || 0}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status - Single status for the task */}
              <div className="proj-form-section">
                <h3 className="proj-section-title">Status</h3>
                <div className="proj-detail-item full-width">
                  {canEditTaskStatusAndRemarks(selectedTask) ? (
                    <select 
                      value={selectedTask.status} 
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        const updateData = { status: newStatus };
                        if (newStatus === 'Completed') {
                          updateData.progress = 100;
                        } else if (newStatus === 'In Progress') {
                          updateData.progress = 50;
                        } else if (newStatus === 'Ready for Review') {
                          updateData.progress = 80;
                        } else {
                          updateData.progress = 0;
                        }
                        
                        try {
                          await projectAPI.updateTask(selectedTask.id, updateData);
                          const updatedTask = { ...selectedTask, ...updateData };
                          setSelectedTask(updatedTask);
                          setTasks(prev => prev.map(t => 
                            t.id === selectedTask.id ? { ...t, ...updateData } : t
                          ));
                          alert('Status updated successfully!');
                        } catch (err) {
                          alert('Failed to update status');
                        }
                      }}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px' }}
                    >
                      {taskStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  ) : (
                    <span>{getTaskStatusIcon(selectedTask.status)} {selectedTask.status}</span>
                  )}
                </div>
              </div>

              

    

            

              <div className="proj-form-actions">
                <button
                  type="button"
                  onClick={() => setIsTaskDetailsModalOpen(false)}
                  className="proj-cancel-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content">
            <div className="proj-modal-header">
              <h2>Create New Project</h2>
              <button className="proj-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmitProject} className="proj-form">
              <div className="proj-form-section">
                <h3 className="proj-section-title">Project Information</h3>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Project Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Enter project name" />
                  </div>
                  <div className="proj-form-group">
                    <label>Department *</label>
                    <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} required>
                      <option value="">Select Department</option>
                      {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                </div>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Project Lead *</label>
                    <select value={formData.project_lead} onChange={(e) => setFormData({...formData, project_lead: e.target.value})} required>
                      <option value="">Select Project Lead</option>
                      {projectLeads.map(lead => <option key={lead.id} value={lead.id}>{lead.name} - {lead.position || 'Employee'}</option>)}
                    </select>
                  </div>
                  <div className="proj-form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      {projectStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                </div>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Start Date</label>
                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} />
                  </div>
                  <div className="proj-form-group">
                    <label>End Date</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} />
                  </div>
                </div>
                <div className="proj-form-group">
                  <label>Current Phase</label>
                  <select value={formData.current_phase} onChange={(e) => setFormData({...formData, current_phase: e.target.value})}>
                    <option value="">Select Phase</option>
                    {phases.map(phase => <option key={phase} value={phase}>{phase}</option>)}
                  </select>
                </div>
                <div className="proj-form-group">
                  <label>Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="3" placeholder="Enter project description..." />
                </div>
              </div>
              <div className="proj-form-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="proj-cancel-btn">Cancel</button>
                <button type="submit" className="proj-submit-btn">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {isTeamModalOpen && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content proj-large-modal">
            <div className="proj-modal-header">
              <h2>Create New Team</h2>
              <button className="proj-close-btn" onClick={() => { setIsTeamModalOpen(false); setSelectedEmployees([]); }}>×</button>
            </div>
            <form onSubmit={handleCreateTeam} className="proj-form">
              <div className="proj-form-section">
                <h3 className="proj-section-title"><FaUsers /> Team Information</h3>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Team Name *</label>
                    <input type="text" value={teamFormData.name} onChange={(e) => setTeamFormData({...teamFormData, name: e.target.value})} required placeholder="Enter team name" />
                  </div>
                  <div className="proj-form-group">
                    <label>Project *</label>
                    <select value={teamFormData.project_id} onChange={(e) => setTeamFormData({...teamFormData, project_id: e.target.value})} required>
                      <option value="">Select Project</option>
                      {userProjects.filter(p => currentUser.managedProjects.includes(p.id)).map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Team Lead</label>
                    <select value={teamFormData.team_lead_id} onChange={(e) => setTeamFormData({...teamFormData, team_lead_id: e.target.value})}>
                      <option value="">Select Team Lead (Optional)</option>
                      {employees.filter(emp => emp.role_name?.toLowerCase() !== 'hr').map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} - {emp.position || 'Employee'}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="proj-form-group">
                  <label>Description</label>
                  <textarea value={teamFormData.description} onChange={(e) => setTeamFormData({...teamFormData, description: e.target.value})} rows="2" placeholder="Enter team description..." />
                </div>
              </div>
              <div className="proj-form-section">
                <h3 className="proj-section-title"><FaUserPlus /> Select Team Members *</h3>
                <div className="proj-team-selection" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {employees.filter(emp => emp.role_name?.toLowerCase() !== 'hr').map(employee => (
                    <div key={employee.id} className="proj-team-member-checkbox" style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(String(employee.id))}
                          onChange={() => handleEmployeeSelection(employee.id)}
                        />
                        <span>{employee.name} ({employee.department || 'No Dept'}) - {employee.position || 'Employee'}</span>
                      </label>
                    </div>
                  ))}
                </div>
                {selectedEmployees.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '13px', color: '#4caf50' }}>
                    ✅ {selectedEmployees.length} member(s) selected
                  </div>
                )}
              </div>
              <div className="proj-form-actions">
                <button type="button" onClick={() => { setIsTeamModalOpen(false); setSelectedEmployees([]); }} className="proj-cancel-btn">Cancel</button>
                <button type="submit" className="proj-submit-btn">Create Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isTaskModalOpen && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content proj-large-modal">
            <div className="proj-modal-header">
              <h2>Create New Task</h2>
              <button className="proj-close-btn" onClick={() => { setIsTaskModalOpen(false); setSelectedTaskEmployees([]); }}>×</button>
            </div>
            <form onSubmit={handleCreateTask} className="proj-form">
              <div className="proj-form-section">
                <h3 className="proj-section-title"><FaTasks /> Task Information</h3>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Task Title *</label>
                    <input type="text" value={taskFormData.title} onChange={(e) => setTaskFormData({...taskFormData, title: e.target.value})} required placeholder="Enter task title" />
                  </div>
                  <div className="proj-form-group">
                    <label>Project *</label>
                    <select value={taskFormData.project_id} onChange={(e) => setTaskFormData({...taskFormData, project_id: e.target.value})} required>
                      <option value="">Select Project</option>
                      {userProjects.filter(p => currentUser.managedProjects.includes(p.id)).map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Team</label>
                    <select value={taskFormData.team_id} onChange={(e) => setTaskFormData({...taskFormData, team_id: e.target.value})}>
                      <option value="">Select Team (Optional)</option>
                      {selectedProjectTeams.map(team => (
                        <option key={team.id} value={team.id}>{team.name} ({team.member_count || 0} members)</option>
                      ))}
                    </select>
                  </div>
                  <div className="proj-form-group">
                    <label>Priority</label>
                    <select value={taskFormData.priority} onChange={(e) => setTaskFormData({...taskFormData, priority: e.target.value})}>
                      {taskPriorities.map(priority => <option key={priority} value={priority}>{priority}</option>)}
                    </select>
                  </div>
                </div>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Due Date</label>
                    <input type="date" value={taskFormData.due_date} onChange={(e) => setTaskFormData({...taskFormData, due_date: e.target.value})} />
                  </div>
                  <div className="proj-form-group">
                    <label>Estimated Hours</label>
                    <input type="number" value={taskFormData.estimated_hours} onChange={(e) => setTaskFormData({...taskFormData, estimated_hours: e.target.value})} min="0" placeholder="0" />
                  </div>
                </div>
                <div className="proj-form-group">
                  <label>Description</label>
                  <textarea value={taskFormData.description} onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})} rows="3" placeholder="Enter task description..." />
                </div>
              </div>
              <div className="proj-form-section">
                <h3 className="proj-section-title"><FaUserPlus /> Assign To Employees *</h3>
                {loadingTeamMembers ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--theme-text-muted,#666)' }}>Loading team members...</div>
                ) : (
                  <div className="proj-team-selection" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {(taskFormData.team_id ? availableTeamMembers : employees.filter(emp => emp.role_name?.toLowerCase() !== 'hr')).map(employee => (
                      <div key={employee.id || employee.user_id} className="proj-team-member-checkbox" style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedTaskEmployees.includes(String(employee.user_id || employee.id))}
                            onChange={() => {
                              const id = String(employee.user_id || employee.id);
                              setSelectedTaskEmployees(prev =>
                                prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
                              );
                            }}
                          />
                          <span>{employee.name} - {employee.position || 'Employee'}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {selectedTaskEmployees.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '13px', color: '#4caf50' }}>
                    ✅ {selectedTaskEmployees.length} employee(s) selected -- a separate task will be created for each
                  </div>
                )}
              </div>
              <div className="proj-form-actions">
                <button type="button" onClick={() => { setIsTaskModalOpen(false); setSelectedTaskEmployees([]); }} className="proj-cancel-btn">Cancel</button>
                <button type="submit" className="proj-submit-btn">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal - REMOVED - Now editing directly in Task Details */}
      {/* Delete Task Confirmation Modal */}
      {isDeleteTaskModalOpen && selectedTask && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content">
            <div className="proj-modal-header">
              <h2>Delete Task</h2>
              <button className="proj-close-btn" onClick={() => setIsDeleteTaskModalOpen(false)}>×</button>
            </div>
            <div className="proj-delete-confirm">
              <div className="emp-delete-icon"><FaExclamationTriangle /></div>
              <h3>Delete "{selectedTask.title}"?</h3>
              <p>Are you sure you want to delete this task? This will mark it as cancelled and cannot be undone.</p>
              <div className="proj-delete-actions">
                <button onClick={() => setIsDeleteTaskModalOpen(false)} className="proj-cancel-btn">
                  Cancel
                </button>
                <button onClick={handleDeleteTask} className="proj-delete-btn">
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Team Confirmation Modal */}
      {isDeleteTeamModalOpen && selectedTeam && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content">
            <div className="proj-modal-header">
              <h2>Delete Team</h2>
              <button className="proj-close-btn" onClick={() => setIsDeleteTeamModalOpen(false)}>×</button>
            </div>
            <div className="proj-delete-confirm">
              <div className="emp-delete-icon"><FaExclamationTriangle /></div>
              <h3>Delete "{selectedTeam.name}"?</h3>
              <p>Are you sure you want to delete this team? This action cannot be undone.</p>
              <div className="proj-delete-actions">
                <button onClick={() => setIsDeleteTeamModalOpen(false)} className="proj-cancel-btn">
                  Cancel
                </button>
                <button onClick={handleDeleteTeam} className="proj-delete-btn">
                  Delete Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {isEditTaskModalOpen && selectedTask && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content">
            <div className="proj-modal-header">
              <h2>Edit Task - {selectedTask.title}</h2>
              <button className="proj-close-btn" onClick={() => setIsEditTaskModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleEditTaskSubmit} className="proj-form">
              <div className="proj-form-section">
                <h3 className="proj-section-title">Task Information</h3>
                
                {canEditTask(selectedTask) && (
                  <div className="proj-form-group">
                    <label>Task Title</label>
                    <input 
                      type="text" 
                      value={editTaskData.title} 
                      onChange={(e) => setEditTaskData({...editTaskData, title: e.target.value})}
                      required
                    />
                  </div>
                )}
                
                {canEditTaskDescription(selectedTask) && (
                  <div className="proj-form-group">
                    <label>Description</label>
                    <textarea 
                      value={editTaskData.description} 
                      onChange={(e) => setEditTaskData({...editTaskData, description: e.target.value})}
                      rows="3"
                      placeholder="Describe what you did / progress made..."
                    />
                  </div>
                )}
                
                {canEditTaskStatusAndRemarks(selectedTask) && (
                  <>
                    <div className="proj-form-row">
                      <div className="proj-form-group">
                        <label>Status</label>
                        <select 
                          value={editTaskData.status} 
                          onChange={(e) => setEditTaskData({...editTaskData, status: e.target.value})}
                        >
                          {taskStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>
                      <div className="proj-form-group">
                        <label>Priority</label>
                        <select 
                          value={editTaskData.priority} 
                          onChange={(e) => setEditTaskData({...editTaskData, priority: e.target.value})}
                        >
                          {taskPriorities.map(priority => (
                            <option key={priority} value={priority}>{priority}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="proj-form-group">
                      <label>Progress (%)</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="10"
                        value={editTaskData.progress}
                        onChange={(e) => setEditTaskData({...editTaskData, progress: parseInt(e.target.value)})}
                        style={{ width: '100%' }}
                      />
                      <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>{editTaskData.progress}%</span>
                    </div>
                    
                    <div className="proj-form-group">
                      <label>Remarks / Comments</label>
                      <textarea 
                        value={editTaskData.remarks} 
                        onChange={(e) => setEditTaskData({...editTaskData, remarks: e.target.value})}
                        rows="3"
                        placeholder="Add remarks about progress, blockers, next steps, etc."
                      />
                    </div>
                  </>
                )}
                
                {canEditTask(selectedTask) && (
                  <div className="proj-form-group">
                    <label>Due Date</label>
                    <input 
                      type="date" 
                      value={editTaskData.due_date} 
                      onChange={(e) => setEditTaskData({...editTaskData, due_date: e.target.value})}
                    />
                  </div>
                )}
              </div>
              
              <div style={{
                padding: '10px',
                background: 'var(--theme-surface-muted,#f8f9fa)',
                borderRadius: '4px',
                marginBottom: '15px',
                fontSize: '12px',
                color: 'var(--theme-text-muted,#666)'
              }}>
                {currentUser.role === 'hr' && (
                  <span>🔓 <strong>HR Access:</strong> You can edit all fields</span>
                )}
                {currentUser.isProjectLead && currentUser.managedProjects.includes(selectedTask.project_id) && (
                  <span>📋 <strong>Project Lead Access:</strong> You can edit Status, Priority, Progress, and Remarks</span>
                )}
                {selectedTask.assigned_to_member == currentUser.id && !currentUser.isProjectLead && currentUser.role !== 'hr' && (
                  <span>✏️ <strong>Team Member Access:</strong> You can only edit the Description field</span>
                )}
              </div>
              
              <div className="proj-form-actions">
                <button type="button" onClick={() => setIsEditTaskModalOpen(false)} className="proj-cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="proj-submit-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
