import React, { useState, useEffect, useCallback } from 'react';
import { userAPI } from '../../services/userAPI';
import DataGrid from '../../components/common/DataGrid';
import './AdminLayout.css'; // Reuse layout styles or create UserManagement.css

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAll();
      setUsers(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please check if the backend is running.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const columnDefs = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'first_name', headerName: 'First Name', flex: 1 },
    { field: 'last_name', headerName: 'Last Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1.5 },
    { field: 'phone', headerName: 'Phone', flex: 1 },
    { field: 'role_name', headerName: 'Role', flex: 1 },
  ];

  return (
    <div className="user-management-container">
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>User Management</h2>
        <button className="add-employee-btn" onClick={fetchUsers}>
          Refresh
        </button>
      </div>

      {error && <div className="error-message" style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}

      <div className="glass-form" style={{ padding: '20px', borderRadius: '12px' }}>
        {loading ? (
          <div>Loading users...</div>
        ) : (
          <DataGrid 
            rowData={users} 
            columnDefs={columnDefs} 
            pagination={true}
            paginationPageSize={10}
          />
        )}
      </div>
    </div>
  );
};

export default UserManagement;
