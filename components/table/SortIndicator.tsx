'use client';

import React from 'react';
import { BsArrowUp, BsArrowDown, BsArrowDownUp } from 'react-icons/bs';

interface SortIndicatorProps {
  field: string;
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
}

const SortIndicator: React.FC<SortIndicatorProps> = ({ field, sortField, sortDirection }) => {
  if (sortField !== field) {
    return <BsArrowDownUp className="w-3.5 h-3.5 text-gray-500 ml-1" />;
  }
  return sortDirection === 'asc' ?
    <BsArrowUp className="w-3.5 h-3.5 text-blue-600 ml-1" /> :
    <BsArrowDown className="w-3.5 h-3.5 text-blue-600 ml-1" />;
};

export default SortIndicator;
