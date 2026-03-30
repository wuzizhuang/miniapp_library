package com.example.library.converter;

import com.example.library.entity.User.IdentityType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class IdentityTypeConverter implements AttributeConverter<IdentityType, String> {

    @Override
    public String convertToDatabaseColumn(IdentityType attribute) {
        // 存储到数据库时使用大写
        return attribute == null ? null : attribute.name().toUpperCase();
    }

    @Override
    public IdentityType convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        // 从数据库读取时，先转换为大写，再查找对应的枚举常量
        try {
            return IdentityType.valueOf(dbData.toUpperCase());
        } catch (IllegalArgumentException e) {
            // 抛出异常或返回默认值，具体取决于业务需求
            return null;
        }
    }
}