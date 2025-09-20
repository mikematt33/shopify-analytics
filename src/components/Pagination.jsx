import React from "react";
import "./Pagination.css";

const Pagination = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  itemName = "items",
  scrollTargetRef,
}) => {
  const handlePageChangeWithScroll = (page) => {
    onPageChange(page);
    // Scroll to top of the content area when changing pages
    if (scrollTargetRef?.current) {
      scrollTargetRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      // Fallback: scroll to top of page
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const handlePageSizeChangeWithScroll = (newPageSize) => {
    onPageSizeChange(newPageSize);
    // Scroll to top when changing page size
    if (scrollTargetRef?.current) {
      scrollTargetRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    // Remove duplicates and invalid entries
    return rangeWithDots.filter((item, index, array) => {
      if (item === 1 && totalPages === 1) return true;
      if (item === 1) return index === 0 || array[index - 1] !== 1;
      if (item === totalPages)
        return index === array.length - 1 || array[index + 1] !== totalPages;
      return true;
    });
  };

  const visiblePages = totalPages > 1 ? getVisiblePages() : [];
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const PaginationControls = ({ showInfo = true }) => (
    <div className="pagination-wrapper">
      {showInfo && (
        <div className="pagination-info">
          <span>
            Showing {startItem}-{endItem} of {totalItems} {itemName}
          </span>
        </div>
      )}

      <div className="pagination-main">
        <div className="page-size-selector">
          <label htmlFor={`page-size-${showInfo ? "top" : "bottom"}`}>
            Items per page:
          </label>
          <select
            id={`page-size-${showInfo ? "top" : "bottom"}`}
            value={pageSize}
            onChange={(e) =>
              handlePageSizeChangeWithScroll(Number(e.target.value))
            }
            className="page-size-select"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => handlePageChangeWithScroll(currentPage - 1)}
              disabled={currentPage === 1}
              title="Previous page"
            >
              ‹
            </button>

            {visiblePages.map((page, index) => (
              <React.Fragment key={index}>
                {page === "..." ? (
                  <span className="pagination-dots">...</span>
                ) : (
                  <button
                    className={`pagination-btn ${
                      page === currentPage ? "active" : ""
                    }`}
                    onClick={() => handlePageChangeWithScroll(page)}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}

            <button
              className="pagination-btn"
              onClick={() => handlePageChangeWithScroll(currentPage + 1)}
              disabled={currentPage === totalPages}
              title="Next page"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="pagination-container">
      {/* Main pagination controls */}
      <PaginationControls showInfo={true} />
    </div>
  );
};

export default Pagination;
