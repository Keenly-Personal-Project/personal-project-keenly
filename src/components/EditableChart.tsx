import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

export type ChartType = "bar" | "line" | "pie" | "area" | "scatter" | "cumulative" | "histogram" | "donut" | "stackedBar";

export interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
}

export interface DataSet {
  name: string;
  color: string;
  values: number[];
}

interface ChartBlockData {
  chartType: ChartType;
  data: ChartDataItem[];
  datasets?: DataSet[];
  labels?: string[];
  curveType?: "monotone" | "linear";
}

interface EditableChartProps {
  chartType: ChartType;
  data: ChartDataItem[];
  datasets?: DataSet[];
  labels?: string[];
  curveType?: "monotone" | "linear";
  onChange: (chartType: ChartType, data: ChartDataItem[], extra?: { datasets?: DataSet[]; labels?: string[]; curveType?: "monotone" | "linear" }) => void;
  onDelete: () => void;
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "area", label: "Area Chart" },
  { value: "scatter", label: "Dot Chart" },
  { value: "cumulative", label: "Cumulative Frequency" },
  { value: "histogram", label: "Histogram" },
  { value: "donut", label: "Donut Chart" },
  { value: "stackedBar", label: "Stacked Bar Chart" },
];

const DEFAULT_COLORS = [
  "#6366f1", "#f43f5e", "#3b82f6", "#22c55e",
  "#eab308", "#a855f7", "#f97316", "#06b6d4",
];

const MULTI_DATASET_TYPES: ChartType[] = ["line", "area", "stackedBar"];

