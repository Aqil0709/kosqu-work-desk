import React, { useEffect, useState, useCallback } from 'react';
import DataGrid from '../common/DataGrid';
import { serviceAPI } from '../../services/serviceAPI';
import { HiOutlinePlus, HiOutlineArrowDownTray } from "react-icons/hi2";
import * as XLSX from 'xlsx';

const ServiceTable = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await serviceAPI.getAll();
      setServices(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleCellUpdate = async (params) => {
    const { data } = params;
    try {
      const payload = { ...data };
      if (payload.scheduled_date instanceof Date) {
        const d = payload.scheduled_date;
        payload.scheduled_date = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      } else if (typeof payload.scheduled_date === 'string' && payload.scheduled_date.includes('T')) {
        payload.scheduled_date = payload.scheduled_date.split('T')[0];
      }
      await serviceAPI.update(payload.id, payload);
    } catch (error) {
      console.error('Update failed:', error);
      loadServices();
    }
  };

  const handleSelectionChanged = (event) => {
    setSelectedRows(event.api.getSelectedRows());
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} services?`)) return;
    
    try {
      setLoading(true);
      await Promise.all(selectedRows.map(row => serviceAPI.delete(row.id)));
      setSelectedRows([]);
      loadServices();
    } catch (error) {
      console.error('Failed to delete services:', error);
      alert('Failed to delete some services');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(services);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Services');
    XLSX.writeFile(workbook, 'Service_Register.xlsx');
  };

  const handleAddQuickRow = async () => {
    const newService = {
      service_name: 'New Service Engagement',
      service_type: 'Consulting',
      assigned_department: 'General',
      status: 'Active',
      description: '',
      scheduled_date: new Date().toISOString().split('T')[0]
    };

    try {
      const response = await serviceAPI.create(newService);
      if (response.data?.id || response.data) {
        loadServices();
      }
    } catch (error) {
      console.error('Failed to add service:', error);
    }
  };

  const columnDefs = [
    { field: 'service_name', headerName: 'Service Name', filter: 'agTextColumnFilter', checkboxSelection: true },
    { field: 'description', headerName: 'Description', filter: 'agTextColumnFilter' },
    { field: 'service_type', headerName: 'Type' },
    { field: 'assigned_department', headerName: 'Assigned Dept' },
    { field: 'service_manager', headerName: 'Manager' },
    { 
      field: 'status',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Active', 'Pending', 'Completed', 'On Hold']
      }
    },
    { 
      field: 'scheduled_date', 
      headerName: 'Target Date', 
      cellEditor: 'agDateCellEditor',
      valueFormatter: params => {
        if (!params.value) return '';
        if (params.value instanceof Date) return params.value.toISOString().split('T')[0];
        return typeof params.value === 'string' ? params.value.split('T')[0] : params.value;
      }
    }
  ];

  return (
    <div className="table-container">
      <div className="crm-toolbar">
        <div className="toolbar-left">
          <h2 className="section-subtitle">Active Service engagements</h2>
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
        rowData={services}
        columnDefs={columnDefs}
        onCellValueChanged={handleCellUpdate}
        onSelectionChanged={handleSelectionChanged}
      />
    </div>
  );
};

export default ServiceTable;
