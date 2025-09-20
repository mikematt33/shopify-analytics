import { useState, useMemo } from "react";

export const usePagination = (data, initialPageSize = 25) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = data?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    if (!data) return [];
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    // Adjust current page if necessary to keep showing relevant data
    const newTotalPages = Math.ceil(totalItems / newPageSize);
    const currentItemIndex = (currentPage - 1) * pageSize;
    const newPage = Math.max(
      1,
      Math.ceil((currentItemIndex + 1) / newPageSize)
    );
    setCurrentPage(Math.min(newPage, newTotalPages));
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  return {
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    paginatedData,
    handlePageChange,
    handlePageSizeChange,
    resetPagination,
  };
};

export default usePagination;
