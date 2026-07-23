'use client';

import React, { useState } from 'react';

interface MultiSelectProps {
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  title: string;
  className?: string;
  emptyMeansAll?: boolean;
  singleSelect?: boolean;
  onExpandedChange?: (isExpanded: boolean) => void;
  isExpanded?: boolean;
  showAllOption?: boolean;
  showHeader?: boolean;
  excludeFromAll?: string[];
  showEmptyOption?: boolean;
}

const MultiSelect = React.memo(function MultiSelect({
  options,
  selectedValues,
  onChange,
  title,
  className = "",
  emptyMeansAll = false,
  singleSelect = false,
  onExpandedChange,
  isExpanded: externalIsExpanded,
  showAllOption = true,
  showHeader = true,
  excludeFromAll = [],
  showEmptyOption = false,
}: MultiSelectProps) {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  const effectiveExcludeFromAll = showEmptyOption ? [...excludeFromAll, "empty"] : excludeFromAll;

  const toggleOption = (value: string) => {
    if (singleSelect) {
      onChange([value]);
    } else if (value === 'all') {
      if (emptyMeansAll) {
        onChange([]);
      } else {
        const allSelectableValues = options.filter(opt => opt.value !== 'all' && !effectiveExcludeFromAll.includes(opt.value)).map(opt => opt.value);
        const isCurrentlyAllSelected = selectedValues.length === allSelectableValues.length &&
          allSelectableValues.every(val => selectedValues.includes(val));
        if (isCurrentlyAllSelected) {
          onChange([]);
        } else {
          onChange(allSelectableValues);
        }
      }
    } else {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
      onChange(newValues);
    }
  };

  const handleToggleExpanded = () => {
    if (externalIsExpanded === undefined) {
      const newExpanded = !internalIsExpanded;
      setInternalIsExpanded(newExpanded);
      onExpandedChange?.(newExpanded);
    } else {
      onExpandedChange?.(!externalIsExpanded);
    }
  };

  const isAllSelected = singleSelect
    ? false
    : emptyMeansAll
      ? selectedValues.length === 0
      : (() => {
          const selectableOptions = options.filter(opt => opt.value !== 'all' && !effectiveExcludeFromAll.includes(opt.value));
          const hasExcludedValues = selectedValues.some(val => effectiveExcludeFromAll.includes(val));
          return !hasExcludedValues && selectedValues.length === selectableOptions.length &&
                 selectableOptions.every(opt => selectedValues.includes(opt.value));
        })();

  return (
    <div className={`border border-gray-300 rounded-md bg-white ${className}`}>
      {showHeader && (
        <div
          className="p-2 bg-gray-50 border-b border-gray-300 cursor-pointer flex items-center justify-between hover:bg-gray-100"
          onClick={handleToggleExpanded}
        >
          <span className="text-xs font-medium text-gray-700">{title}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ pointerEvents: 'none' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      )}
      {isExpanded && (
        <div className="w-full p-1 max-h-48 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-1">
            <input
              type="text"
              placeholder={`Search ${title}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-1 text-xs border border-gray-200 rounded"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>

          {!singleSelect && showAllOption && (
            <label onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} className="p-1 hover:bg-gray-100 cursor-pointer flex items-center rounded">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => toggleOption('all')}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="mr-2"
              />
              <span className="text-xs font-medium">All</span>
            </label>
          )}

          {showEmptyOption && (
            <label onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} className="p-1 hover:bg-gray-100 cursor-pointer flex items-center rounded">
              <input
                type="checkbox"
                checked={selectedValues.includes("empty")}
                onChange={() => toggleOption("empty")}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="mr-2"
              />
              <span className="text-xs font-medium">Empty</span>
            </label>
          )}

          {options
            .filter(opt => opt.value !== 'all' && opt.value !== 'empty')
            .filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(option => (
              <label
                key={option.value}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-1 hover:bg-gray-100 cursor-pointer flex items-center rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={() => toggleOption(option.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="mr-2"
                />
                <span className="text-xs">{option.label}</span>
              </label>
            ))}
        </div>
      )}
    </div>
  );
});

export default MultiSelect;
