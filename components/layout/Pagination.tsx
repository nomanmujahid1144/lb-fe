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
      <div className="flex gap-2">
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