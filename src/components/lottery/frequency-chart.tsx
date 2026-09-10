"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Flame, Snowflake, Minus } from "lucide-react";

interface FrequencyData {
  numero: number;
  frequencia: number;
  percentual: number;
  status: string;
}

interface FrequencyChartProps {
  data: FrequencyData[];
  title?: string;
  description?: string;
  maxBarSize?: number;
  averageFrequency?: number;
}

const STATUS_COLORS: Record<string, string> = {
  quente: "#22c55e",
  frio: "#ef4444",
  neutro: "#9ca3af",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  quente: <Flame className="h-4 w-4 text-green-500" />,
  frio: <Snowflake className="h-4 w-4 text-red-500" />,
  neutro: <Minus className="h-4 w-4 text-gray-400" />,
};

const STATUS_LABELS: Record<string, string> = {
  quente: "Quente",
  frio: "Frio",
  neutro: "Neutro",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: FrequencyData;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold text-lg">{String(data.numero).padStart(2, "0")}</span>
        {STATUS_ICONS[data.status]}
        <span className="text-xs text-muted-foreground">
          {STATUS_LABELS[data.status] ?? data.status}
        </span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Frequência:</span>
          <span className="font-medium">{data.frequencia}x</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Percentual:</span>
          <span className="font-medium">{data.percentual.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

export function FrequencyChart({
  data,
  title = "Frequência dos Números",
  description = "Distribuição de frequência por número",
  maxBarSize = 40,
  averageFrequency,
}: FrequencyChartProps) {
  const avgFrequency = useMemo(() => {
    if (averageFrequency !== undefined) return averageFrequency;
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.frequencia, 0) / data.length;
  }, [data, averageFrequency]);

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        nome: String(d.numero).padStart(2, "0"),
        cor: STATUS_COLORS[d.status] ?? STATUS_COLORS.neutro,
      })),
    [data]
  );

  const statusCounts = useMemo(() => {
    const counts = { quente: 0, frio: 0, neutro: 0 };
    data.forEach((d) => {
      if (d.status in counts) counts[d.status as keyof typeof counts]++;
    });
    return counts;
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Quente ({statusCounts.quente})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Frio ({statusCounts.frio})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-gray-400" />
              <span className="text-muted-foreground">Neutro ({statusCounts.neutro})</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              barSize={maxBarSize}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                interval={data.length > 30 ? 4 : data.length > 15 ? 1 : 0}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              />
              <ReferenceLine
                y={avgFrequency}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                label={{
                  value: `Média: ${avgFrequency.toFixed(1)}`,
                  position: "right",
                  fontSize: 11,
                  fill: "hsl(var(--primary))",
                }}
              />
              <Bar dataKey="frequencia" radius={[4, 4, 0, 0]} animationDuration={800}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
