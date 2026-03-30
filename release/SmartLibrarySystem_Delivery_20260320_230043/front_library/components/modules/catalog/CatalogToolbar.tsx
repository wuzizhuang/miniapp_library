import { Button, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";

import { ViewMode } from "./catalogTypes";

interface CatalogToolbarProps {
  filteredCount: number;
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
}

export function CatalogToolbar({
  filteredCount,
  onViewModeChange,
  viewMode,
}: CatalogToolbarProps) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(140deg,rgba(255,255,255,0.94),rgba(240,247,255,0.96)_55%,rgba(229,241,255,0.98))] px-5 py-6 shadow-[0_28px_70px_-42px_rgba(148,163,184,0.28)] sm:px-7 dark:border-white/10 dark:bg-[linear-gradient(140deg,rgba(15,23,42,0.92),rgba(9,16,34,0.86)_55%,rgba(10,37,84,0.92))] dark:shadow-[0_28px_70px_-42px_rgba(8,15,36,0.85)]">
      <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-400/10" />
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-700/70 dark:text-sky-200/70">
            Catalog Explorer
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem] dark:text-white">
            馆藏目录
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            共检索到 <span className="font-bold text-sky-600 dark:text-sky-300">{filteredCount}</span> 本相关书籍，
            可以继续按状态、分类和关键词快速筛选。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Tooltip content="功能开发中">
            <span className="inline-flex">
              <Button
                className="border border-primary/20 bg-primary/10 text-primary-700 dark:border-primary/30 dark:bg-primary/20 dark:text-primary-50"
                color="primary"
                isDisabled
                radius="full"
                startContent={<Icon icon="solar:scanner-linear" width={20} />}
                variant="flat"
              >
                扫码找书
              </Button>
            </span>
          </Tooltip>

          <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white/72 p-1.5 shadow-inner shadow-slate-200/60 dark:border-white/10 dark:bg-black/25 dark:shadow-black/20">
            <Button
              aria-label="切换为表格视图"
              isIconOnly
              className={
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "bg-transparent text-slate-500 dark:text-slate-300"
              }
              radius="lg"
              size="sm"
              variant={viewMode === "table" ? "solid" : "light"}
              onPress={() => onViewModeChange("table")}
            >
              <Icon icon="solar:list-bold" width={20} />
            </Button>
            <Button
              aria-label="切换为网格视图"
              isIconOnly
              className={
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "bg-transparent text-slate-500 dark:text-slate-300"
              }
              radius="lg"
              size="sm"
              variant={viewMode === "grid" ? "solid" : "light"}
              onPress={() => onViewModeChange("grid")}
            >
              <Icon icon="solar:widget-2-bold" width={20} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