const EditableChart: React.FC<EditableChartProps> = ({
  chartType, data, datasets, labels, curveType = "monotone", onChange, onDelete,
}) => {
  const [showEditor, setShowEditor] = useState(false);
  const isMulti = MULTI_DATASET_TYPES.includes(chartType);

  // Ensure datasets/labels exist for multi-dataset types
  const effectiveLabels = labels && labels.length > 0 ? labels : data.map(d => d.label);
  const effectiveDatasets = datasets && datasets.length > 0 ? datasets : [{
    name: "Series 1",
    color: DEFAULT_COLORS[0],
    values: data.map(d => d.value),
  }];

  const fireChange = (
    ct: ChartType,
    d: ChartDataItem[],
    ds?: DataSet[],
    lb?: string[],
    cv?: "monotone" | "linear"
  ) => {
    onChange(ct, d, { datasets: ds, labels: lb, curveType: cv });
  };

  // Single dataset helpers
  const updateItem = (idx: number, field: "label" | "value" | "color", val: string) => {
    const newData = data.map((d, i) =>
      i === idx ? { ...d, [field]: field === "value" ? (parseFloat(val) || 0) : val } : d
    );
    fireChange(chartType, newData, datasets, labels, curveType);
  };

  const addItem = () => {
    const newData = [...data, { label: `Item ${data.length + 1}`, value: 10 }];
    // Also extend datasets
    const newDs = effectiveDatasets.map(ds => ({ ...ds, values: [...ds.values, 10] }));
    const newLb = [...effectiveLabels, `Item ${data.length + 1}`];
    fireChange(chartType, newData, newDs, newLb, curveType);
  };

  const removeItem = (idx: number) => {
    const newData = data.filter((_, i) => i !== idx);
    const newDs = effectiveDatasets.map(ds => ({ ...ds, values: ds.values.filter((_, i) => i !== idx) }));
    const newLb = effectiveLabels.filter((_, i) => i !== idx);
    fireChange(chartType, newData, newDs, newLb, curveType);
  };

  // Multi-dataset helpers
  const updateLabel = (idx: number, val: string) => {
    const newLb = effectiveLabels.map((l, i) => i === idx ? val : l);
    const newData = data.map((d, i) => i === idx ? { ...d, label: val } : d);
    fireChange(chartType, newData, effectiveDatasets, newLb, curveType);
  };

  const updateDatasetValue = (dsIdx: number, valIdx: number, val: string) => {
    const newDs = effectiveDatasets.map((ds, i) =>
      i === dsIdx ? { ...ds, values: ds.values.map((v, j) => j === valIdx ? (parseFloat(val) || 0) : v) } : ds
    );
    fireChange(chartType, data, newDs, effectiveLabels, curveType);
  };

  const updateDatasetName = (dsIdx: number, name: string) => {
    const newDs = effectiveDatasets.map((ds, i) => i === dsIdx ? { ...ds, name } : ds);
    fireChange(chartType, data, newDs, effectiveLabels, curveType);
  };

  const updateDatasetColor = (dsIdx: number, color: string) => {
    const newDs = effectiveDatasets.map((ds, i) => i === dsIdx ? { ...ds, color } : ds);
    fireChange(chartType, data, newDs, effectiveLabels, curveType);
  };

  const addDataset = () => {
    const newDs = [...effectiveDatasets, {
      name: `Series ${effectiveDatasets.length + 1}`,
      color: DEFAULT_COLORS[effectiveDatasets.length % DEFAULT_COLORS.length],
      values: effectiveLabels.map(() => 10),
    }];
    fireChange(chartType, data, newDs, effectiveLabels, curveType);
  };

  const removeDataset = (dsIdx: number) => {
    if (effectiveDatasets.length <= 1) return;
    fireChange(chartType, data, effectiveDatasets.filter((_, i) => i !== dsIdx), effectiveLabels, curveType);
  };

  const addMultiItem = () => {
    const newLb = [...effectiveLabels, `Item ${effectiveLabels.length + 1}`];
    const newDs = effectiveDatasets.map(ds => ({ ...ds, values: [...ds.values, 10] }));
    const newData = [...data, { label: `Item ${data.length + 1}`, value: 10 }];
    fireChange(chartType, newData, newDs, newLb, curveType);
  };

  const removeMultiItem = (idx: number) => {
    const newLb = effectiveLabels.filter((_, i) => i !== idx);
    const newDs = effectiveDatasets.map(ds => ({ ...ds, values: ds.values.filter((_, i) => i !== idx) }));
    const newData = data.filter((_, i) => i !== idx);
    fireChange(chartType, newData, newDs, newLb, curveType);
  };

  // Build recharts data
  const buildMultiData = () => {
    return effectiveLabels.map((label, i) => {
      const entry: any = { name: label };
      effectiveDatasets.forEach((ds, j) => {
        entry[`ds${j}`] = ds.values[i] ?? 0;
      });
      return entry;
    });
  };

  const singleData = data.map(d => ({ name: d.label, value: d.value, fill: d.color }));

  const cumulativeData = (() => {
    let sum = 0;
    return data.map(d => { sum += d.value; return { name: d.label, value: sum }; });
  })();

  const h = 250;
  const curve = curveType || "monotone";

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={h}>
            <BarChart data={singleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {singleData.map((d, i) => (
                  <Cell key={i} fill={d.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case "histogram":
        return (
          <ResponsiveContainer width="100%" height={h}>
            <BarChart data={singleData} barCategoryGap={0}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Bar dataKey="value">
                {singleData.map((d, i) => (
                  <Cell key={i} fill={d.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case "line": {
        const multiData = buildMultiData();
        return (
          <ResponsiveContainer width="100%" height={h}>
            <LineChart data={multiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Legend />
              {effectiveDatasets.map((ds, i) => (
                <Line key={i} type={curve} dataKey={`ds${i}`} name={ds.name} stroke={ds.color} strokeWidth={2} dot={{ r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      }
      case "area": {
        const multiData = buildMultiData();
        return (
          <ResponsiveContainer width="100%" height={h}>
            <AreaChart data={multiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Legend />
              {effectiveDatasets.map((ds, i) => (
                <Area key={i} type={curve} dataKey={`ds${i}`} name={ds.name} stroke={ds.color} fill={ds.color + "33"} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      }
      case "stackedBar": {
        const multiData = buildMultiData();
        return (
          <ResponsiveContainer width="100%" height={h}>
            <BarChart data={multiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Legend />
              {effectiveDatasets.map((ds, i) => (
                <Bar key={i} dataKey={`ds${i}`} name={ds.name} stackId="a" fill={ds.color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={h}>
            <PieChart>
              <Pie data={singleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {singleData.map((d, i) => (
                  <Cell key={i} fill={d.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "donut":
        return (
          <ResponsiveContainer width="100%" height={h}>
            <PieChart>
              <Pie data={singleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
                {singleData.map((d, i) => (
                  <Cell key={i} fill={d.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "cumulative":
        return (
          <ResponsiveContainer width="100%" height={h}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={DEFAULT_COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
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
              <Scatter data={singleData} fill={DEFAULT_COLORS[0]}>
                {singleData.map((d, i) => (
                  <Cell key={i} fill={d.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );
    }
  };

  const renderEditor = () => {
    if (isMulti) {
      return (
        <div className="space-y-3">
          {/* Curve toggle for line/area */}
          {(chartType === "line" || chartType === "area") && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Curved line</Label>
              <Switch
                checked={curveType === "monotone"}
                onCheckedChange={(v) => fireChange(chartType, data, effectiveDatasets, effectiveLabels, v ? "monotone" : "linear")}
              />
            </div>
          )}

          {/* Datasets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Data Sets</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addDataset}>
                <Plus className="h-3 w-3" /> Add Set
              </Button>
            </div>
            {effectiveDatasets.map((ds, dsIdx) => (
              <div key={dsIdx} className="border border-border rounded-md p-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={ds.color}
                    onChange={(e) => updateDatasetColor(dsIdx, e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                  />
                  <Input
                    value={ds.name}
                    onChange={(e) => updateDatasetName(dsIdx, e.target.value)}
                    className="h-6 text-xs flex-1"
                  />
                  {effectiveDatasets.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeDataset(dsIdx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {effectiveLabels.map((lb, vi) => (
                    <div key={vi} className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground truncate w-16">{lb}</span>
                      <Input
                        type="number"
                        value={ds.values[vi] ?? 0}
                        onChange={(e) => updateDatasetValue(dsIdx, vi, e.target.value)}
                        className="h-6 text-xs flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Labels */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Labels</span>
            {effectiveLabels.map((lb, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input value={lb} onChange={(e) => updateLabel(i, e.target.value)} className="h-7 text-xs flex-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeMultiItem(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 w-full" onClick={addMultiItem}>
              <Plus className="h-3 w-3" /> Add Label
            </Button>
          </div>
        </div>
      );
    }

    // Single dataset editor
    return (
      <div className="space-y-1.5">
        <div className="flex gap-2 text-xs font-medium text-muted-foreground px-1">
          <span className="w-6" />
          <span className="flex-1">Label</span>
          <span className="w-20">Value</span>
          <span className="w-6" />
        </div>
        {data.map((d, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="color"
              value={d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              onChange={(e) => updateItem(i, "color", e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 p-0"
            />
            <Input value={d.label} onChange={(e) => updateItem(i, "label", e.target.value)} className="h-7 text-xs flex-1" />
            <Input type="number" value={d.value} onChange={(e) => updateItem(i, "value", e.target.value)} className="h-7 text-xs w-20" />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeItem(i)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 w-full" onClick={addItem}>
          <Plus className="h-3 w-3" /> Add Data Point
        </Button>
      </div>
    );
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
            <Select value={chartType} onValueChange={(v) => fireChange(v as ChartType, data, effectiveDatasets, effectiveLabels, curveType)}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderEditor()}
        </div>
      )}
    </div>
  );
};

export default EditableChart;
