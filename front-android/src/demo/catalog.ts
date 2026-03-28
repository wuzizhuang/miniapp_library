/**
 * @file 离线演示数据（馆藏目录）
 * @description 当后端不可达时，为 Android 端的馆藏浏览、搜索和首页推荐
 *   提供一套内置的示例书目数据。包含：
 *     - 6 本涵盖计算机/文学/管理/设计四个分类的演示书目
 *     - 热门关键词和搜索建议
 *     - 首页统计数据和推荐书单构建工具
 *     - 带分页、排序和多条件筛选的本地搜索实现
 *
 *   数据仅用于演示目的（bookId 使用 900000+ 段避免与真实数据冲突）。
 */

import type { ApiHomePageDto } from "../types/api";
import type { Book, BookListQuery, CategoryOption, PagedResult } from "../types/book";

const demoCategories: CategoryOption[] = [
  { categoryId: 1, name: "计算机" },
  { categoryId: 2, name: "文学" },
  { categoryId: 3, name: "管理" },
  { categoryId: 4, name: "设计" },
];

const demoBooks: Book[] = [
  {
    bookId: 900001,
    title: "人工智能导论",
    isbn: "9787302660011",
    description: "面向演示场景准备的 AI 入门读物，覆盖机器学习、模型训练与图书馆智能服务案例。",
    publisherName: "清华大学出版社",
    categoryId: 1,
    categoryName: "计算机",
    categoryNames: ["计算机"],
    authorNames: ["王磊", "周宁"],
    language: "中文",
    publishedYear: 2024,
    availableCopies: 6,
    totalCopies: 8,
    pendingReservationCount: 2,
    resourceMode: "HYBRID",
    onlineAccessUrl: "https://www.tsinghua.edu.cn",
    onlineAccessType: "OPEN_ACCESS",
    avgRating: 4.8,
    reviewCount: 16,
    inventoryCount: 8,
  },
  {
    bookId: 900002,
    title: "数据结构与算法实践",
    isbn: "9787111711225",
    description: "从数组、链表到图算法，适合课程展示和移动端馆藏演示。",
    publisherName: "机械工业出版社",
    categoryId: 1,
    categoryName: "计算机",
    categoryNames: ["计算机"],
    authorNames: ["陈晨"],
    language: "中文",
    publishedYear: 2023,
    availableCopies: 4,
    totalCopies: 6,
    pendingReservationCount: 1,
    resourceMode: "PHYSICAL_ONLY",
    avgRating: 4.6,
    reviewCount: 9,
    inventoryCount: 6,
  },
  {
    bookId: 900003,
    title: "云边协同架构设计",
    isbn: "9787121450091",
    description: "聚焦现代系统设计，适合展示资源模式、线上访问与热门推荐能力。",
    publisherName: "电子工业出版社",
    categoryId: 1,
    categoryName: "计算机",
    categoryNames: ["计算机"],
    authorNames: ["刘洋", "徐敏"],
    language: "中文",
    publishedYear: 2025,
    availableCopies: 2,
    totalCopies: 5,
    pendingReservationCount: 3,
    resourceMode: "HYBRID",
    onlineAccessUrl: "https://developer.android.com",
    onlineAccessType: "OPEN_ACCESS",
    avgRating: 4.9,
    reviewCount: 23,
    inventoryCount: 5,
  },
  {
    bookId: 900004,
    title: "图书馆空间叙事设计",
    isbn: "9787515369237",
    description: "用于展示设计类资源和移动端推荐流的示例书目。",
    publisherName: "中国青年出版社",
    categoryId: 4,
    categoryName: "设计",
    categoryNames: ["设计"],
    authorNames: ["林岚"],
    language: "中文",
    publishedYear: 2022,
    availableCopies: 5,
    totalCopies: 5,
    pendingReservationCount: 0,
    resourceMode: "PHYSICAL_ONLY",
    avgRating: 4.4,
    reviewCount: 7,
    inventoryCount: 5,
  },
  {
    bookId: 900005,
    title: "品牌传播与用户洞察",
    isbn: "9787300318907",
    description: "适合管理类场景展示，包含借阅、收藏与预约文案示例。",
    publisherName: "中国人民大学出版社",
    categoryId: 3,
    categoryName: "管理",
    categoryNames: ["管理"],
    authorNames: ["顾宁", "赵悦"],
    language: "中文",
    publishedYear: 2021,
    availableCopies: 1,
    totalCopies: 4,
    pendingReservationCount: 4,
    resourceMode: "HYBRID",
    onlineAccessUrl: "https://openlibrary.org",
    onlineAccessType: "OPEN_ACCESS",
    avgRating: 4.3,
    reviewCount: 11,
    inventoryCount: 4,
  },
  {
    bookId: 900006,
    title: "城市阅读与文学漫游",
    isbn: "9787020188897",
    description: "文学类演示数据，适合展示分类筛选与推荐书目卡片。",
    publisherName: "人民文学出版社",
    categoryId: 2,
    categoryName: "文学",
    categoryNames: ["文学"],
    authorNames: ["沈青"],
    language: "中文",
    publishedYear: 2024,
    availableCopies: 3,
    totalCopies: 6,
    pendingReservationCount: 0,
    resourceMode: "DIGITAL_ONLY",
    onlineAccessUrl: "https://www.gutenberg.org",
    onlineAccessType: "OPEN_ACCESS",
    avgRating: 4.7,
    reviewCount: 14,
    inventoryCount: 6,
  },
];

