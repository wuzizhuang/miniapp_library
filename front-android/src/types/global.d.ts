/**
 * @file 全局类型声明
 * @description 补充 Expo / React Native 环境下缺失的全局类型定义
 */

/** 声明 process.env 类型，使 TypeScript 识别环境变量访问 */
declare const process: {
  env: Record<string, string | undefined>;
};
