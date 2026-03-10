import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Settings2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

export interface ChartDataItem {
  label: string;
  value: number;
}

interface EditableChartProps {
  chartType: ChartType;
  data: ChartDataItem[];
  onChange: (chartType: ChartType, data: ChartDataItem[]) => void;
  onDelete: () => void;
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "area", label: "Area Chart" },
  { value: "scatter", label: "Dot Chart" },
];

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(340, 65%, 55%)",
  "hsl(45, 80%, 50%)",
  "hsl(280, 55%, 55%)",
  "hsl(20, 70%, 55%)",
];

const EditableChart: React.FC<EditableChartProps> = ({ chartType, data, onChange, onDelete }) => {
  const [showEditor, setShowEditor] = useState(false);

  const updateItem = (idx: number, field: "label" | "value", val: string) => {
    const newData = data.map((d, i) =>
      i === idx ? { ...d, [field]: field === "value" ? (parseFloat(val) || 0) : val } : d
    );
    onChange(chartType, newData);
  };

  const addItem = () => {
    onChange(chartType, [...data, { label: `Item ${data.length + 1}`, value: 10 }]);
  };

  const removeItem = (idx: number) => {
    onChange(chartType, data.filter((_, i) => i !== idx));
  };

  const rechartData = data.map((d) => ({ name: d.label, value: d.value }));

  const renderChart = () => {
    const h = 250;
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={h}>
            <BarChart data={rechartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={h}>
            <LineChart data={rechartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={h}>
            <PieChart>
              <Pie data={rechartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {rechartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={h}>
            <AreaChart data={rechartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={h}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="value" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Scatter data={rechartData} fill="hsl(var(--primary))">
                {rechartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="group relative rounded-lg border border-border my-2 overflow-hidden">
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80" onClick={() => setShowEditor(!showEditor)}>
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-4">{renderChart()}</div>

      {showEditor && (
        <div className="border-t border-border p-3 bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Type:</span>
            <Select value={chartType} onValueChange={(v) => onChange(v as ChartType, data)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-2 text-xs font-medium text-muted-foreground px-1">
              <span className="flex-1">Label</span>
              <span className="w-20">Value</span>
              <span className="w-6" />
            </div>
            {data.map((d, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={d.label}
                  onChange={(e) => updateItem(i, "label", e.target.value)}
                  className="h-7 text-xs flex-1"
                />
                <Input
                  type="number"
                  value={d.value}
                  onChange={(e) => updateItem(i, "value", e.target.value)}
                  className="h-7 text-xs w-20"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeItem(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 w-full" onClick={addItem}>
              <Plus className="h-3 w-3" /> Add Data Point
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditableChart;
