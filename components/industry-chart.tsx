"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IndustryStat } from "@/lib/types";

export function IndustryChart({ data }: { data: IndustryStat[] }) {
  const chartData = data.map((item) => ({
    year: item.year,
    sales: item.sales,
    rate: item.operating_profit_rate,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="sales" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#155e63" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#155e63" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#d8ded4" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "#64716d", fontSize: 12 }} tickLine={false} />
          <YAxis
            tick={{ fill: "#64716d", fontSize: 12 }}
            tickFormatter={(value) => `${Math.round(Number(value) / 10000)}조`}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value, name) => [
              name === "sales"
                ? `${Number(value).toLocaleString("ko-KR")}억원`
                : `${value}%`,
              name === "sales" ? "매출액" : "영업이익률",
            ]}
            labelFormatter={(label) => `${label}년`}
          />
          <Area
            dataKey="sales"
            fill="url(#sales)"
            stroke="#155e63"
            strokeWidth={3}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
