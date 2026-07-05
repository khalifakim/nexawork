package com.nexawork.notification.mappers;

import com.nexawork.notification.dtos.responses.NotificationResponse;
import com.nexawork.notification.entities.Notification;
import org.mapstruct.Mapper;

/**
 * Notification → NotificationResponse.
 */
@Mapper(componentModel = "spring")
public interface NotificationMapper {

    NotificationResponse asDto(Notification entity);
}
