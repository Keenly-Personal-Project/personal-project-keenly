import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface EditableTableProps {
  headers: string[];
  rows: string[][];
  onChange: (headers: string[], rows: string[][]) => void;
  onDelete: () => void;
}

const EditableTable: React.FC<EditableTableProps> = ({ headers, rows, onChange, onDelete }) => {
  const updateHeader = (idx: number, val: string) => {
    const h = [...headers];
    h[idx] = val;
    onChange(h, rows);
  };

  const updateCell = (ri: number, ci: number, val: string) => {
    const r = rows.map((row) => [...row]);
    r[ri][ci] = val;
    onChange(headers, r);
  };

  const addRow = () => {
    onChange(headers, [...rows, Array(headers.length).fill("")]);
  };

  const addColumn = () => {
    onChange([...headers, `Header ${headers.length + 1}`], rows.map((r) => [...r, ""]));
  };

  const deleteRow = (ri: number) => {
    onChange(headers, rows.filter((_, i) => i !== ri));
  };

  const deleteColumn = (ci: number) => {
    if (headers.length <= 1) return;
    onChange(headers.filter((_, i) => i !== ci), rows.map((row) => row.filter((_, i) => i !== ci)));
  };

  return (
    <div className="group relative rounded-lg border border-border overflow-hidden my-2">
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete} title="Delete table">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((h, i) => (
                <th key={i} className="border-b border-r border-border last:border-r-0 p-0">
                  <input
                    value={h}
                    onChange={(e) => updateHeader(i, e.target.value)}
                    className="w-full px-3 py-2 bg-transparent font-semibold text-foreground outline-none min-w-[80px]"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="border-r border-border last:border-r-0 p-0">
                    <input
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className="w-full px-3 py-2 bg-transparent text-foreground outline-none min-w-[80px]"
                      placeholder="..."
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-1 p-1 bg-muted/20">
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addRow}>
          <Plus className="h-3 w-3" /> Row
        </Button>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addColumn}>
          <Plus className="h-3 w-3" /> Column
        </Button>
      </div>
    </div>
  );
};

export default EditableTable;
