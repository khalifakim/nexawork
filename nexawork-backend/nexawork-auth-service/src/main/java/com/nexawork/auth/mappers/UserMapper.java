package com.nexawork.auth.mappers;

import com.nexawork.commons.mappers.EntityMapper;
import com.nexawork.auth.dtos.responses.UserProfileResponse;
import com.nexawork.auth.entities.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper extends EntityMapper<UserProfileResponse, User> {

    @Override
    @Mapping(target = "displayName", expression = "java(entity.getDisplayName())")
    UserProfileResponse asDto(User entity);

    @Override
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "jobTitle", ignore = true)
    @Mapping(target = "lastSeenAt", ignore = true)
    User asEntity(UserProfileResponse dto);
}
