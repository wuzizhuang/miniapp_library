package com.example.library.service.impl;

import com.example.library.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * 基于 SMTP 的邮件发送服务。
 * 当前主要用于密码找回邮件投递。
 */
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "true")
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Override
    public void sendPasswordResetEmail(String toEmail, String username, String resetUrl, int expirationMinutes) {
        // 保持纯文本邮件，兼容学校或企业内网中较严格的邮件客户端策略。
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("智慧图书馆密码重置");
        message.setText("""
                %s，你好：

                我们收到了你的密码重置请求。请在 %d 分钟内打开以下链接完成重置：
                %s

                如果这不是你的操作，请忽略本邮件。
                """.formatted(username, expirationMinutes, resetUrl));
        mailSender.send(message);
    }
}
