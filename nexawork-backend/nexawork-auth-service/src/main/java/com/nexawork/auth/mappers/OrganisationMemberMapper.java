package com.nexawork.auth.mappers;

import com.nexawork.commons.mappers.EntityMapper;
import com.nexawork.auth.dtos.responses.MemberResponse;
import com.nexawork.auth.entities.OrganisationMember;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OrganisationMemberMapper extends EntityMapper<MemberResponse, OrganisationMember> {

    @Override
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "email", source = "user.email")
    @Mapping(target = "firstName", source = "user.firstName")
    @Mapping(target = "lastName", source = "user.lastName")
    @Mapping(target = "displayName", expression = "java(entity.getUser().getDisplayName())")
    @Mapping(target = "jobTitle", source = "user.jobTitle")
    @Mapping(target = "photoUrl", source = "user.photoUrl")
    MemberResponse asDto(OrganisationMember entity);

    @Override
    @Mapping(target = "organisation", ignore = true)
    @Mapping(target = "user", ignore = true)
    OrganisationMember asEntity(MemberResponse dto);
}
