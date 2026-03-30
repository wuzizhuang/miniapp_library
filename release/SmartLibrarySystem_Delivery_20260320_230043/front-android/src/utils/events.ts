/**
 * @file 应用内事件总线
 * @description 轻量级的发布—订阅事件系统，用于跨组件/屏幕通信。
 *
 *   典型使用场景：
 *   - 借阅/归还操作完成后，通知相关屏幕刷新数据
 *   - 登录/登出后通知各模块更新状态
 *   - 写操作完成后通知列表页重新加载
 *
 *   事件类型与业务领域一一对应（auth / loans / reservations 等）
 */

/** 应用事件类型定义 */
type AppEvent =
  | "auth"              // 认证状态变更（登录/登出/刷新）
  | "overview"          // 用户概览数据变更
  | "books"             // 图书数据变更
  | "favorites"         // 收藏变更
  | "loans"             // 借阅变更
  | "reservations"      // 预约变更
  | "notifications"     // 通知变更
  | "fines"             // 罚款变更
  | "feedback"          // 反馈变更
  | "appointments"      // 服务预约变更
  | "seatReservations"  // 座位预约变更
  | "recommendations"   // 推荐动态变更
  | "profile"           // 个人资料变更
  | "reviews";          // 评论变更

/** 监听器回调类型 */
type Listener = (event: AppEvent) => void;

/** 全局监听器集合 */
const listeners = new Set<Listener>();

/**
 * 发射事件，通知所有已注册的监听器
 * @param event - 事件类型
 */
export function emitAppEvent(event: AppEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

/**
 * 订阅事件
 * @param listener - 监听回调
 * @returns 取消订阅函数（组件卸载时调用）
 */
export function subscribeAppEvent(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export type { AppEvent };
