import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, FileType2 } from "lucide-react";
import { exportCSV, exportXLSX, exportPDF, type LedgerRow } from "@/lib/export-utils";

type Props = {
  rows: LedgerRow[];
  filenameBase: string;
  title: string;
  currency: string;
  showBalance?: boolean;
  summary?: { label: string; value: string }[];
};

export function ExportMenu({ rows, filenameBase, title, currency, showBalance, summary }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-2xl">
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl">
        <DropdownMenuItem onClick={() => exportCSV(rows, `${filenameBase}.csv`, showBalance)}>
          <FileText className="h-4 w-4 mr-2" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportXLSX(rows, `${filenameBase}.xlsx`, showBalance)}>
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            exportPDF({
              title,
              filename: `${filenameBase}.pdf`,
              rows,
              currency,
              showBalance,
              summary,
            })
          }
        >
          <FileType2 className="h-4 w-4 mr-2" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
