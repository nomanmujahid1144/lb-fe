'use client';

import React, { useState } from 'react';

interface ColumnFilterDropdownProps {
  column: string;
  type: 'text' | 'multiselect' | 'range' | 'boolean' | 'daterange' | 'multiselect-daterange' | 'singleselect';
  options?: Array<{ value: string; label: string }>;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  includeEmpty?: boolean;
  onIncludeEmptyChange?: (value: boolean) => void;
  notEmpty?: boolean;
  onNotEmptyChange?: (value: boolean) => void;
  excludeSearch?: boolean;
  onExcludeSearchChange?: (value: boolean) => void;
  selectedValues?: string[];
  onSelectedValuesChange?: (values: string[]) => void;
  minValue?: string;
  maxValue?: string;
  onMinChange?: (value: string) => void;
  onMaxChange?: (value: string) => void;
  booleanValue?: string;
  onBooleanChange?: (value: string) => void;
  dateFromValue?: string;
  dateToValue?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  singleSelectValue?: string;
  onSingleSelectChange?: (value: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  renderOption?: (option: { value: string; label: string }) => React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
}

const ColumnFilterDropdown: React.FC<ColumnFilterDropdownProps> = ({
  column,
  type,
  options,
  searchValue,
  onSearchChange,
  includeEmpty,
  onIncludeEmptyChange,
  notEmpty,
  onNotEmptyChange,
  excludeSearch,
  onExcludeSearchChange,
  selectedValues,
  onSelectedValuesChange,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  booleanValue,
  onBooleanChange,
  dateFromValue,
  dateToValue,
  onDateFromChange,
  onDateToChange,
  singleSelectValue,
  onSingleSelectChange,
  statusOptions,
  statusValue,
  onStatusChange,
  renderOption,
  isOpen,
  onClose,
  position = 'left',
}) => {


  if (!isOpen) return null;

  const [optionSearch, setOptionSearch] = useState('');

  const filteredOptions = options?.filter(opt =>
    !optionSearch || opt.label.toLowerCase().includes(optionSearch.toLowerCase())
  );

  const toggleOption = (value: string) => {
    if (!selectedValues || !onSelectedValuesChange) return;

    if (value === 'all') {
      const targetValues = (filteredOptions || []).map(opt => opt.value);
      const allSelected = targetValues.every(val => selectedValues.includes(val));
      if (allSelected) {
        onSelectedValuesChange(selectedValues.filter(v => !targetValues.includes(v)));
      } else {
        const merged = Array.from(new Set([...selectedValues, ...targetValues]));
        onSelectedValuesChange(merged);
      }
    } else {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
      onSelectedValuesChange(newValues);
    }
  };

  return (
    <div
      className={`absolute top-full ${position === 'right' ? 'right-0' : 'left-0'} mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[100] min-w-64 column-filter-dropdown`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3">
        {type === 'text' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder={`Search ${column}...`}
              value={searchValue || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onClose?.()}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              autoFocus
            />
            {onExcludeSearchChange && (
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={excludeSearch || false}
                  onChange={(e) => onExcludeSearchChange(e.target.checked)}
                  className="mr-2"
                />
                Exclude
              </label>
            )}
            {onIncludeEmptyChange && (
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={includeEmpty || false}
                  onChange={(e) => {
                    onIncludeEmptyChange(e.target.checked);
                    if (e.target.checked && notEmpty) onNotEmptyChange?.(false);
                  }}
                  className="mr-2"
                />
                Empty
              </label>
            )}
            {onNotEmptyChange && (
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={notEmpty || false}
                  onChange={(e) => {
                    onNotEmptyChange(e.target.checked);
                    if (e.target.checked && includeEmpty) onIncludeEmptyChange?.(false);
                  }}
                  className="mr-2"
                />
                Not Empty
              </label>
            )}
          </div>
        )}

        {type === 'multiselect' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder={`Search ${column}...`}
              value={optionSearch}
              onChange={(e) => setOptionSearch(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              autoFocus
            />
            <label className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
              <input
                type="checkbox"
                checked={filteredOptions?.length ? filteredOptions.every(opt => selectedValues?.includes(opt.value)) : false}
                onChange={() => toggleOption('all')}
                className="mr-2"
              />
              All{optionSearch ? ` (filtered)` : ''}
            </label>
            <label className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
              <input
                type="checkbox"
                checked={includeEmpty || false}
                onChange={(e) => {
                  onIncludeEmptyChange?.(e.target.checked);
                  if (e.target.checked && notEmpty) onNotEmptyChange?.(false);
                }}
                className="mr-2"
              />
              Empty
            </label>
            <label className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded border-b border-gray-200 pb-2 mb-2">
              <input
                type="checkbox"
                checked={notEmpty || false}
                onChange={(e) => {
                  onNotEmptyChange?.(e.target.checked);
                  if (e.target.checked && includeEmpty) onIncludeEmptyChange?.(false);
                }}
                className="mr-2"
              />
              Not Empty
            </label>
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions?.map(option => (
                <label key={option.value} className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
                  <input
                    type="checkbox"
                    checked={selectedValues?.includes(option.value) || false}
                    onChange={() => toggleOption(option.value)}
                    className="mr-2"
                  />
                  {renderOption ? renderOption(option) : option.label}
                </label>
              ))}
            </div>
            {onSearchChange && (
              <div className="space-y-1 border-t border-gray-200 pt-2 mt-2">
                <input
                  type="text"
                  placeholder="Filter by text..."
                  value={searchValue || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onClose?.()}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
                {onExcludeSearchChange && (
                  <label className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
                    <input
                      type="checkbox"
                      checked={excludeSearch || false}
                      onChange={(e) => onExcludeSearchChange(e.target.checked)}
                      className="mr-2"
                    />
                    Exclude
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {type === 'singleselect' && (
          <div className="space-y-1">
            <input
              type="text"
              placeholder={`Search ${column}...`}
              value={optionSearch}
              onChange={(e) => setOptionSearch(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              autoFocus
            />
            <div className="max-h-48 overflow-y-auto mt-1">
              {filteredOptions?.map(option => (
                <label key={option.value} className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
                  <input
                    type="radio"
                    name="singleselect"
                    checked={singleSelectValue === option.value}
                    onChange={() => onSingleSelectChange?.(option.value)}
                    className="mr-2"
                  />
                  {renderOption ? renderOption(option) : option.label}
                </label>
              ))}
            </div>
            {statusOptions && statusOptions.length > 0 && (
              <>
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
                  <label className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
                    <input
                      type="radio"
                      name="singleselect-status"
                      checked={!statusValue}
                      onChange={() => onStatusChange?.('')}
                      className="mr-2"
                    />
                    All
                  </label>
                  {statusOptions.map(opt => (
                    <label key={opt.value} className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
                      <input
                        type="radio"
                        name="singleselect-status"
                        checked={statusValue === opt.value}
                        onChange={() => onStatusChange?.(opt.value)}
                        className="mr-2"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {type === 'range' && (
          <div className="space-y-2">
            {statusOptions && statusOptions.length > 0 && (
              <div className="border-b border-gray-200 pb-2">
                <p className="text-xs text-gray-500 font-medium mb-1">Basis</p>
                {statusOptions.map(opt => (
                  <label key={opt.value} className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
                    <input
                      type="radio"
                      name="range-basis"
                      checked={statusValue === opt.value}
                      onChange={() => onStatusChange?.(opt.value)}
                      className="mr-2"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min</label>
              <input
                type="number"
                placeholder="Min"
                value={minValue || ''}
                onChange={(e) => onMinChange?.(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onClose?.()}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max</label>
              <input
                type="number"
                placeholder="Max"
                value={maxValue || ''}
                onChange={(e) => onMaxChange?.(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onClose?.()}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        )}

        {type === 'boolean' && (
          <div className="space-y-2">
            <select
              value={booleanValue || ''}
              onChange={(e) => onBooleanChange?.(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        )}

        {type === 'daterange' && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={dateFromValue || ''}
                onChange={(e) => onDateFromChange?.(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={dateToValue || ''}
                onChange={(e) => onDateToChange?.(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={includeEmpty || false}
                onChange={(e) => {
                  onIncludeEmptyChange?.(e.target.checked);
                  if (e.target.checked && notEmpty) onNotEmptyChange?.(false);
                }}
                className="mr-2"
              />
              Empty
            </label>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={notEmpty || false}
                onChange={(e) => {
                  onNotEmptyChange?.(e.target.checked);
                  if (e.target.checked && includeEmpty) onIncludeEmptyChange?.(false);
                }}
                className="mr-2"
              />
              Not Empty
            </label>
          </div>
        )}

        {type === 'multiselect-daterange' && (
          <div className="space-y-2">
            <div className="max-h-40 overflow-y-auto border-b border-gray-100 pb-2 mb-1">
              <label className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
                <input
                  type="checkbox"
                  checked={includeEmpty || false}
                  onChange={(e) => {
                    onIncludeEmptyChange?.(e.target.checked);
                    if (e.target.checked && notEmpty) onNotEmptyChange?.(false);
                  }}
                  className="mr-2"
                />
                Empty
              </label>
              <label className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
                <input
                  type="checkbox"
                  checked={notEmpty || false}
                  onChange={(e) => {
                    onNotEmptyChange?.(e.target.checked);
                    if (e.target.checked && includeEmpty) onIncludeEmptyChange?.(false);
                  }}
                  className="mr-2"
                />
                Not Empty
              </label>
              {options?.map(option => (
                <label key={option.value} className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
                  <input
                    type="checkbox"
                    checked={selectedValues?.includes(option.value) || false}
                    onChange={() => toggleOption(option.value)}
                    className="mr-2"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <div className="pt-1">
              <p className="text-xs text-gray-500 font-medium mb-2">Custom date range</p>
              <div className="mb-2">
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={dateFromValue || ''}
                  onChange={(e) => onDateFromChange?.(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={dateToValue || ''}
                  onChange={(e) => onDateToChange?.(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-gray-200 p-2 flex justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ColumnFilterDropdown;
