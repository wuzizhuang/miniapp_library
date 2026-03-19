package com.example.library.converter;

import com.example.library.entity.User;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class UserStatusConverter implements AttributeConverter<User.UserStatus, String> {

    @Override
    public String convertToDatabaseColumn(User.UserStatus attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public User.UserStatus convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            return User.UserStatus.valueOf(dbData.toUpperCase());
        } catch (IllegalArgumentException e) {
            return User.UserStatus.ACTIVE;
        }
    }
}