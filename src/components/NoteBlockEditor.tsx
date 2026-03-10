import React, { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import EditableTable from "@/components/EditableTable";
import EditableChart, { ChartType, ChartDataItem } from "@/components/EditableChart";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NoteBlock {
  id: string;
  type: "text" | "image" | "table" | "chart";
  data: any;
}

// Text: { content: string }
// Image: { src: string, alt: string }
// Table: { headers: string[], rows: string[][] }
// Chart: { chartType: ChartType, data: ChartDataItem[] }

interface NoteBlockEditorProps {
  blocks: NoteBlock[];
  onChange: (blocks: NoteBlock[]) => void;
}

const NoteBlockEditor: React.FC<NoteBlockEditorProps> = ({ blocks, onChange }) => {
  const updateBlock = (id: string, data: any) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, data } : b)));
  };

  const deleteBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-1">
      {blocks.map((block) => (
        <div key={block.id}>
          {block.type === "text" && (
            <Textarea
              value={block.data.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Start writing..."
              className="min-h-[100px] border-none shadow-none focus-visible:ring-0 px-0 resize-none text-base leading-relaxed"
            />
          )}

          {block.type === "image" && (
            <div className="group relative rounded-lg overflow-hidden border border-border my-2">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-background/80 text-destructive"
                  onClick={() => deleteBlock(block.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <img
                src={block.data.src}
                alt={block.data.alt}
                className="max-w-full h-auto max-h-96 object-contain mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          {block.type === "table" && (
            <EditableTable
              headers={block.data.headers}
              rows={block.data.rows}
              onChange={(headers, rows) => updateBlock(block.id, { headers, rows })}
              onDelete={() => deleteBlock(block.id)}
            />
          )}

          {block.type === "chart" && (
            <EditableChart
              chartType={block.data.chartType}
              data={block.data.data}
              onChange={(chartType, data) => updateBlock(block.id, { chartType, data })}
              onDelete={() => deleteBlock(block.id)}
            />
          )}
        </div>
      ))}

      {/* If no blocks or last block isn't text, show an empty text area */}
      {(blocks.length === 0 || blocks[blocks.length - 1]?.type !== "text") && (
        <Textarea
          value=""
          onChange={(e) => {
            if (e.target.value) {
              onChange([
                ...blocks,
                { id: crypto.randomUUID(), type: "text", data: { content: e.target.value } },
              ]);
            }
          }}
          placeholder="Start writing..."
          className="min-h-[60px] border-none shadow-none focus-visible:ring-0 px-0 resize-none text-base leading-relaxed"
        />
      )}
    </div>
  );
};

export default NoteBlockEditor;

// Helper: convert legacy string content to blocks
export function legacyContentToBlocks(content: string): NoteBlock[] {
  if (!content.trim()) return [{ id: crypto.randomUUID(), type: "text", data: { content: "" } }];
  return [{ id: crypto.randomUUID(), type: "text", data: { content } }];
}

// Helper: extract plain text preview from blocks
export function blocksToPreviewText(blocks: NoteBlock[]): string {
  for (const b of blocks) {
    if (b.type === "text" && b.data.content?.trim()) {
      return b.data.content.trim().substring(0, 100);
    }
  }
  return "";
}

// Helper: serialize blocks to content string for storage
export function blocksToContent(blocks: NoteBlock[]): string {
  return JSON.stringify(blocks);
}

// Helper: deserialize content to blocks
export function contentToBlocks(content: string): NoteBlock[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
      return parsed;
    }
  } catch {}
  return legacyContentToBlocks(content);
}
