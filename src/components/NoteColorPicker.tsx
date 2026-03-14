import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const PRESET_COLORS = [
  "hsl(175, 70%, 40%)", "hsl(220, 70%, 50%)", "hsl(270, 60%, 55%)",
  "hsl(330, 65%, 55%)", "hsl(0, 65%, 55%)", "hsl(25, 85%, 55%)",
  "hsl(45, 85%, 50%)", "hsl(145, 60%, 42%)", "hsl(200, 80%, 50%)",
  "hsl(290, 50%, 50%)", "hsl(15, 90%, 60%)", "hsl(60, 80%, 45%)",
  "hsl(180, 50%, 35%)", "hsl(240, 60%, 60%)", "hsl(350, 80%, 45%)",
  "hsl(100, 50%, 40%)",
];

interface NoteColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const NoteColorPicker: React.FC<NoteColorPickerProps> = ({ value, onChange }) => {
  const [useGradient, setUseGradient] = useState(value.startsWith("linear-gradient"));
  const [gradientColor1, setGradientColor1] = useState("#14b8a6");
  const [gradientColor2, setGradientColor2] = useState("#6366f1");
  const [htmlColor, setHtmlColor] = useState(
    value.startsWith("linear-gradient") ? "#14b8a6" : (value.startsWith("#") ? value : "#14b8a6")
  );

  const handlePresetClick = (color: string) => {
    setUseGradient(false);
    onChange(color);
  };

  const handleHtmlColorChange = (color: string) => {
    setHtmlColor(color);
    if (!useGradient) onChange(color);
  };

  const handleGradientToggle = (enabled: boolean) => {
    setUseGradient(enabled);
    if (enabled) {
      onChange(`linear-gradient(135deg, ${gradientColor1}, ${gradientColor2})`);
    } else {
      onChange(htmlColor);
    }
  };

  const updateGradient = (c1: string, c2: string) => {
    setGradientColor1(c1);
    setGradientColor2(c2);
    if (useGradient) {
      onChange(`linear-gradient(135deg, ${c1}, ${c2})`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Preset Colors</Label>
        <div className="grid grid-cols-8 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handlePresetClick(color)}
              className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                !useGradient && value === color ? "border-foreground scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* HTML Color Picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Custom Color</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={htmlColor}
            onChange={(e) => handleHtmlColorChange(e.target.value)}
            className="h-10 w-14 rounded border border-border cursor-pointer"
          />
          <Input
            value={htmlColor}
            onChange={(e) => handleHtmlColorChange(e.target.value)}
            placeholder="#000000"
            className="flex-1 h-10"
          />
        </div>
      </div>

      {/* Gradient */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Gradient</Label>
          <Switch checked={useGradient} onCheckedChange={handleGradientToggle} />
        </div>
        {useGradient && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Color 1</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={gradientColor1}
                    onChange={(e) => updateGradient(e.target.value, gradientColor2)}
                    className="h-8 w-10 rounded border border-border cursor-pointer"
                  />
                  <Input value={gradientColor1} onChange={(e) => updateGradient(e.target.value, gradientColor2)} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Color 2</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={gradientColor2}
                    onChange={(e) => updateGradient(gradientColor1, e.target.value)}
                    className="h-8 w-10 rounded border border-border cursor-pointer"
                  />
                  <Input value={gradientColor2} onChange={(e) => updateGradient(gradientColor1, e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
            </div>
            {/* Preview */}
            <div
              className="h-8 rounded-lg border border-border"
              style={{ background: `linear-gradient(135deg, ${gradientColor1}, ${gradientColor2})` }}
            />
          </div>
        )}
      </div>

      {/* Current preview */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Current</Label>
        <div
          className="h-6 rounded-md border border-border"
          style={{ background: value }}
        />
      </div>
    </div>
  );
};

export default NoteColorPicker;
