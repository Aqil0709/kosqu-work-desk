import { AgGridReact } from 'ag-grid-react';
import { useTheme } from '../../contexts/ThemeContext';

// AG Grid Styles
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

const DataGrid = ({
  rowData,
  columnDefs,
  onCellValueChanged,
  paginationPageSize = 10,
  ...props
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`ag-theme-quartz app-data-grid${isDarkMode ? ' app-data-grid-dark' : ''}`}
      style={{
        height: 'min(600px, 75vh)',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        pagination={true}
        paginationPageSize={paginationPageSize}
        defaultColDef={{
          sortable: true,
          filter: true,
          editable: false,
          flex: 1,
          minWidth: 120,
          resizable: true,
        }}
        animateRows={true}
        rowSelection="multiple"
        onCellValueChanged={onCellValueChanged}
        {...props}
      />
    </div>
  );
};

export default DataGrid;
