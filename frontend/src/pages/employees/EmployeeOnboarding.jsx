import React, { useState, useEffect, useCallback } from 'react';
import onboardingAPI from '../../services/onboardingAPI';

const TASK_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  skipped: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function EmployeeOnboarding() {
  const [data, setData] = useState({ process: null, tasks: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await onboardingAPI.getMyProcess();
      setData({ process: r.data.process, tasks: r.data.tasks || [] });
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleComplete = async (taskId) => {
    try {
      await onboardingAPI.completeMyTask(taskId);
      showToast('Task marked complete!');
      load();
    } catch (e) { showToast(e.response?.data?.message || 'Error'); }
  };

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading...</div>;

  if (!data.process) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Active Process</h3>
        <p className="text-sm text-gray-500 mt-1">Your HR team hasn't started an onboarding or offboarding process for you yet.</p>
      </div>
    );
  }

  const { process, tasks } = data;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
  const pending = tasks.filter((t) => t.status === 'pending');
  const done = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">{toast}</div>
      )}

      {/* Header card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <p className="text-sm opacity-80 capitalize">{process.type} Process</p>
        <h2 className="text-2xl font-bold mt-1">{process.template_name || (process.type === 'onboarding' ? 'Welcome Aboard!' : 'Offboarding Checklist')}</h2>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{completed}/{tasks.length} tasks complete · {pct}%</span>
          </div>
          <div className="w-full bg-white/30 rounded-full h-2">
            <div className="bg-white h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {process.expected_end_date && (
          <p className="text-xs opacity-70 mt-3">Expected completion: {new Date(process.expected_end_date).toLocaleDateString()}</p>
        )}
      </div>

      {/* Pending tasks */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Pending Tasks ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map((task) => (
              <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-4">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{task.title}</p>
                  {task.description && <p className="text-xs text-gray-500 mt-1">{task.description}</p>}
                  {task.due_date && (
                    <p className={`text-xs mt-2 ${new Date(task.due_date) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>
                      Due {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  )}
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full capitalize border bg-yellow-50 text-yellow-700 border-yellow-200">
                    Assigned to: {task.assigned_to_role}
                  </span>
                </div>
                {(task.assigned_to_role === 'employee' || !task.assigned_to_role) && (
                  <button onClick={() => handleComplete(task.id)}
                    className="shrink-0 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                    Mark Done
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed tasks */}
      {done.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Completed ({done.length})</h3>
          <div className="space-y-2">
            {done.map((task) => (
              <div key={task.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700 p-3 flex items-center gap-3 opacity-70">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-500 line-through">{task.title}</span>
                {task.completed_at && <span className="ml-auto text-xs text-gray-400">{new Date(task.completed_at).toLocaleDateString()}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {pct === 100 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
          <p className="text-green-700 dark:text-green-300 font-semibold">🎉 All tasks completed!</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">Your {process.type} process is complete.</p>
        </div>
      )}
    </div>
  );
}
