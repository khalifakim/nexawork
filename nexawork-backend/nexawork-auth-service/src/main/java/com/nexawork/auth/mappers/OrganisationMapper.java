package com.nexawork.auth.mappers;

import com.nexawork.commons.mappers.EntityMapper;
import com.nexawork.auth.dtos.responses.WorkspaceResponse;
import com.nexawork.auth.entities.Organisation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OrganisationMapper extends EntityMapper<WorkspaceResponse, Organisation> {

    @Override
    @Mapping(target = "memberCount", ignore = true)
    @Mapping(target = "myRole", ignore = true)
    @Mapping(target = "isOwner", ignore = true)
    WorkspaceResponse asDto(Organisation entity);
}
