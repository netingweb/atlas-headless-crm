import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type Header,
  flexRender,
} from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { EntityDefinition } from '@crm-atlas/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DataTablePagination } from './data-table-pagination';
import { DataTableSearch } from './data-table-search';
import { DataTableExport, type ExportData } from './data-table-export';
import { cn } from '@/lib/utils';

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  searchableFields?: Array<{ name: string; searchable: boolean }>;
  entityDef?: EntityDefinition;
  enableSearch?: boolean;
  enableExport?: boolean;
  enablePagination?: boolean;
  enableSorting?: boolean;
  exportFilename?: string;
  className?: string;
  emptyMessage?: string;
}

// Component for sortable column headers
function DataTableColumnHeader<TData>({ header }: { header: Header<TData, unknown> }) {
  if (!header.column.getCanSort()) {
    return <>{flexRender(header.column.columnDef.header, header.getContext())}</>;
  }

  const sorted = header.column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => header.column.toggleSorting(header.column.getIsSorted() === 'asc')}
    >
      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
      {sorted === 'asc' ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}

// Helper function to filter data based on search query and searchable fields
function filterDataBySearchableFields<TData extends Record<string, unknown>>(
  data: TData[],
  searchQuery: string,
  searchableFields?: Array<{ name: string; searchable: boolean }>
): TData[] {
  if (!searchQuery.trim()) {
    return data;
  }

  const query = searchQuery.toLowerCase().trim();

  // If searchableFields is provided, only search in those fields
  if (searchableFields && searchableFields.length > 0) {
    const searchableFieldNames = searchableFields
      .filter((field) => field.searchable)
      .map((field) => field.name);

    return data.filter((row) => {
      return searchableFieldNames.some((fieldName) => {
        const value = row[fieldName];
        if (value === null || value === undefined) {
          return false;
        }
        const stringValue = String(value).toLowerCase();
        return stringValue.includes(query);
      });
    });
  }

  // Fallback: search in all fields if no searchableFields provided
  return data.filter((row) => {
    return Object.values(row).some((value) => {
      if (value === null || value === undefined) {
        return false;
      }
      const stringValue = String(value).toLowerCase();
      return stringValue.includes(query);
    });
  });
}

export function DataTable<TData extends Record<string, unknown>>({
  data,
  columns,
  searchableFields,
  entityDef,
  enableSearch = true,
  enableExport = true,
  enablePagination = true,
  enableSorting = true,
  exportFilename = 'export',
  className,
  emptyMessage = 'No results found',
}: DataTableProps<TData>) {
  const [searchQuery, setSearchQuery] = useState('');

  // Extract searchable fields from entityDef if provided
  const effectiveSearchableFields = useMemo(() => {
    if (searchableFields) {
      return searchableFields;
    }
    if (entityDef?.fields) {
      return entityDef.fields.map((field) => ({
        name: field.name,
        searchable: field.searchable ?? false,
      }));
    }
    return undefined;
  }, [searchableFields, entityDef]);

  // Filter data based on search query and searchable fields
  const filteredData = useMemo(() => {
    return filterDataBySearchableFields(data, searchQuery, effectiveSearchableFields);
  }, [data, searchQuery, effectiveSearchableFields]);

  // Enhance columns to enable sorting by default (unless explicitly disabled)
  const enhancedColumns = useMemo(() => {
    if (!enableSorting) {
      return columns;
    }
    return columns.map((col) => ({
      ...col,
      enableSorting: col.enableSorting !== false, // Enable sorting by default unless explicitly disabled
    }));
  }, [columns, enableSorting]);

  const table = useReactTable({
    data: filteredData,
    columns: enhancedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Prepare export data
  const exportData: ExportData[] = useMemo(() => {
    return filteredData.map((row) => {
      const exportRow: ExportData = {};
      columns.forEach((col) => {
        const key = col.id || ('accessorKey' in col ? (col.accessorKey as string) : null);
        if (key) {
          exportRow[key] = row[key] ?? '';
        }
      });
      return exportRow;
    });
  }, [filteredData, columns]);

  const exportColumns = useMemo(() => {
    return columns
      .filter((col) => col.id || ('accessorKey' in col && col.accessorKey))
      .map((col) => {
        const key = col.id || ('accessorKey' in col ? (col.accessorKey as string) : '');
        let headerLabel = '';
        if (typeof col.header === 'string') {
          headerLabel = col.header;
        } else if (col.header && typeof col.header === 'function') {
          // Try to extract label from function header (fallback to id/accessorKey)
          headerLabel = key;
        } else {
          headerLabel = key;
        }
        return {
          id: key,
          label: headerLabel || key || '',
        };
      });
  }, [columns]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Export Bar */}
      {(enableSearch || enableExport) && (
        <div className="flex items-center justify-between">
          {enableSearch && (
            <DataTableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search..."
            />
          )}
          {enableExport && (
            <DataTableExport data={exportData} filename={exportFilename} columns={exportColumns} />
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : enableSorting && header.column.getCanSort() ? (
                      <DataTableColumnHeader header={header} />
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <DataTablePagination
          pageIndex={table.getState().pagination.pageIndex}
          pageSize={table.getState().pagination.pageSize}
          totalRows={filteredData.length}
          onPageChange={table.setPageIndex}
          onPageSizeChange={table.setPageSize}
        />
      )}
    </div>
  );
}
