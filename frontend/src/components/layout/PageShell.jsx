/**
 * PageShell -- lightweight wrapper that ensures every standalone page
 * (rendered outside AdminLayout / EmployeeLayout) still sits on the
 * correct themed background.  It does NOT render a sidebar; it only
 * wraps children in the same root container that AdminLayout uses so
 * that CSS-variable-based colours (--page-bg, --theme-bg, etc.) apply
 * correctly in both light and dark mode.
 */
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import '../../pages/admin/AdminLayout.css'; // brings in --al-bg, .al-root etc.

const PageShell = ({ children }) => {
  const { isDarkMode } = useTheme();
  return (
    <div
      className={`al-root${isDarkMode ? ' dark' : ''}`}
      style={{
        minHeight: '100vh',
        overflow: 'auto',
        background: 'var(--al-bg, var(--page-bg, #F8FAFC))',
        color: 'var(--al-text-main, var(--theme-text, #1E293B))',
      }}
    >
      {children}
    </div>
  );
};

export default PageShell;
