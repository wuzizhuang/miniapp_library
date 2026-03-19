import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardBody } from "@heroui/react";

import { ActivityData } from "@/services/api/adminService";

interface Props {
  data: ActivityData[];
}

export const ActivityChart = ({ data }: Props) => {
  return (
    <Card className="shadow-sm border-none bg-white dark:bg-content1 h-full">
      <CardBody className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              馆内活动趋势
            </h3>
            <p className="text-sm text-gray-500">最近 7 天借阅量与归还量</p>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorBorrow" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#006FEE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#006FEE" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorReturn" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#17C964" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#17C964" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="#E5E7EB"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                axisLine={false}
                dataKey="name"
                dy={10}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Area
                dataKey="borrow"
                fill="url(#colorBorrow)"
                fillOpacity={1}
                name="借阅"
                stroke="#006FEE"
                strokeWidth={3}
                type="monotone"
              />
              <Area
                dataKey="return"
                fill="url(#colorReturn)"
                fillOpacity={1}
                name="归还"
                stroke="#17C964"
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
};
