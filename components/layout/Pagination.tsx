import React from 'react';
import { ClipLoader } from 'react-spinners';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onNext: () => void;
  onPrev: () => void;
  isCountLimited?: boolean; // Optional flag to show "+" when count is limited
  isCountLoading?: boolean; // Optional flag to show loading state for count
  currentItemsCount?: number; // Actual number of items currently loaded on the page
  // Pass both to render a rows-per-page picker; omit them and the pagination
  // renders exactly as it did before, so existing callers are unaffected.
  pageSizeOptions?: number[];
  onItemsPerPageChange?: (size: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onNext,
  onPrev,
  isCountLimited = false,
  isCountLoading = false,
  currentItemsCount,
  pageSizeOptions,
  onItemsPerPageChange,
}) => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  // Use currentItemsCount if provided and count is loading, otherwise calculate from totalItems
  const actualItemsOnPage = isCountLoading && currentItemsCount !== undefined ? currentItemsCount : Math.min(itemsPerPage, totalItems - startIndex);
  const endIndex = startIndex + actualItemsOnPage;
  const displayTotal = isCountLimited ? `${totalItems}+` : totalItems;

  return (
    <>
      <p className="mb-2 md:mb-0 px-2">
        Showing {startIndex + 1} – {endIndex} of {isCountLoading ? (
          <span className="inline-flex items-center gap-1">
            <ClipLoader size={12} color="#364570" />
          </span>
        ) : (
          displayTotal
        )}
      </p>
      <div className="flex items-center gap-2">
        {pageSizeOptions && onItemsPerPageChange && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500 mr-1">
            <span className="hidden sm:inline">Rows</span>
            <select
              value={itemsPerPage}
              onChange={e => onItemsPerPageChange(parseInt(e.target.value, 10))}
              className="h-[34px] border border-gray-300 rounded-md px-2 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#364570]"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        )}
        <button
          onClick={onPrev}
          disabled={currentPage === 1}
          className="m-2 mr-0 px-4 py-2 rounded btn btn-primary hover:bg-leadblocks-navy/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={isCountLoading ? false : (currentPage === totalPages || totalPages === 0)}
          className="m-2 ml-0 px-4 py-2 rounded btn btn-primary hover:bg-leadblocks-navy/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </>
  );
};

export default Pagination;