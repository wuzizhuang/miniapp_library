package com.example.library.config;

/**
 * 兼容性占位文件。
 * 当前项目的 CORS 已统一迁移到 SecurityConfig 中配置，这里保留该文件只是为了避免
 * 某些历史引用或组件扫描路径失效，不再声明额外的 Bean。
 *
 * @see com.example.library.security.SecurityConfig#corsConfigurationSource()
 */
