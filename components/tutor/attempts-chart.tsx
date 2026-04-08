"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function AttemptsChart({
  data,
}: {
  data: { day: string; score: number }[];
}) {
  if (!data.length) {
    return (
      <p className="text-sm text-stone-500">Not enough submissions yet.</p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} className="text-stone-500" />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            width={40}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              return [`${Math.round(n * 100)}%`, "Avg score"];
            }}
            labelFormatter={(l) => l}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#0f766e"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
