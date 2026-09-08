'use client';

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Breathing room kept between the panel and the viewport edges, and the gap
// between the header cell and the panel below it.
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 4;
// Floor for the panel height: below this the list is unusable, so on a very
// short viewport the panel is allowed to run past the bottom edge instead.
const MIN_PANEL_HEIGHT = 200;
// Stand-in width for the first measuring pass, before the panel is in the DOM.
// Matches the `min-w-64` below.
const FALLBACK_PANEL_WIDTH = 256;

interface PanelPlacement {
  top: number;
  left: number;
  maxHeight: number;
  maxWidth: number;
}

interface ColumnFilterDropdownProps {
  column: string;
  type: 'text' | 'multiselect' | 'range' | 'boolean' | 'daterange' | 'multiselect-daterange' | 'singleselect';
  /**
   * `expandsTo` turns a row into a shortcut for several real values (e.g. a
   * "Europe" row standing for its countries): toggling it selects/deselects
   * them all and its own `value` is never written to the filter, so the backend
   * only ever receives real values. `isGroup` renders such rows as a block
   * above the plain ones.
   */
  options?: Array<{ value: string; label: string; expandsTo?: string[]; isGroup?: boolean }>;
  /**
   * Set while `options` is still being fetched. An option list that is merely
   * empty is indistinguishable from one that has not arrived yet — on a large
   * customer the request takes long enough for the panel to look broken — so
   * the list area says so instead of rendering nothing. Columns whose options
   * are hard-coded never pass it.
   */
  optionsLoading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /**
   * Whether this column's text filter understands the `|` / `&&` expression
   * syntax, which the backend enables per column (EXPRESSION_SEARCH_COLUMNS in
   * the master-database controller). Only open free-text columns qualify — IDs
   * and dates keep matching literally — so the hint below is opt-in rather than
   * always on: showing it on a column that ignores the operators would be worse
   * than showing nothing. Pages whose backend has no parser simply omit it.
   */
  supportsExpression?: boolean;
  /**
   * "Empty" / "Not Empty" toggles. Each checkbox renders only when its own
   * handler is supplied: a column whose backend has no empty predicate would
   * otherwise show a checkbox that never ticks, since the state it reflects
   * does not exist. Wire both handlers or neither.
   */
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
  optionsLoading,
  searchValue,
  onSearchChange,
  supportsExpression,
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
  const [optionSearch, setOptionSearch] = useState('');
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);

  /**
   * The panel renders on document.body rather than inside the header cell: the
   * table's scroll container clips anything hanging below it, and the header is
   * sticky so there is no way to scroll a clipped panel into view. Escaping the
   * container lets the panel use the full height down to the viewport edge and
   * simply overlap the table.
   *
   * The price is manual positioning — a fixed panel does not follow its column,
   * so it is measured against an invisible anchor left behind in the header.
   */
  const measurePlacement = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const width = panelRef.current?.offsetWidth || FALLBACK_PANEL_WIDTH;
    const top = rect.bottom + ANCHOR_GAP;
    const preferredLeft = position === 'right' ? rect.right - width : rect.left;

    const next: PanelPlacement = {
      top,
      left: Math.max(
        VIEWPORT_MARGIN,
        Math.min(preferredLeft, window.innerWidth - width - VIEWPORT_MARGIN)
      ),
      maxHeight: Math.max(MIN_PANEL_HEIGHT, window.innerHeight - top - VIEWPORT_MARGIN),
      maxWidth: window.innerWidth - VIEWPORT_MARGIN * 2,
    };

    setPlacement((prev) =>
      prev && prev.top === next.top && prev.left === next.left
        && prev.maxHeight === next.maxHeight && prev.maxWidth === next.maxWidth
        ? prev
        : next
    );
  }, [position]);

  // Runs on every render while open: the first pass positions with the fallback
  // width, the second corrects it once the panel's real width is known. Both
  // happen before paint, and a pass that changes nothing bails out.
  useLayoutEffect(() => {
    if (isOpen) measurePlacement();
  });

  // Scrolling a large table fires far more often than it can usefully be
  // followed, so repositioning is collapsed to one pass per frame.
  const frameRef = useRef<number | null>(null);
  const scheduleMeasure = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      measurePlacement();
    });
  }, [measurePlacement]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    // Capture phase: the table's own scroll container has to move the panel back
    // under its column too, not just the window.
    window.addEventListener('scroll', scheduleMeasure, true);
    window.addEventListener('resize', scheduleMeasure);

    // The anchor spans its header cell, so dragging the column wider resizes it
    // as well — without this the panel would keep hanging under the old column
    // edge until something else moved.
    const observer = typeof ResizeObserver === 'undefined' || !anchorRef.current
      ? null
      : new ResizeObserver(scheduleMeasure);
    if (observer && anchorRef.current) observer.observe(anchorRef.current);

    return () => {
      window.removeEventListener('scroll', scheduleMeasure, true);
      window.removeEventListener('resize', scheduleMeasure);
      observer?.disconnect();
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [isOpen, scheduleMeasure]);

  if (!isOpen) return null;

  const filteredOptions = options?.filter(opt =>
    !optionSearch || opt.label.toLowerCase().includes(optionSearch.toLowerCase())
  );

  const loadingOptionsNotice = (
    <div role="status" className="flex items-center gap-2 px-1 py-4 text-sm text-gray-500">
      <span
        aria-hidden
        className="inline-block w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin flex-shrink-0"
      />
      Loading options...
    </div>
  );

  // The real filter values a row stands for — its own value, unless it is a
  // shortcut row (see `expandsTo` on the options prop).
  const valuesForOption = (option: { value: string; expandsTo?: string[] }) =>
    option.expandsTo ?? [option.value];

  const toggleOption = (value: string) => {
    if (!selectedValues || !onSelectedValuesChange) return;

    const targetValues = value === 'all'
      ? Array.from(new Set((filteredOptions || []).flatMap(valuesForOption)))
      : valuesForOption(options?.find(opt => opt.value === value) ?? { value });

    if (targetValues.length === 0) return;
    const allSelected = targetValues.every(val => selectedValues.includes(val));
    if (allSelected) {
      onSelectedValuesChange(selectedValues.filter(v => !targetValues.includes(v)));
    } else {
      onSelectedValuesChange(Array.from(new Set([...selectedValues, ...targetValues])));
    }
  };

  const isOptionChecked = (option: { value: string; expandsTo?: string[] }) => {
    const values = valuesForOption(option);
    return values.length > 0 && values.every(v => selectedValues?.includes(v));
  };

  // Shortcut rows whose values are only partly selected get an indeterminate
  // box, so "Europe minus NL" stays visible as a partial selection.
  const isOptionPartial = (option: { value: string; expandsTo?: string[] }) => {
    const values = valuesForOption(option);
    return values.some(v => selectedValues?.includes(v)) && !values.every(v => selectedValues?.includes(v));
  };

  // Index of the last shortcut row, used to close off the group with a divider.
  const lastGroupIndex = (filteredOptions || []).reduce(
    (last, opt, i) => (opt.isGroup ? i : last),
    -1
  );

  // Rendered under the text inputs of columns that accept the expression
  // syntax. Deliberately spelled out rather than hidden behind a tooltip: the
  // operators are only discoverable if they are visible at the moment of
  // typing, and this panel is the only place a filter is ever entered.
  const expressionHint = !supportsExpression ? null : (
    <p className="text-[11px] leading-relaxed text-gray-500">
      <code className="px-1 bg-gray-100 rounded text-gray-700">|</code> = or
      <span className="mx-1.5 text-gray-300">·</span>
      <code className="px-1 bg-gray-100 rounded text-gray-700">&amp;&amp;</code> = and
      <span className="mx-1.5 text-gray-300">·</span>
      {/* "literal", not "exact": quotes only stop the operators from being read
          as operators — the match underneath stays a contains-search, so
          "CEO" still finds "Deputy CEO". */}
      <code className="px-1 bg-gray-100 rounded text-gray-700">&quot;&nbsp;&quot;</code> = literal
      <br />
      <span className="text-gray-400">e.g. directeur | eigenaar | CEO</span>
    </p>
  );

  const panel = (
    <div
      ref={panelRef}
      style={{
        // The placement is still null on the very first render, but the layout
        // effect below fills it in before the browser paints, so the panel is
        // never actually seen in this corner. Deliberately not hidden until
        // measured: `visibility: hidden` would swallow the search box's
        // autoFocus, which React applies before that effect runs.
        top: placement?.top ?? 0,
        left: placement?.left ?? 0,
        maxHeight: placement?.maxHeight,
        maxWidth: placement?.maxWidth,
      }}
      className="fixed bg-white border border-gray-300 rounded-md shadow-lg z-[100] min-w-64 flex flex-col column-filter-dropdown"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3 flex-1 min-h-0 flex flex-col overflow-y-auto">
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
            {expressionHint}
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
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            {/* Narrows the checkbox list only — it does not filter rows on its own. */}
            <input
              type="text"
              placeholder={`Search ${column} options...`}
              value={optionSearch}
              onChange={(e) => setOptionSearch(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm flex-shrink-0"
              autoFocus
            />
            <label className={`flex items-center text-sm p-1 rounded flex-shrink-0 ${optionsLoading ? 'text-gray-400' : 'hover:bg-gray-100 cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={filteredOptions?.length ? filteredOptions.every(isOptionChecked) : false}
                onChange={() => toggleOption('all')}
                disabled={optionsLoading}
                className="mr-2"
              />
              All{optionSearch ? ` (filtered)` : ''}
            </label>
            {(onIncludeEmptyChange || onNotEmptyChange) && (
              <div className="border-b border-gray-200 pb-2 mb-2 flex-shrink-0">
                {onIncludeEmptyChange && (
                  <label className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
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
                  <label className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
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
            {/* No fixed cap: the panel's own maxHeight bounds the list, so it
                grows into whatever room the viewport has. */}
            <div className="flex-1 min-h-[3rem] overflow-y-auto">
              {optionsLoading && loadingOptionsNotice}
              {!optionsLoading && filteredOptions?.map((option, index) => (
                <label
                  key={option.value}
                  className={`flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded ${option.isGroup ? 'font-medium text-gray-800' : ''} ${index === lastGroupIndex ? 'border-b border-gray-200 pb-2 mb-1' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isOptionChecked(option)}
                    ref={(el) => { if (el) el.indeterminate = isOptionPartial(option); }}
                    onChange={() => toggleOption(option.value)}
                    className="mr-2"
                  />
                  {renderOption ? renderOption(option) : option.label}
                </label>
              ))}
            </div>
            {onSearchChange && (
              <div className="space-y-1 border-t border-gray-200 pt-2 mt-2 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Filter by text..."
                  value={searchValue || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onClose?.()}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
                {expressionHint}
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
            {statusOptions && statusOptions.length > 0 && (
              <div className="border-t border-gray-200 pt-2 mt-2 flex-shrink-0">
                <p className="text-xs text-gray-500 font-medium mb-1">Source</p>
                <label className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
                  <input
                    type="radio"
                    name={`multiselect-status-${column}`}
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
                      name={`multiselect-status-${column}`}
                      checked={statusValue === opt.value}
                      onChange={() => onStatusChange?.(opt.value)}
                      className="mr-2"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {type === 'singleselect' && (
          <div className="space-y-1 flex-1 min-h-0 flex flex-col">
            <input
              type="text"
              placeholder={`Search ${column}...`}
              value={optionSearch}
              onChange={(e) => setOptionSearch(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm flex-shrink-0"
              autoFocus
            />
            <div className="flex-1 min-h-[3rem] overflow-y-auto mt-1">
              {optionsLoading && loadingOptionsNotice}
              {!optionsLoading && filteredOptions?.map(option => (
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
                <div className="border-t border-gray-200 mt-2 pt-2 flex-shrink-0">
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

        {type === 'multiselect-daterange' && (
          <div className="space-y-2">
            <div className="max-h-40 overflow-y-auto border-b border-gray-100 pb-2 mb-1">
              {onIncludeEmptyChange && (
                <label className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
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
                <label className="flex items-center text-sm p-1 hover:bg-gray-100 cursor-pointer rounded">
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
              {optionsLoading && loadingOptionsNotice}
              {!optionsLoading && options?.map(option => (
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
      <div className="border-t border-gray-200 p-2 flex justify-end flex-shrink-0">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Zero-height marker on the spot the panel used to occupy, spanning the
          header cell so both left- and right-aligned panels can be placed. */}
      <span ref={anchorRef} aria-hidden className="absolute top-full left-0 right-0 h-0" />
      {typeof document === 'undefined' ? null : createPortal(panel, document.body)}
    </>
  );
};

export default ColumnFilterDropdown;
