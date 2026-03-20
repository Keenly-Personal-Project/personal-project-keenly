import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Type, Baseline, Paintbrush,
} from "lucide-react";

export interface TextFormat {
  fontSize: number;
  lineHeight: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  color: string;
  backgroundColor: string;
}

export const defaultTextFormat: TextFormat = {
  fontSize: 16,
  lineHeight: 1.6,
  bold: false,
  italic: false,
  underline: false,
  align: "left",
  color: "",
  backgroundColor: "",
};

const COLOR_PALETTE = [
  "", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#000000", "#6b7280", "#ffffff",
];

interface TextFormattingToolbarProps {
  format: TextFormat;
  onChange: (format: TextFormat) => void;
}

const TextFormattingToolbar = ({ format, onChange }: TextFormattingToolbarProps) => {
  const update = (partial: Partial<TextFormat>) => onChange({ ...format, ...partial });

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {/* Bold / Italic / Underline */}
      <Button
        variant={format.bold ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => update({ bold: !format.bold })}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={format.italic ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => update({ italic: !format.italic })}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={format.underline ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => update({ underline: !format.underline })}
        title="Underline"
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Alignment */}
      <Button
        variant={format.align === "left" ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => update({ align: "left" })}
        title="Align Left"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={format.align === "center" ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => update({ align: "center" })}
        title="Align Center"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={format.align === "right" ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => update({ align: "right" })}
        title="Align Right"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Font size */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" title="Font Size">
            <Type className="h-3.5 w-3.5" />
            {format.fontSize}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" align="start">
          <p className="text-xs text-muted-foreground mb-2">Font Size: {format.fontSize}px</p>
          <Slider
            value={[format.fontSize]}
            onValueChange={([v]) => update({ fontSize: v })}
            min={10}
            max={36}
            step={1}
          />
        </PopoverContent>
      </Popover>

      {/* Line spacing */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" title="Line Spacing">
            <Baseline className="h-3.5 w-3.5" />
            {format.lineHeight.toFixed(1)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" align="start">
          <p className="text-xs text-muted-foreground mb-2">Line Height: {format.lineHeight.toFixed(1)}</p>
          <Slider
            value={[format.lineHeight * 10]}
            onValueChange={([v]) => update({ lineHeight: v / 10 })}
            min={10}
            max={30}
            step={1}
          />
        </PopoverContent>
      </Popover>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Text color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 relative" title="Text Color">
            <Type className="h-3.5 w-3.5" />
            {format.color && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full" style={{ backgroundColor: format.color }} />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <p className="text-xs text-muted-foreground mb-1.5">Text Color</p>
          <div className="grid grid-cols-6 gap-1">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c || "default-text"}
                className={`h-6 w-6 rounded border border-border transition-all ${format.color === c ? "ring-2 ring-primary ring-offset-1" : "hover:scale-110"}`}
                style={{ backgroundColor: c || "transparent" }}
                onClick={() => update({ color: c })}
                title={c || "Default"}
              >
                {!c && <span className="text-[8px] text-muted-foreground">Auto</span>}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Background color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 relative" title="Background Color">
            <Paintbrush className="h-3.5 w-3.5" />
            {format.backgroundColor && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full" style={{ backgroundColor: format.backgroundColor }} />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <p className="text-xs text-muted-foreground mb-1.5">Background Color</p>
          <div className="grid grid-cols-6 gap-1">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c || "default-bg"}
                className={`h-6 w-6 rounded border border-border transition-all ${format.backgroundColor === c ? "ring-2 ring-primary ring-offset-1" : "hover:scale-110"}`}
                style={{ backgroundColor: c || "transparent" }}
                onClick={() => update({ backgroundColor: c })}
                title={c || "None"}
              >
                {!c && <span className="text-[8px] text-muted-foreground">None</span>}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TextFormattingToolbar;
