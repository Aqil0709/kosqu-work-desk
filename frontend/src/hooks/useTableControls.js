import { useMemo, useState } from 'react';

const normalize = (value) => String(value ?? '').toLowerCase();

const readValue = (row, accessor) => {
  if (typeof accessor === 'function') return accessor(row);
  return accessor.split('.').reduce((value, key) => value?.[key], row);
};

const compareValues = (left, right) => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const leftDate = Date.parse(left);
  const rightDate = Date.parse(right);

  if (left !== '' && right !== '' && Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) {
    return leftDate - rightDate;
  }

  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
};

export const useTableControls = (rows, searchAccessors = [], initialSort = null) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState(initialSort);

  const requestSort = (key, accessor = key) => {
    setSortConfig((current) => ({
      key,
      accessor,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const controlledRows = useMemo(() => {
    const query = normalize(searchTerm).trim();
    let nextRows = Array.isArray(rows) ? [...rows] : [];

    if (query) {
      nextRows = nextRows.filter((row) => (
        searchAccessors.some((accessor) => normalize(readValue(row, accessor)).includes(query))
      ));
    }

    if (sortConfig?.accessor) {
      nextRows.sort((a, b) => {
        const result = compareValues(readValue(a, sortConfig.accessor), readValue(b, sortConfig.accessor));
        return sortConfig.direction === 'desc' ? -result : result;
      });
    }

    return nextRows;
  }, [rows, searchAccessors, searchTerm, sortConfig]);

  const sortLabel = (key) => {
    if (sortConfig?.key !== key) return '';
    return sortConfig.direction === 'asc' ? ' ^' : ' v';
  };

  return {
    controlledRows,
    requestSort,
    searchTerm,
    setSearchTerm,
    sortConfig,
    sortLabel,
  };
};
