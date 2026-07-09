import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export type LedgerRow = {
  date: string; // yyyy-mm-dd
  type: "income" | "expense";
  category: string;
  note: string;
  amount: number; // signed: +income, -expense
  balance?: number;
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

const csvEscape = (v: unknown) => {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function exportCSV(rows: LedgerRow[], filename: string, showBalance = false) {
  const header = ["Date", "Type", "Category", "Note", "Amount", ...(showBalance ? ["Balance"] : [])];
  const lines = [header.join(",")];
  for (const r of rows) {
    const row = [r.date, r.type, r.category, r.note, r.amount.toFixed(2)];
    if (showBalance) row.push((r.balance ?? 0).toFixed(2));
    lines.push(row.map(csvEscape).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

export function exportXLSX(rows: LedgerRow[], filename: string, showBalance = false) {
  const data = rows.map((r) => {
    const o: Record<string, unknown> = {
      Date: r.date,
      Type: r.type,
      Category: r.category,
      Note: r.note,
      Amount: r.amount,
    };
    if (showBalance) o.Balance = r.balance ?? 0;
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ledger");
  XLSX.writeFile(wb, filename);
}

export function exportPDF(opts: {
  title: string;
  filename: string;
  rows: LedgerRow[];
  currency: string;
  showBalance?: boolean;
  summary?: { label: string; value: string }[];
}) {
  const { title, filename, rows, showBalance, summary } = opts;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${format(new Date(), "PPpp")}`, 14, 22);
  doc.setTextColor(0);

  let y = 28;
  if (summary?.length) {
    doc.setFontSize(10);
    summary.forEach((s, i) => {
      doc.text(`${s.label}: ${s.value}`, 14 + (i % 3) * 65, y + Math.floor(i / 3) * 6);
    });
    y += Math.ceil(summary.length / 3) * 6 + 4;
  }

  const head = [["Date", "Type", "Category", "Note", "Amount", ...(showBalance ? ["Balance"] : [])]];
  const body = rows.map((r) => {
    const row: (string | number)[] = [
      r.date,
      r.type,
      r.category,
      r.note,
      r.amount.toFixed(2),
    ];
    if (showBalance) row.push((r.balance ?? 0).toFixed(2));
    return row;
  });

  autoTable(doc, {
    head,
    body,
    startY: y,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 20, 40], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    columnStyles: {
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  doc.save(filename);
}
