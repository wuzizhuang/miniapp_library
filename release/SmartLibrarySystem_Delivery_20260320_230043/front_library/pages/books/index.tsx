// pages/books/index.tsx
import React from "react";

import DefaultLayout from "@/components/layouts/default";
import LibraryCatalog from "@/components/modules/catalog/LibraryCatalog";

/**
 * 图书目录页。
 * 页面本身只负责布局，检索、筛选和分页逻辑统一收敛在 LibraryCatalog 组件内部。
 */
export default function BooksPage() {
  return (
    <DefaultLayout>
      <div className="container mx-auto max-w-7xl px-6 flex-grow py-8">
        <div className="mb-6" />

        {/* 目录检索、热词联动、分页等复杂逻辑全部下沉到模块组件。 */}
        <LibraryCatalog />
      </div>
    </DefaultLayout>
  );
}
