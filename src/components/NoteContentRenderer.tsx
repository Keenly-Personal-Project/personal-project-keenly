import React from "react";

interface NoteContentRendererProps {
  content: string;
}

const NoteContentRenderer: React.FC<NoteContentRendererProps> = ({ content }) => {
  const blocks = parseContent(content);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <React.Fragment key={i}>{renderBlock(block)}</React.Fragment>
      ))}
    </div>
  );
};

type Block =
  | { type: "text"; value: string }
  | { type: "image"; alt: string; src: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "chart"; data: { label: string; value: number }[] };

function parseContent(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Image: ![alt](src)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      blocks.push({ type: "image", alt: imgMatch[1], src: imgMatch[2] });
      i++;
      continue;
    }

    // Chart block
    if (line.trim() === "--- Chart Data ---") {
      const chartData: { label: string; value: number }[] = [];
      i++; // skip header line "Label, Value"
      if (i < lines.length) i++; // skip "Label, Value"
      while (i < lines.length && lines[i].trim() !== "--- End Chart ---") {
        const parts = lines[i].split(",").map((s) => s.trim());
        if (parts.length >= 2) {
          const val = parseFloat(parts[1]);
          if (!isNaN(val)) chartData.push({ label: parts[0], value: val });
        }
        i++;
      }
      if (chartData.length > 0) blocks.push({ type: "chart", data: chartData });
      i++;
      continue;
    }

    // Table: lines starting with |
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const parseLine = (l: string) =>
          l.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map((c) => c.trim());
        const headers = parseLine(tableLines[0]);
        // Skip separator line (index 1)
        const rows = tableLines.slice(2).map(parseLine);
        blocks.push({ type: "table", headers, rows });
      }
      continue;
    }

    // Plain text - group consecutive non-special lines
    let textLines: string[] = [];
    while (
      i < lines.length &&
      !lines[i].match(/^!\[([^\]]*)\]\(([^)]+)\)$/) &&
      !(lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) &&
      lines[i].trim() !== "--- Chart Data ---"
    ) {
      textLines.push(lines[i]);
      i++;
    }
    const text = textLines.join("\n").trim();
    if (text) blocks.push({ type: "text", value: text });
  }

  return blocks;
}

function renderBlock(block: Block) {
  switch (block.type) {
    case "text":
      return (
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{block.value}</p>
      );

    case "image":
      return (
        <div className="rounded-lg overflow-hidden border border-border">
          <img
            src={block.src}
            alt={block.alt}
            className="max-w-full h-auto max-h-96 object-contain mx-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).parentElement!.innerHTML =
                '<p class="text-sm text-destructive p-4">Failed to load image</p>';
            }}
          />
        </div>
      );

    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold text-foreground border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border last:border-0 hover:bg-muted/30">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "chart": {
      const max = Math.max(...block.data.map((d) => d.value), 1);
      return (
        <div className="rounded-lg border border-border p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Chart</p>
          {block.data.map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-foreground w-16 shrink-0 truncate">{d.label}</span>
              <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-primary rounded transition-all duration-500"
                  style={{ width: `${(d.value / max) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{d.value}</span>
            </div>
          ))}
        </div>
      );
    }
  }
}

export default NoteContentRenderer;