const demoHotKeywords = [
  "人工智能",
  "数据结构",
  "云边协同",
  "图书馆设计",
  "用户洞察",
  "城市阅读",
];

function buildHomeBooks(source: Book[], tag: string) {
  return source.map((book) => ({
    id: book.bookId,
    title: book.title,
    author: book.authorNames.join("、") || "未知作者",
    cover: book.coverUrl,
    tag,
  }));
}

function sortBooks(source: Book[], sort: BookListQuery["sort"]): Book[] {
  const books = [...source];

  switch (sort) {
    case "AVAILABILITY":
      return books.sort((a, b) => b.availableCopies - a.availableCopies || b.totalCopies - a.totalCopies);
    case "POPULARITY":
      return books.sort(
        (a, b) =>
          (b.pendingReservationCount + (b.reviewCount ?? 0)) -
          (a.pendingReservationCount + (a.reviewCount ?? 0)),
      );
    case "NEWEST":
      return books.sort((a, b) => (b.publishedYear ?? 0) - (a.publishedYear ?? 0));
    default:
      return books;
  }
}

function includesKeyword(value: string | undefined, keyword: string): boolean {
  return (value ?? "").toLowerCase().includes(keyword.toLowerCase());
}

export function getDemoCategories(): CategoryOption[] {
  return demoCategories;
}

export function getDemoBooks(): Book[] {
  return demoBooks;
}

export function getDemoBookById(bookId: number): Book | undefined {
  return demoBooks.find((book) => book.bookId === bookId);
}

export function getDemoHotKeywords(limit = 8): string[] {
  return demoHotKeywords.slice(0, limit);
}

export function getDemoSuggestions(keyword: string, limit = 8): string[] {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return [];
  }

  const candidates = new Set<string>(demoHotKeywords);

  for (const book of demoBooks) {
    candidates.add(book.title);
    candidates.add(book.publisherName || "");
    candidates.add(book.categoryName || "");
    for (const author of book.authorNames) {
      candidates.add(author);
    }
  }

  return Array.from(candidates)
    .filter((item) => item && item.toLowerCase().includes(normalizedKeyword))
    .slice(0, limit);
}

export function getDemoHomePage(): ApiHomePageDto {
  const newest = [...demoBooks].sort((a, b) => (b.publishedYear ?? 0) - (a.publishedYear ?? 0));
  const popular = sortBooks(demoBooks, "POPULARITY");

  return {
    heroStats: [
      { label: "馆藏图书", value: 12680 },
      { label: "注册读者", value: 4820 },
      { label: "在借册数", value: 932 },
      { label: "可借副本", value: 3641 },
    ],
    featuredBooks: buildHomeBooks(popular.slice(0, 4), "热门"),
    newArrivals: buildHomeBooks(newest.slice(0, 4), "新上架"),
    categories: demoCategories.map((category) => ({
      categoryId: category.categoryId,
      label: category.name,
      count: demoBooks.filter((book) => book.categoryId === category.categoryId).length * 120,
    })),
  };
}

export function searchDemoBooks(query: BookListQuery = {}): PagedResult<Book> {
  const normalizedKeyword = query.keyword?.trim().toLowerCase();
  const normalizedTitle = query.title?.trim().toLowerCase();
  const normalizedAuthor = query.author?.trim().toLowerCase();
  const normalizedPublisher = query.publisher?.trim().toLowerCase();

  let filtered = demoBooks.filter((book) => {
    if (query.categoryId && book.categoryId !== query.categoryId) {
      return false;
    }

    if (query.availableOnly && book.availableCopies <= 0) {
      return false;
    }

    if (
      normalizedKeyword
      && ![
        book.title,
        book.isbn,
        book.categoryName,
        book.publisherName,
        ...book.authorNames,
      ].some((value) => includesKeyword(value, normalizedKeyword))
    ) {
      return false;
    }

    if (normalizedTitle && !includesKeyword(book.title, normalizedTitle)) {
      return false;
    }

    if (
      normalizedAuthor
      && !book.authorNames.some((author) => includesKeyword(author, normalizedAuthor))
    ) {
      return false;
    }

    if (normalizedPublisher && !includesKeyword(book.publisherName, normalizedPublisher)) {
      return false;
    }

    return true;
  });

  filtered = sortBooks(filtered, query.sort);

  const page = query.page ?? 0;
  const size = query.size ?? 12;
  const start = page * size;
  const items = filtered.slice(start, start + size);

  return {
    items,
    totalElements: filtered.length,
    totalPages: Math.max(1, Math.ceil(filtered.length / size)),
    page,
    size,
  };
}
