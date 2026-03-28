package com.example.library.util;

/**
 * 通知相关的公共工具类。
 * 用于消除各 Service 中重复的辅助方法。
 */
public final class NotificationHelper {

    private NotificationHelper() { }

    /**
     * 生成通知去重用的业务主键。
     */
    public static String buildBusinessKey(String prefix, Integer entityId) {
        return entityId == null ? null : prefix + ":" + entityId;
    }
}
