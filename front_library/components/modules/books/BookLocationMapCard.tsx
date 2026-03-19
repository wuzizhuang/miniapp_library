import type {
  ApiBookLocationMapDto,
  ApiBookLocationMapFloorDto,
  ApiBookLocationMapLocationDto,
  ApiBookLocationMapShelfDto,
} from "@/types/api";

import { useEffect, useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";

type BookLocationMapCardProps = {
  map?: ApiBookLocationMapDto | null;
  isLoading?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
};

function toPercent(value: number, total: number) {
  if (!total) {
    return "0%";
  }

  return `${(value / total) * 100}%`;
}

function buildGuidePath(
  floor: ApiBookLocationMapFloorDto,
  zone: { x: number; y: number; width: number; height: number },
) {
  const startX = floor.mapWidth * 0.08;
  const startY = floor.mapHeight * 0.88;
  const corridorX = floor.mapWidth * 0.46;
  const middleY = floor.mapHeight * 0.72;
  const targetX = zone.x + zone.width / 2;
  const targetY = zone.y + zone.height * 0.56;

  return `M ${startX} ${startY} L ${corridorX} ${startY} L ${corridorX} ${middleY} L ${targetX} ${middleY} L ${targetX} ${targetY}`;
}

function formatCompactShelfLabel(label: string) {
  const segments = label.split(/[^A-Z0-9]+/).filter(Boolean);

  if (segments.length >= 2) {
    return `${segments[0]}-${segments[1]}`.slice(0, 6);
  }

  return label.replace(/[^A-Z0-9]/g, "").slice(0, 6) || label;
}

function buildVisibleLocationOptions(
  locations: ApiBookLocationMapLocationDto[],
  selectedCode: string | null,
  showAll: boolean,
) {
  if (showAll) {
    return locations;
  }

  const selectedLocation = locations.find((item) => item.locationCode === selectedCode) ?? null;
  const remainingLocations = locations.filter((item) => item.locationCode !== selectedCode);

  return selectedLocation
    ? [selectedLocation, ...remainingLocations.slice(0, 2)]
    : locations.slice(0, 3);
}

function getPreviewShelves(
  shelves: ApiBookLocationMapShelfDto[],
  selectedShelfCode?: string | null,
  limit = 6,
) {
  if (!shelves.length) {
    return {
      items: [] as ApiBookLocationMapShelfDto[],
      hiddenCount: 0,
    };
  }

  const selectedShelf = selectedShelfCode
    ? shelves.find((shelf) => shelf.shelfCode === selectedShelfCode)
    : null;
  const remainingShelves = shelves.filter((shelf) => shelf.shelfCode !== selectedShelfCode);
  const items = selectedShelf
    ? [selectedShelf, ...remainingShelves.slice(0, Math.max(0, limit - 1))]
    : shelves.slice(0, limit);

  return {
    items,
    hiddenCount: Math.max(0, shelves.length - items.length),
  };
}

export function BookLocationMapCard({
  map,
  isLoading = false,
  errorMessage,
  onRetry,
}: BookLocationMapCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [selectedLocationCode, setSelectedLocationCode] = useState<string | null>(null);

  useEffect(() => {
    const nextLocation = map?.locations.find((item) => item.available) ?? map?.locations[0];

    setSelectedLocationCode(nextLocation?.locationCode ?? null);
    setSelectedFloorId(
      nextLocation?.floorPlanId ??
        map?.highlightedFloorPlanId ??
        map?.floors[0]?.floorPlanId ??
        null,
    );
    setShowAllLocations(false);
  }, [map]);

  const activeFloor = useMemo(() => {
    if (!map?.floors?.length) {
      return null;
    }

    return (
      map.floors.find((floor) => floor.floorPlanId === selectedFloorId) ??
      map.floors.find((floor) => floor.floorPlanId === map.highlightedFloorPlanId) ??
      map.floors[0]
    );
  }, [map, selectedFloorId]);

  const selectedLocation = useMemo(() => {
    if (!map?.locations?.length) {
      return null;
    }

    return (
      map.locations.find((item) => item.locationCode === selectedLocationCode) ??
      map.locations.find((item) => item.available) ??
      map.locations[0]
    );
  }, [map, selectedLocationCode]);

  const selectedShelf = useMemo(() => {
    if (!activeFloor || !selectedLocation) {
      return null;
    }

    return (
      activeFloor.shelves.find((shelf) => shelf.shelfCode === selectedLocation.shelfCode) ?? null
    );
  }, [activeFloor, selectedLocation]);

  const selectedZone = useMemo(() => {
    if (!activeFloor || !selectedLocation) {
      return null;
    }

    return activeFloor.zones.find((zone) => zone.zoneCode === selectedLocation.zoneCode) ?? null;
  }, [activeFloor, selectedLocation]);

  const visibleLocations = useMemo(() => {
    if (!map?.locations?.length) {
      return [];
    }

    const availableLocations = map.locations.filter((item) => item.available);
    const source = availableLocations.length > 0 ? availableLocations : map.locations;
    const uniqueLocations = new Map<string, (typeof source)[number]>();

    source.forEach((item) => {
      const key = `${item.floorPlanId}-${item.locationCode}`;

      if (!uniqueLocations.has(key)) {
        uniqueLocations.set(key, item);
      }
    });

    return Array.from(uniqueLocations.values());
  }, [map]);

  const locationOptions = useMemo(
    () => buildVisibleLocationOptions(visibleLocations, selectedLocationCode, showAllLocations),
    [selectedLocationCode, showAllLocations, visibleLocations],
  );

  const activeShelfCodes = useMemo(() => {
    if (!activeFloor) {
      return new Set<string>();
    }

    return new Set(
      visibleLocations
        .filter((item) => item.floorPlanId === activeFloor.floorPlanId)
        .map((item) => item.shelfCode),
    );
  }, [activeFloor, visibleLocations]);

  const shelvesByZone = useMemo(() => {
    if (!activeFloor) {
      return new Map<string, ApiBookLocationMapShelfDto[]>();
    }

    const nextMap = new Map<string, ApiBookLocationMapShelfDto[]>();
    activeFloor.shelves.forEach((shelf) => {
      const current = nextMap.get(shelf.zoneCode) ?? [];
      nextMap.set(shelf.zoneCode, [...current, shelf]);
    });

    return nextMap;
  }, [activeFloor]);

  const selectedZoneShelves = useMemo(() => {
    if (!selectedLocation) {
      return [];
    }

    return shelvesByZone.get(selectedLocation.zoneCode) ?? [];
  }, [selectedLocation, shelvesByZone]);

  const selectedZonePreview = useMemo(
    () => getPreviewShelves(selectedZoneShelves, selectedShelf?.shelfCode, 8),
    [selectedShelf?.shelfCode, selectedZoneShelves],
  );

  const hasMapData = !!map?.floors?.length;

  const handleFloorChange = (floorId: number) => {
    setSelectedFloorId(floorId);
    setShowAllLocations(false);

    const nextLocation =
      visibleLocations.find((item) => item.floorPlanId === floorId) ??
      map?.locations.find((item) => item.floorPlanId === floorId) ??
      null;

    setSelectedLocationCode(nextLocation?.locationCode ?? null);
  };

  const handleLocationSelect = (location: ApiBookLocationMapLocationDto) => {
    setSelectedLocationCode(location.locationCode);
    setSelectedFloorId(location.floorPlanId);
  };

  const handleShelfSelection = (shelf: ApiBookLocationMapShelfDto) => {
    const nextLocationCode =
      visibleLocations.find(
        (item) =>
          item.floorPlanId === activeFloor?.floorPlanId && item.shelfCode === shelf.shelfCode,
      )?.locationCode ??
      shelf.locationCodes[0] ??
      selectedLocationCode;

    setSelectedLocationCode(nextLocationCode ?? null);
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#fffdf7_0%,#f5f8fb_100%)] p-4 shadow-[0_28px_80px_-54px_rgba(15,23,42,0.45)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 text-slate-800">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f59e0b,#f97316)] text-white shadow-lg shadow-orange-200">
              <Icon icon="solar:map-point-rotate-bold" width={20} />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold">馆藏地图</h3>
              <p className="text-sm text-slate-500">先看目标书架，再按路线去找它。</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <Chip color="warning" radius="sm" size="sm" variant="flat">
              默认导览图
            </Chip>
            <Chip radius="sm" size="sm" variant="flat">
              {selectedLocation?.floorName ?? "未定位楼层"}
            </Chip>
          </div>
        </div>

        <Button
          color="primary"
          endContent={
            <Icon
              icon={isExpanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
              width={16}
            />
          }
          isDisabled={!isLoading && !errorMessage && !hasMapData}
          variant={isExpanded ? "solid" : "flat"}
          onPress={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? "收起地图" : "查看地图"}
        </Button>
      </div>

      {isExpanded ? (
        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="h-9 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="h-9 w-24 animate-pulse rounded-full bg-slate-200" />
              </div>
              <div className="aspect-[5/6] w-full animate-pulse rounded-[30px] bg-slate-200 sm:aspect-[16/10]" />
            </div>
          ) : errorMessage ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">馆藏地图加载失败</p>
                  <p className="mt-1">{errorMessage}</p>
                </div>
                {onRetry ? (
                  <Button color="danger" variant="flat" onPress={onRetry}>
                    重试
                  </Button>
                ) : null}
              </div>
            </div>
          ) : !hasMapData || !activeFloor || !selectedLocation ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
              当前图书还没有可渲染的馆藏地图数据。
            </div>
          ) : (
            <>
              {map.floors.length > 1 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {map.floors.map((floor) => {
                    const isActive = floor.floorPlanId === activeFloor.floorPlanId;

                    return (
                      <button
                        key={floor.floorPlanId}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          isActive
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                        type="button"
                        onClick={() => handleFloorChange(floor.floorPlanId)}
                      >
                        {floor.floorName}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="rounded-[28px] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,247,237,0.98),rgba(255,251,235,0.92))] p-4 shadow-[0_16px_40px_-28px_rgba(245,158,11,0.65)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2 text-amber-700">
                        <Icon icon="solar:point-on-map-bold-duotone" width={18} />
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]">当前目标</p>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">
                        {selectedLocation.floorName} · {selectedLocation.zoneName}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span className="rounded-full bg-white/80 px-3 py-1.5 font-medium text-slate-700">
                          当前位置 {selectedLocation.locationCode}
                        </span>
                        <Icon className="text-amber-500" icon="solar:alt-arrow-right-linear" width={18} />
                        <span className="rounded-full bg-white/80 px-3 py-1.5 font-medium text-slate-700">
                          沿橙色路线前往
                        </span>
                        <Icon className="text-amber-500" icon="solar:alt-arrow-right-linear" width={18} />
                        <span className="rounded-full bg-amber-500 px-3 py-1.5 font-semibold text-white shadow-[0_12px_24px_-14px_rgba(245,158,11,0.9)]">
                          目标书架 {selectedShelf?.label ?? selectedLocation.shelfCode}
                        </span>
                      </div>
                      <p className="text-sm leading-7 text-slate-600">
                        从入口进入 {selectedLocation.floorName}，沿主通道到达
                        <span className="font-semibold text-slate-800"> {selectedLocation.zoneName}</span>
                        ，在分区内找到高亮书架
                        <span className="font-semibold text-amber-700"> {selectedShelf?.label ?? selectedLocation.shelfCode}</span>
                        。
                      </p>
                    </div>

                    <div className="w-full rounded-[24px] border border-amber-200 bg-white/80 px-4 py-4 shadow-sm sm:w-[168px]">
                      <p className="text-xs uppercase tracking-[0.18em] text-amber-500">定位书架</p>
                      <p className="mt-2 text-4xl font-black leading-none text-slate-900">
                        {selectedShelf?.label ?? selectedLocation.shelfCode}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {selectedShelf?.availableCopyCount
                          ? `当前可借 ${selectedShelf.availableCopyCount} 本`
                          : selectedShelf
                            ? `当前共 ${selectedShelf.copyCount} 本`
                            : "正在定位书架"}
                      </p>
                    </div>
                  </div>

                  {visibleLocations.length > 1 ? (
                    <div className="mt-4 rounded-[24px] border border-white/70 bg-white/70 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          其他可定位位置
                        </p>
                        {visibleLocations.length > 3 ? (
                          <button
                            className="text-xs font-medium text-slate-500 transition hover:text-slate-800"
                            type="button"
                            onClick={() => setShowAllLocations((current) => !current)}
                          >
                            {showAllLocations
                              ? "收起"
                              : `展开另外 ${visibleLocations.length - locationOptions.length} 处`}
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {locationOptions.map((location) => {
                          const isActive = selectedLocation.locationCode === location.locationCode;

                          return (
                            <button
                              key={`${location.copyId}-${location.locationCode}`}
                              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                isActive
                                  ? "border-amber-400 bg-amber-100 text-amber-900 shadow-sm"
                                  : "border-slate-200 bg-white/85 text-slate-600 hover:border-slate-300 hover:bg-white"
                              }`}
                              type="button"
                              onClick={() => handleLocationSelect(location)}
                            >
                              {location.floorName} · {location.locationCode}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="overflow-hidden rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top,_#fffef9_0%,_#eef5f9_55%,_#dce8f0_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_40px_-24px_rgba(15,23,42,0.35)] sm:p-4">
                    <div className="mb-3 flex items-center justify-between gap-3 px-1 sm:px-2">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-800">{activeFloor.floorName} 楼层导览图</p>
                        <p className="text-sm text-slate-500">先跟随路径进入分区，再找金色目标书架。</p>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-right shadow-sm">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">当前分区</p>
                        <p className="max-w-[9rem] truncate text-sm font-semibold text-slate-700">
                          {selectedLocation.zoneName}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/70 px-3 py-2 text-[11px] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                          橙色路线
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                          可定位书架
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-300 ring-2 ring-amber-500/40" />
                          目标书架
                        </span>
                      </div>
                    </div>

                    <div className="relative mx-auto mt-3 aspect-[5/6] w-full overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#edf3f7_66%,#d8e3eb_100%)] sm:aspect-[16/10]">
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:36px_36px]" />
                      <div className="absolute inset-x-[5%] bottom-[9%] h-[12%] rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,#edf2f7,#d9e3eb)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]" />
                      <div className="absolute inset-x-[7%] bottom-[14.8%] flex items-center justify-between text-[10px] font-semibold text-slate-500 sm:text-[11px]">
                        <span>入口</span>
                        <span>服务台</span>
                        <span>电梯厅</span>
                      </div>

                      <svg
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        viewBox={`0 0 ${activeFloor.mapWidth} ${activeFloor.mapHeight}`}
                      >
                        {selectedZone ? (
                          <>
                            <path
                              d={buildGuidePath(activeFloor, selectedZone)}
                              fill="none"
                              stroke="#f59e0b"
                              strokeDasharray="12 8"
                              strokeLinecap="round"
                              strokeWidth="6"
                            />
                            <circle
                              cx={selectedZone.x + selectedZone.width / 2}
                              cy={selectedZone.y + selectedZone.height * 0.56}
                              fill="#f59e0b"
                              r="9"
                            />
                          </>
                        ) : null}
                      </svg>

                      {activeFloor.zones.map((zone) => {
                        const zoneShelves = shelvesByZone.get(zone.zoneCode) ?? [];
                        const isSelectedZone = selectedLocation.zoneCode === zone.zoneCode;
                        const preview = getPreviewShelves(
                          zoneShelves,
                          isSelectedZone ? selectedLocation.shelfCode : null,
                          4,
                        );

                        return (
                          <div
                            key={`${activeFloor.floorPlanId}-${zone.zoneCode}`}
                            className={`absolute overflow-hidden rounded-[24px] border shadow-[0_16px_30px_-22px_rgba(15,23,42,0.35)] ${
                              isSelectedZone
                                ? "border-amber-200 ring-2 ring-amber-300/70"
                                : "border-white/60"
                            }`}
                            style={{
                              left: toPercent(zone.x, activeFloor.mapWidth),
                              top: toPercent(zone.y, activeFloor.mapHeight),
                              width: toPercent(zone.width, activeFloor.mapWidth),
                              height: toPercent(zone.height, activeFloor.mapHeight),
                              background: `linear-gradient(160deg, ${zone.color}, rgba(255,255,255,0.9))`,
                            }}
                          >
                            <div className="flex h-full flex-col p-2.5 sm:p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/80 px-1.5 text-[10px] font-bold text-slate-700 shadow-sm sm:h-7 sm:min-w-7 sm:px-2 sm:text-xs">
                                      {zone.zoneCode}
                                    </span>
                                    {isSelectedZone ? (
                                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-semibold text-amber-700 sm:text-[10px]">
                                        目标分区
                                      </span>
                                    ) : zoneShelves.length > 0 ? (
                                      <span className="rounded-full bg-sky-100 px-2 py-1 text-[9px] font-semibold text-sky-700 sm:text-[10px]">
                                        有书
                                      </span>
                                    ) : null}
                                  </div>
                                  <p
                                    className={`mt-1.5 font-semibold text-slate-800 ${
                                      isSelectedZone ? "text-sm sm:text-[15px]" : "text-[11px] sm:text-xs"
                                    }`}
                                  >
                                    {isSelectedZone ? zone.zoneName : zone.zoneCode}
                                  </p>
                                  {!isSelectedZone ? (
                                    <p className="hidden text-[10px] text-slate-500 sm:block">
                                      {zoneShelves.length > 0 ? `${zoneShelves.length} 架` : "暂无"}
                                    </p>
                                  ) : null}
                                </div>

                                {isSelectedZone ? (
                                  <div className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                                    {selectedShelf?.label ?? selectedLocation.shelfCode}
                                  </div>
                                ) : null}
                              </div>

                              {isSelectedZone ? (
                                <div className="mt-auto grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                  {preview.items.map((shelf) => {
                                    const isSelected = selectedShelf?.shelfCode === shelf.shelfCode;
                                    const isActiveShelf = isSelected || activeShelfCodes.has(shelf.shelfCode);

                                    return (
                                      <div
                                        key={`${zone.zoneCode}-${shelf.shelfCode}`}
                                        className={`flex min-h-[34px] items-center justify-center rounded-2xl border px-1.5 text-center text-[10px] font-semibold shadow-sm sm:min-h-[38px] sm:px-2 sm:text-[11px] ${
                                          isSelected
                                            ? "border-amber-300 bg-[linear-gradient(180deg,#fff1c7,#fbbf24)] text-amber-950 ring-2 ring-amber-400/40"
                                            : isActiveShelf
                                              ? "border-sky-200 bg-[linear-gradient(180deg,#dbeafe,#93c5fd)] text-slate-900"
                                              : "border-white/75 bg-white/70 text-slate-600"
                                        }`}
                                        title={`${shelf.label} · 共 ${shelf.copyCount} 本`}
                                      >
                                        {formatCompactShelfLabel(shelf.label)}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="mt-auto rounded-2xl bg-white/55 px-2 py-1.5 text-center text-[10px] font-medium text-slate-600 sm:text-[11px]">
                                  {zoneShelves.length > 0 ? `${zoneShelves.length} 个书架` : "当前无定位"}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">简化步骤</p>
                      <div className="mt-3 space-y-3 text-sm text-slate-600">
                        <div className="flex gap-3">
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                            1
                          </span>
                          <p>
                            进入
                            <span className="font-semibold text-slate-800"> {selectedLocation.floorName}</span>
                            ，沿主通道走到
                            <span className="font-semibold text-slate-800"> {selectedLocation.zoneName}</span>
                            。
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
                            2
                          </span>
                          <p>
                            在分区内找到金色书架
                            <span className="font-semibold text-amber-700"> {selectedShelf?.label ?? selectedLocation.shelfCode}</span>
                            。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">分区书架目录</p>
                          <p className="mt-1 text-base font-semibold text-slate-900">{selectedLocation.zoneName}</p>
                        </div>
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          共 {selectedZoneShelves.length} 架
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedZoneShelves.length > 0 ? (
                          selectedZonePreview.items.map((shelf) => {
                            const isSelected = selectedShelf?.shelfCode === shelf.shelfCode;
                            const isActiveShelf = isSelected || activeShelfCodes.has(shelf.shelfCode);

                            return (
                              <button
                                key={`${shelf.zoneCode}-${shelf.shelfCode}`}
                                className={`rounded-full border px-3 py-2 text-sm font-medium ${
                                  isSelected
                                    ? "border-amber-300 bg-amber-100 text-amber-900 shadow-sm"
                                    : isActiveShelf
                                      ? "border-sky-200 bg-sky-50 text-sky-800"
                                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                                }`}
                                type="button"
                                onClick={() => handleShelfSelection(shelf)}
                              >
                                {shelf.label}
                              </button>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            当前分区暂无可展示书架。
                          </div>
                        )}
                      </div>

                      {selectedZonePreview.hiddenCount > 0 ? (
                        <p className="mt-3 text-xs text-slate-500">
                          还有 {selectedZonePreview.hiddenCount} 个书架未显示，地图内可继续查看。
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 rounded-[26px] border border-slate-200 bg-white/75 p-4 text-sm text-slate-600 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">楼层</p>
                    <p className="mt-1 font-semibold text-slate-800">{selectedLocation.floorName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">分区</p>
                    <p className="mt-1 font-semibold text-slate-800">{selectedLocation.zoneName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">书架</p>
                    <p className="mt-1 font-semibold text-amber-700">{selectedLocation.shelfCode}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">位置码</p>
                    <p className="mt-1 font-semibold text-slate-800">{selectedLocation.locationCode}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
