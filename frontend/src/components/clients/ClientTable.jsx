import React, { useEffect, useState, useCallback } from 'react';
import DataGrid from '../common/DataGrid';
import { clientAPI } from '../../services/clientAPI';
import * as XLSX from 'xlsx';
import { HiOutlinePlus, HiOutlineArrowDownTray } from "react-icons/hi2";

const ClientTable = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await clientAPI.getAll();
      setClients(response.data?.clients || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleCellUpdate = async (params) => {
    const { data } = params;
    try {
      await clientAPI.update(data.id, data);
    } catch (error) {
      console.error('Update failed:', error);
      // Optional: Refresh data to revert changes on failure
      loadClients();
    }
  };

  const handleSelectionChanged = (event) => {
    setSelectedRows(event.api.getSelectedRows());
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} clients?`)) return;
    
    try {
      setLoading(true);
      await Promise.all(selectedRows.map(row => clientAPI.delete(row.id)));
      setSelectedRows([]);
      loadClients();
    } catch (error) {
      console.error('Failed to delete clients:', error);
      alert('Failed to delete some clients');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(clients);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
    XLSX.writeFile(workbook, 'Client_Directory.xlsx');
  };

  const handleAddQuickRow = async () => {
    const newClient = {
      name: 'New Client',
      industry: 'Technology',
      contact_person: '',
      contact_email: '',
      status: 'active',
      location: ''
    };

    try {
      const response = await clientAPI.create(newClient);
      if (response.data?.id) {
        loadClients();
      }
    } catch (error) {
      console.error('Failed to add client:', error);
    }
  };

  const columnDefs = [
    { field: 'name', headerName: 'Client Name', filter: 'agTextColumnFilter', checkboxSelection: true },
    { field: 'industry', filter: 'agSetColumnFilter' },
    { field: 'contact_person', headerName: 'Contact Person' },
    { field: 'contact_email', headerName: 'Email' },
    { field: 'contact_phone', headerName: 'Phone' },
    { field: 'location' },
    { 
      field: 'status', 
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['active', 'inactive', 'prospective']
      },
      cellClassRules: {
        'status-active': params => params.value === 'active',
        'status-inactive': params => params.value === 'inactive',
        'status-prospective': params => params.value === 'prospective'
      }
    }
  ];

  return (
    <div className="table-container">
      <div className="crm-toolbar">
        <div className="toolbar-left">
          <h2 className="section-subtitle">Client Directory</h2>
        </div>
        <div className="crm-actions">
          {selectedRows.length > 0 && (
            <button className="crm-btn crm-btn-danger" style={{backgroundColor: '#ef4444', color: 'var(--card-bg,#fff)', border: 'none'}} onClick={handleDeleteSelected}>
              Delete Selected ({selectedRows.length})
            </button>
          )}
          <button className="crm-btn crm-btn-secondary" onClick={handleExport}>
            <HiOutlineArrowDownTray /> Export Excel
          </button>
          <button className="crm-btn crm-btn-primary" onClick={handleAddQuickRow}>
            <HiOutlinePlus /> Quick Add
          </button>
        </div>
      </div>

      <DataGrid
        rowData={clients}
        columnDefs={columnDefs}
        onCellValueChanged={handleCellUpdate}
        onSelectionChanged={handleSelectionChanged}
      />
    </div>
  );
};

export default ClientTable;
