import {
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Radio,
  RadioGroup,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import { SearchIcon } from "@/components/common/site-icons";
import { Category } from "@/types/book";

interface CatalogFiltersProps {
  availabilityFilter: string;
  categories: Category[];
  searchInputValue: string;
  selectedCategory: string;
  onAvailabilityFilterChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSearchInputChange: (value: string) => void;
  onSearchReset: () => void;
}

export function CatalogFilters({
  availabilityFilter,
  categories,
  onAvailabilityFilterChange,
  onCategoryChange,
  onSearchInputChange,
  onSearchReset,
  searchInputValue,
  selectedCategory,
}: CatalogFiltersProps) {
  const selectedCategoryLabel =
    selectedCategory === "all"
      ? "全部分类"
      : categories.find(
          (category) => String(category.categoryId) === selectedCategory,
        )?.name || "选择分类";

  return (
    <div className="flex w-full flex-col gap-3 rounded-[28px] border border-slate-200/80 bg-white/82 p-3 shadow-[0_24px_60px_-42px_rgba(148,163,184,0.3)] backdrop-blur-xl sm:flex-row sm:items-center sm:p-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.76))] dark:shadow-[0_24px_60px_-42px_rgba(15,23,42,0.9)]">
      <Input
        isClearable
        className="w-full sm:max-w-[40%]"
        classNames={{
          base: "w-full",
          input:
            "text-sm text-slate-700 placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500",
          inputWrapper:
            "h-14 rounded-2xl border border-slate-200/80 bg-white px-4 shadow-none data-[hover=true]:bg-slate-50 group-data-[focus=true]:border-primary/35 group-data-[focus=true]:bg-white dark:border-white/10 dark:bg-black/25 dark:data-[hover=true]:bg-black/30 dark:group-data-[focus=true]:border-primary/45 dark:group-data-[focus=true]:bg-black/35",
        }}
        placeholder="搜索书名、作者、ISBN..."
        startContent={<SearchIcon className="text-default-400" />}
        value={searchInputValue}
        onClear={onSearchReset}
        onValueChange={onSearchInputChange}
      />

      <Divider className="hidden h-8 bg-slate-200 sm:block dark:bg-white/10" orientation="vertical" />

      <div className="flex w-full gap-2 overflow-x-auto scrollbar-hide">
        <Popover placement="bottom">
          <PopoverTrigger>
            <Button
              className="h-14 min-w-[124px] border border-slate-200/80 bg-slate-50/90 px-4 text-slate-700 dark:border-white/10 dark:bg-white/6 dark:text-slate-100"
              endContent={<Icon icon="solar:alt-arrow-down-linear" />}
              radius="lg"
              variant="flat"
            >
              {availabilityFilter === "all" ? "所有状态" : "仅看可借"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 rounded-2xl border border-slate-200/80 bg-white/98 p-4 text-slate-700 shadow-2xl shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-100 dark:shadow-black/50">
            <RadioGroup
              classNames={{
                label: "text-slate-600 dark:text-slate-200",
              }}
              label="筛选书籍状态"
              value={availabilityFilter}
              onValueChange={onAvailabilityFilterChange}
            >
              <Radio description="显示全部馆藏" value="all">
                显示全部
              </Radio>
              <Radio description="隐藏无库存的书籍" value="available">
                只看目前可借
              </Radio>
            </RadioGroup>
          </PopoverContent>
        </Popover>

        <Dropdown>
          <DropdownTrigger>
            <Button
              className="h-14 min-w-[124px] border border-slate-200/80 bg-slate-50/90 px-4 text-slate-700 dark:border-white/10 dark:bg-white/6 dark:text-slate-100"
              endContent={<Icon icon="solar:alt-arrow-down-linear" />}
              radius="lg"
              variant="flat"
            >
              {selectedCategoryLabel}
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="目录分类"
            className="max-h-72 overflow-auto"
            disallowEmptySelection
            selectedKeys={new Set([selectedCategory])}
            selectionMode="single"
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;

              onCategoryChange(value);
            }}
          >
            {[{ categoryId: "all", name: "全部分类" }, ...categories].map((category) => (
              <DropdownItem key={String(category.categoryId)}>
                {category.name}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  );
}
