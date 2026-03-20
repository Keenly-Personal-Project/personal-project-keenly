import React, { useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import EditableTable from "@/components/EditableTable";
import EditableChart, { ChartType, ChartDataItem, DataSet } from "@/components/EditableChart";
import ImageViewer from "@/components/ImageViewer";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NoteBlock {
  id: string;
  type: "text" | "image" | "table" | "chart" | "video" | "audio" | "file";
  data: any;
}

export interface NoteBlockEditorHandle {
  insertBlockAtCursor: (block: NoteBlock) => void;
}

interface NoteBlockEditorProps {
  blocks: NoteBlock[];
  onChange: (blocks: NoteBlock[]) => void;
}

const NoteBlockEditor = forwardRef<NoteBlockEditorHandle, NoteBlockEditorProps>(({ blocks, onChange }, ref) => {
  const focusedBlockRef = useRef<string | null>(null);
  const cursorPosRef = useRef<number>(0);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const updateBlock = (id: string, data: any) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, data } : b)));
  };

  const deleteBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const handleTextFocus = useCallback((blockId: string) => {
    focusedBlockRef.current = blockId;
  }, []);

  const handleTextSelect = useCallback((blockId: string, el: HTMLTextAreaElement) => {
    focusedBlockRef.current = blockId;
    cursorPosRef.current = el.selectionStart ?? 0;
  }, []);

  useImperativeHandle(ref, () => ({
    insertBlockAtCursor: (block: NoteBlock) => {
      const focusedId = focusedBlockRef.current;
      const focusedBlock = blocks.find(b => b.id === focusedId && b.type === "text");

      if (focusedBlock) {
        const content = focusedBlock.data.content || "";
        const pos = cursorPosRef.current;
        const before = content.substring(0, pos);
        const after = content.substring(pos);
        const idx = blocks.findIndex(b => b.id === focusedId);

        const newBlocks: NoteBlock[] = [];
        for (let i = 0; i < blocks.length; i++) {
          if (i === idx) {
            if (before.trim()) {
              newBlocks.push({ ...focusedBlock, data: { content: before } });
            }
            newBlocks.push(block);
            if (after.trim()) {
              newBlocks.push({ id: crypto.randomUUID(), type: "text", data: { content: after } });
            }
          } else {
            newBlocks.push(blocks[i]);
          }
        }
        // If before and after were both empty, just insert the block
        if (!before.trim() && !after.trim()) {
          const filtered = newBlocks.filter(b => b.id !== focusedId || b.type !== "text" || b.data.content.trim());
          onChange(filtered.length > 0 ? filtered : [block]);
        } else {
          onChange(newBlocks);
        }
      } else {
        // No focused text block, append
        onChange([...blocks, block]);
      }
    },
  }), [blocks, onChange]);

  return (
    <div className="space-y-0">
      {blocks.map((block) => (
        <div key={block.id}>
          {block.type === "text" && (
            <Textarea
              ref={(el) => { textareaRefs.current[block.id] = el; }}
              value={block.data.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              onFocus={() => handleTextFocus(block.id)}
              onSelect={(e) => handleTextSelect(block.id, e.target as HTMLTextAreaElement)}
              onClick={(e) => handleTextSelect(block.id, e.target as HTMLTextAreaElement)}
              onKeyUp={(e) => handleTextSelect(block.id, e.target as HTMLTextAreaElement)}
              placeholder="Start writing..."
              className="min-h-[40px] border-none shadow-none focus-visible:ring-0 px-0 resize-none text-base leading-relaxed"
              style={{ height: 'auto', overflow: 'hidden' }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }}
            />
          )}

          {block.type === "image" && (
            <div className="group relative rounded-lg overflow-hidden border border-border my-1">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 text-destructive" onClick={() => deleteBlock(block.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <img
                src={block.data.src}
                alt={block.data.alt}
                className="max-w-full h-auto max-h-96 object-contain mx-auto"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
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
              datasets={block.data.datasets}
              labels={block.data.labels}
              curveType={block.data.curveType}
              onChange={(chartType, data, extra) => updateBlock(block.id, { chartType, data, ...extra })}
              onDelete={() => deleteBlock(block.id)}
            />
          )}

          {block.type === "video" && (
            <div className="group relative rounded-lg overflow-hidden border border-border my-1">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 text-destructive" onClick={() => deleteBlock(block.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {block.data.isFile ? (
                <video controls className="w-full max-h-96">
                  <source src={block.data.fileUrl} />
                </video>
              ) : (
                <div className={block.data.isVertical ? "w-full max-w-[360px] mx-auto" : "w-full"} style={{ aspectRatio: block.data.isVertical ? "9/16" : "16/9" }}>
                  <iframe
                    src={block.data.embedUrl}
                    title={block.data.title || "Embedded video"}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )}

          {block.type === "audio" && (
            <div className="group relative rounded-lg border border-border my-1 p-3">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 text-destructive" onClick={() => deleteBlock(block.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{block.data.name || "Audio"}</p>
              <audio controls className="w-full">
                <source src={block.data.src} />
              </audio>
            </div>
          )}

          {block.type === "file" && (
            <div className="group relative rounded-lg border border-border my-1 p-3">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 text-destructive" onClick={() => deleteBlock(block.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {/* Inline preview for supported file types */}
              {block.data.mimeType?.startsWith("application/pdf") && (
                <iframe
                  src={block.data.src}
                  title={block.data.name || "PDF"}
                  className="w-full h-96 rounded border border-border mb-2"
                />
              )}
              {block.data.mimeType?.startsWith("image/") && (
                <img
                  src={block.data.src}
                  alt={block.data.name}
                  className="max-w-full max-h-96 object-contain mx-auto rounded mb-2"
                />
              )}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">
                    {block.data.mimeType?.startsWith("application/pdf") ? "PDF" :
                     block.data.mimeType?.startsWith("image/") ? "IMG" :
                     block.data.name?.split('.').pop()?.toUpperCase()?.slice(0, 4) || "FILE"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{block.data.name || "File"}</p>
                  <p className="text-xs text-muted-foreground">{block.data.size ? `${(block.data.size / 1024).toFixed(1)} KB` : ""}</p>
                </div>
                <a href={block.data.src} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-primary hover:underline shrink-0">
                  {block.data.mimeType?.startsWith("application/pdf") || block.data.mimeType?.startsWith("image/") ? "Open" : "Download"}
                </a>
              </div>
            </div>
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
          onFocus={() => { focusedBlockRef.current = null; }}
          placeholder="Start writing..."
          className="min-h-[40px] border-none shadow-none focus-visible:ring-0 px-0 resize-none text-base leading-relaxed"
        />
      )}
    </div>
  );
});

NoteBlockEditor.displayName = "NoteBlockEditor";

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
