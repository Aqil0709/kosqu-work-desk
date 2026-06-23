// frontend/src/pages/admin/PTTM/context/PTTMContext.jsx

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../../../services/api';

export const PTTMContext = createContext(null);

const unwrap = response => response.data;
const errMessage = err => err.response?.data?.error || err.response?.data?.message || err.message || 'Request failed';

export function PTTMProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [phases, setPhases] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const showToast = useCallback(message => {
    setToast(message);
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => setToast(''), 2200);
  }, []);

  const markSaved = useCallback(() => {
    setSaving(true);
    window.clearTimeout(window.__saveTimer);
    window.__saveTimer = window.setTimeout(() => setSaving(false), 700);
  }, []);

  const handle = useCallback(async (fn, success) => {
    try {
      const result = await fn();
      if (success) showToast(success);
      markSaved();
      return result;
    } catch (err) {
      showToast(errMessage(err));
      throw err;
    }
  }, [markSaved, showToast]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, ph, t, u, tk] = await Promise.all([
        api.get('/projects'),
        api.get('/pttm/phases'),
        api.get('/pttm/teams'),
        api.get('/pttm/users'),
        api.get('/pttm/tasks')
      ]);
      setProjects(unwrap(p));
      setPhases(unwrap(ph));
      setTeams(unwrap(t));
      setUsers(unwrap(u));
      setTasks(unwrap(tk));
    } catch (err) {
      showToast(errMessage(err));
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refreshTasks = useCallback(async () => {
    const res = await api.get('/pttm/tasks');
    setTasks(unwrap(res));
  }, []);

  const actions = useMemo(() => ({
    fetchAll,
    refreshTasks,
    projectName: id => projects.find(p => String(p.id) === String(id))?.name || '',
    phaseName: id => phases.find(p => String(p.id) === String(id))?.name || '',
    teamName: id => teams.find(t => String(t.id) === String(id))?.name || '',
    userName: id => users.find(u => String(u.id) === String(id))?.name || '',
    savePhase: data => handle(async () => { const row = unwrap(await api.post('/pttm/phases', data)); await fetchAll(); return row; }, 'Phase saved!'),
    deletePhase: id => handle(async () => { await api.delete(`/pttm/phases/${id}`); await fetchAll(); }, 'Phase deleted'),
    saveTeam: data => handle(async () => { const row = unwrap(await api.post('/pttm/teams', data)); await fetchAll(); return row; }, 'Team saved!'),
    deleteTeam: id => handle(async () => { await api.delete(`/pttm/teams/${id}`); await fetchAll(); }, 'Team deleted'),

    addTask: data => handle(async () => { await api.post('/pttm/tasks', data); await refreshTasks(); }, 'Row added'),
    patchTask: (id, field, value) => handle(async () => { await api.patch(`/pttm/tasks/${id}`, { field, value }); await refreshTasks(); }),
    updateTask: (id, data) => handle(async () => { await api.put(`/pttm/tasks/${id}`, data); await refreshTasks(); }),
    deleteTask: id => handle(async () => { await api.delete(`/pttm/tasks/${id}`); await refreshTasks(); }, 'Row deleted'),
    duplicateTask: id => handle(async () => { await api.post(`/pttm/tasks/${id}/duplicate`); await refreshTasks(); }, 'Row duplicated'),
    insertTask: data => handle(async () => { await api.post('/pttm/tasks/insert', data); await refreshTasks(); }, 'Row inserted'),
    runSeed: () => handle(async () => { await api.post('/pttm/seed'); await fetchAll(); }, 'Sample data loaded!'),
    getDocflow: async projectId => unwrap(await api.get(`/pttm/docflow/${projectId}`)),
    updateDocflow: (projectId, phaseNum, data) => handle(async () => unwrap(await api.put(`/pttm/docflow/${projectId}/${phaseNum}`, data)), data?.remarks !== undefined ? 'Remarks saved' : null),
    uploadDocflowFile: (projectId, phaseNum, data) => handle(async () => unwrap(await api.post(`/pttm/docflow/${projectId}/${phaseNum}/files`, data)), `File uploaded: ${data.name}`),
    deleteDocflowFile: (projectId, phaseNum, fileId) => handle(async () => unwrap(await api.delete(`/pttm/docflow/${projectId}/${phaseNum}/files/${fileId}`)), 'File removed'),
    showToast,
    markSaved
  }), [fetchAll, handle, phases, projects, refreshTasks, showToast, teams, users]);

  const value = {
    projects,
    phases,
    teams,
    users,
    tasks,
    toast,
    saving,
    loading,
    ...actions
  };

  return <PTTMContext.Provider value={value}>{children}</PTTMContext.Provider>;
}

export function useApp() {
  const ctx = useContext(PTTMContext);
  if (!ctx) throw new Error('useApp must be used inside PTTMProvider');
  return ctx;
}
