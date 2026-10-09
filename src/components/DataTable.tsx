import React from 'react';
import {
  Table,
  flexRender,
  HeaderGroup,
  Row,
  Cell,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Skeleton from './Skeleton';

interface ExternalPagination {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<TData> {
  table: Table<TData>;
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  renderExpandedRow?: (row: TData) => React.ReactNode;
  stickyHeader?: boolean;
  className?: string;
  /** Kept for API compatibility; layout is always a single bordered table. */
  tableClassName?: string;
  skeletonRows?: number;
  pagination?: ExternalPagination;
  emptyMessage?: string;
}

export default function DataTable<TData>({
  table,
  loading = false,
  onRowClick,
  renderExpandedRow,
  stickyHeader = false,
  className = '',
  skeletonRows = 5,
  pagination,
  emptyMessage = 'No data available'
}: DataTableProps<TData>) {
  const columnsCount = table.getAllColumns().length;
  const hasInternalPagination = table.getPageCount() > 0 && table.getState().pagination != null;
  const currentPage = pagination?.page ?? (hasInternalPagination ? table.getState().pagination.pageIndex + 1 : 1);
  const totalPages = pagination?.totalPages ?? (hasInternalPagination ? Math.max(1, table.getPageCount()) : 1);

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) =>
    totalPages <= 7 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
  );

  const changePage = (page: number) => {
    if (pagination) {
      pagination.onPageChange(page);
      return;
    }
    table.setPageIndex(page - 1);
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead className={stickyHeader ? 'sticky top-0 z-20' : ''}>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
              <tr key={headerGroup.id} className="bg-olive-50/80 backdrop-blur">
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const sortingState = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className="h-10 px-4 text-xs font-medium text-olive-500 border-b border-olive-200 whitespace-nowrap"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={isSortable ? 'cursor-pointer select-none inline-flex items-center gap-1.5 group hover:text-olive-900' : 'flex items-center gap-1.5'}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {isSortable && (
                            <span className="text-olive-400">
                              {sortingState === 'asc' ? (
                                <ArrowUp size={12} />
                              ) : sortingState === 'desc' ? (
                                <ArrowDown size={12} />
                              ) : (
                                <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-olive-100">
                  {Array.from({ length: columnsCount }).map((_, j) => (
                    <td key={`skeleton-cell-${j}`} className="px-4 py-3.5">
                      <Skeleton variant="text" className={j === 0 ? 'w-3/4' : 'w-1/2'} />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columnsCount} className="py-16 text-center text-olive-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row: Row<TData>) => (
                <React.Fragment key={row.id}>
                  <tr
                    className={[
                      'group border-b border-olive-100 transition-colors',
                      onRowClick ? 'cursor-pointer hover:bg-olive-50/70' : '',
                      row.getIsExpanded() ? 'bg-olive-50/70' : '',
                      row.getIsSelected() ? 'bg-brand-50/50' : '',
                    ].join(' ')}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell: Cell<TData, unknown>) => (
                      <td key={cell.id} className="px-4 py-3 align-middle text-olive-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {renderExpandedRow && row.getIsExpanded() && (
                    <tr className="bg-olive-50/50 border-b border-olive-100">
                      <td colSpan={columnsCount} className="p-0 animate-fadeIn">
                        {renderExpandedRow(row.original)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-4 border-t border-olive-200 px-4 h-12 shrink-0">
          <span className="text-xs text-olive-500 tabular-nums">
            Page {currentPage} of {totalPages}
          </span>

          <div className="flex items-center gap-1">
            <button
              aria-label="Previous page"
              className="icon-btn disabled:opacity-30 disabled:hover:bg-transparent"
              disabled={currentPage <= 1}
              onClick={() => changePage(currentPage - 1)}
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers.map((page, index) => {
              const previousPage = pageNumbers[index - 1];
              const showGap = previousPage != null && page - previousPage > 1;
              return (
                <React.Fragment key={page}>
                  {showGap ? <span className="w-6 text-center text-xs text-olive-400">…</span> : null}
                  <button
                    aria-current={page === currentPage ? 'page' : undefined}
                    className={`h-8 min-w-8 px-2 rounded-md text-xs font-medium tabular-nums transition-colors ${page === currentPage
                      ? 'bg-olive-900 text-white'
                      : 'text-olive-600 hover:bg-olive-100 hover:text-olive-900'
                      }`}
                    onClick={() => changePage(page)}
                    type="button"
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}
            <button
              aria-label="Next page"
              className="icon-btn disabled:opacity-30 disabled:hover:bg-transparent"
              disabled={currentPage >= totalPages}
              onClick={() => changePage(currentPage + 1)}
              type="button"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
