package com.example.library.converter;

import com.example.library.entity.User;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class UserRoleConverter implements AttributeConverter<User.UserRole, String> {

    @Override
    public String convertToDatabaseColumn(User.UserRole attribute) {
        if (attribute == null) {
            return null;
        }
        // 存入数据库时，统一存为大写字符串
        return attribute.name();
    }

    @Override
    public User.UserRole convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        // 从数据库读取时，先转大写，再匹配枚举
        // 这样即使数据库里存的是 "admin"，也能正确映射到 UserRole.ADMIN
        try {
            return User.UserRole.valueOf(dbData.toUpperCase());
        } catch (IllegalArgumentException e) {
            return User.UserRole.USER; // 默认值
        }
    }
}