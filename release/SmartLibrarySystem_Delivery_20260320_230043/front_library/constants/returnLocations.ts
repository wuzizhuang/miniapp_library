import { ApiServiceAppointmentMethod } from "@/types/api";

export interface ReturnLocationOption {
  key: string;
  label: string;
  method: ApiServiceAppointmentMethod;
  description: string;
}

export const RETURN_LOCATION_OPTIONS: ReturnLocationOption[] = [
  {
    key: "一层总服务台",
    label: "一层总服务台",
    method: "COUNTER",
    description: "适合需要馆员现场核验的普通归还",
  },
  {
    key: "二层东侧咨询台",
    label: "二层东侧咨询台",
    method: "COUNTER",
    description: "适合教学楼方向到馆读者归还",
  },
  {
    key: "东门24小时还书柜",
    label: "东门24小时还书柜",
    method: "SMART_LOCKER",
    description: "支持非馆开放时段自助投递归还",
  },
  {
    key: "南门智能还书柜",
    label: "南门智能还书柜",
    method: "SMART_LOCKER",
    description: "适合宿舍区方向读者归还",
  },
];

export function getReturnLocationsByMethod(method: ApiServiceAppointmentMethod) {
  return RETURN_LOCATION_OPTIONS.filter((item) => item.method === method);
}
