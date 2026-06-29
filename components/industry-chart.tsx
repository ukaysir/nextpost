"use client";

import { memo, useMemo } from "react";
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

function IndustryChartComponent({ data }: { data: IndustryStat[] }) {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        year: item.year,
        sales: item.sales ?? 0,
        rate: item.operating_profit_rate ?? null,
      })),
    [data],
  );

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="sales" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#849BBA" stopOpacity={0.52} />
              <stop offset="100%" stopColor="#849BBA" stopOpacity={0.07} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E8EBEE" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="year"
            tick={{ fill: "#8B95A1", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "#8B95A1", fontSize: 12 }}
            tickFormatter={(value) => `${Math.round(Number(value) / 10000)}조`}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              border: "1px solid #E8EBEE",
              borderRadius: 8,
              boxShadow: "0 12px 28px rgba(25, 31, 40, 0.08)",
            }}
            formatter={(value, name) => [
              name === "sales"
                ? `${Number(value).toLocaleString("ko-KR")}억원`
                : `${value}%`,
              name === "sales" ? "매출" : "영업이익률",
            ]}
            labelFormatter={(label) => `${label}년`}
          />
          <Area
            dataKey="sales"
            fill="url(#sales)"
            isAnimationActive={false}
            stroke="#849BBA"
            strokeWidth={3}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export const IndustryChart = memo(IndustryChartComponent);
