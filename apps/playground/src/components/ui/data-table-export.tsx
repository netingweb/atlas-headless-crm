import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ExportData {
  [key: string]: unknown;
}

interface DataTableExportProps {
  data: ExportData[];
  filename?: string;
  columns?: Array<{ id: string; label: string }>;
}

export function DataTableExport({ data, filename = 'export', columns }: DataTableExportProps) {
  const handleExportCSV = () => {
    if (data.length === 0) return;

    // Prepare data for CSV export
    const csvData = data.map((row) => {
      if (columns) {
        const csvRow: Record<string, unknown> = {};
        columns.forEach((col) => {
          csvRow[col.label] = row[col.id] ?? '';
        });
        return csvRow;
      }
      return row;
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (data.length === 0) return;

    // Prepare data for Excel export
    let exportData: ExportData[];
    if (columns) {
      exportData = data.map((row) => {
        const excelRow: Record<string, unknown> = {};
        columns.forEach((col) => {
          excelRow[col.label] = row[col.id] ?? '';
        });
        return excelRow;
      });
    } else {
      exportData = data;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>Export as Excel</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
