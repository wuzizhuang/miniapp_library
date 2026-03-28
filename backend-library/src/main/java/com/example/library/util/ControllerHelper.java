package com.example.library.util;

import com.example.library.exception.UnauthorizedException;
import com.example.library.security.UserDetailsImpl;

/**
 * 认证与通知相关的公共工具类。
 * 用于消除各 Controller 中重复的辅助方法。
 */
public final class ControllerHelper {

    private ControllerHelper() { }

    /**
     * 校验当前请求已登录，否则抛出未授权异常。
     */
    public static UserDetailsImpl requireAuthenticated(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new UnauthorizedException("请先登录后再继续");
        }
        return userDetails;
    }

    /**
     * 从认证上下文中提取当前用户 ID。
     */
    public static Integer requireUserId(UserDetailsImpl userDetails) {
        return requireAuthenticated(userDetails).getId();
    }
}
