import React from 'react';
import {
  Table,
  flexRender,
  HeaderGroup,
  Row,
  Cell,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
  tableClassName = '',
  skeletonRows = 5,
  pagination,
  emptyMessage = 'No data available'
}: DataTableProps<TData>) {
  const columnsCount = table.getAllColumns().length;
  const hasInternalPagination = table.getPageCount() > 0 && table.getState().pagination != null;
  const currentPage = pagination?.page ?? (hasInternalPagination ? table.getState().pagination.pageIndex + 1 : 1);
  const totalPages = pagination?.totalPages ?? (hasInternalPagination ? Math.max(1, table.getPageCount()) : 1);

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => {
    if (totalPages <= 7) {
      return true;
    }

    return (
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1
    );
  });

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
        <table className={`w-full text-left ${tableClassName || 'border-separate border-spacing-y-2'}`}>
          <thead className={stickyHeader ? 'sticky top-0 z-20 shadow-sm' : ''}>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
              <tr key={headerGroup.id} className="bg-olive-50 ">
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const sortingState = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-[0.63rem] font-bold uppercase tracking-[0.15em] text-olive-500  first:rounded-l-xl last:rounded-r-xl border-b border-olive-200 "
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          {...{
                            className: isSortable
                              ? 'cursor-pointer select-none flex items-center gap-2 group'
                              : 'flex items-center gap-2',
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {isSortable && (
                            <div className="text-olive-300  group-hover:text-olive-500 transition-colors">
                              {sortingState === 'asc' ? (
                                <ArrowUp size={14} />
                              ) : sortingState === 'desc' ? (
                                <ArrowDown size={14} />
                              ) : (
                                <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-olive-50 ">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="bg-white  shadow-sm border border-olive-50 ">
                  {Array.from({ length: columnsCount }).map((_, j) => (
                    <td key={`skeleton-cell-${j}`} className="px-6 py-4 border-y border-transparent first:rounded-l-xl last:rounded-r-xl">
                      <Skeleton variant="text" className="w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columnsCount} className="py-20 text-center text-olive-400 ">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row: Row<TData>) => (
                <React.Fragment key={row.id}>
                  <tr
                    className={`group transition-all duration-300 relative bg-white  shadow-sm border border-olive-100  hover:border-olive-500/30  ${onRowClick ? 'cursor-pointer' : ''
                      } ${row.getIsExpanded()
                        ? 'ring-1 ring-inset ring-olive-500/10  bg-olive-50/80  border-l-[6px] border-l-olive-600'
                        : ''
                      }`}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell: Cell<TData, unknown>) => (
                      <td
                        key={cell.id}
                        className={`px-6 py-4 align-middle border-y border-transparent transition-all duration-300 ${!tableClassName.includes('border-spacing-y-0') && !tableClassName.includes('border-collapse')
                          ? 'first:rounded-l-xl last:rounded-r-xl'
                          : 'first:border-l last:border-r border-olive-100'
                          }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {renderExpandedRow && (
                    <tr
                      className={`transition-all duration-500 ease-in-out ${row.getIsExpanded()
                        ? 'bg-olive-50/80  border-x border-b border-olive-100  opacity-100'
                        : 'opacity-0 invisible pointer-events-none'
                        }`}
                    >
                      <td colSpan={columnsCount} className="p-0">
                        <div
                          className={`grid transition-all duration-500 ease-in-out ${row.getIsExpanded() ? 'grid-rows-[1fr] py-0' : 'grid-rows-[0fr]'
                            }`}
                        >
                          <div className="overflow-hidden">
                            {renderExpandedRow(row.original)}
                          </div>
                        </div>
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
        <div className="flex items-center justify-between gap-4 border-t border-olive-200 bg-white/50  backdrop-blur-md px-6 py-4  shadow-[0_-1px_3px_0_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2">
            <span className="text-[0.68rem] font-bold uppercase tracking-widest text-olive-400 ">Page</span>
            <div className="flex items-center px-3 py-1 rounded-full bg-olive-100  border border-olive-200  shadow-inner">
              <span className="text-[0.75rem] font-bold text-olive-900 ">{currentPage}</span>
              <span className="mx-1.5 text-[11px] text-olive-400  font-bold">/</span>
              <span className="text-[0.75rem] font-bold text-olive-500 ">{totalPages}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-olive-100/50  border border-olive-200/50 ">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg text-olive-400 transition-all hover:bg-white  hover:text-olive-600  disabled:opacity-20 disabled:hover:bg-transparent"
                disabled={currentPage <= 1}
                onClick={() => changePage(1)}
                title="First Page"
                type="button"
              >
                <ChevronsLeft size={18} strokeWidth={2.5} />
              </button>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg text-olive-400 transition-all hover:bg-white  hover:text-olive-600  disabled:opacity-20 disabled:hover:bg-transparent"
                disabled={currentPage <= 1}
                onClick={() => changePage(currentPage - 1)}
                title="Previous Page"
                type="button"
              >
                <ChevronLeft size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2">
              {pageNumbers.map((page, index) => {
                const previousPage = pageNumbers[index - 1];
                const showGap = previousPage != null && page - previousPage > 1;

                return (
                  <React.Fragment key={page}>
                    {showGap ? (
                      <span className="w-6 text-center text-xs font-bold text-olive-300  tracking-widest">...</span>
                    ) : null}
                    <button
                      className={`flex h-9 min-w-[36px] items-center justify-center rounded-lg px-2 text-[0.72rem] font-bold transition-all duration-200 ${page === currentPage
                        ? 'bg-olive-900 text-white shadow-lg shadow-olive-900/20 scale-110 z-10'
                        : 'text-olive-500 hover:bg-white  hover:text-olive-900'
                        }`}
                      onClick={() => changePage(page)}
                      type="button"
                    >
                      {page.toString().padStart(2, '0')}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="flex items-center p-1 rounded-xl bg-olive-100/50  border border-olive-200/50 ">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg text-olive-400 transition-all hover:bg-white  hover:text-olive-600  disabled:opacity-20 disabled:hover:bg-transparent"
                disabled={currentPage >= totalPages}
                onClick={() => changePage(currentPage + 1)}
                title="Next Page"
                type="button"
              >
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg text-olive-400 transition-all hover:bg-white  hover:text-olive-600  disabled:opacity-20 disabled:hover:bg-transparent"
                disabled={currentPage >= totalPages}
                onClick={() => changePage(totalPages)}
                title="Last Page"
                type="button"
              >
                <ChevronsRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}