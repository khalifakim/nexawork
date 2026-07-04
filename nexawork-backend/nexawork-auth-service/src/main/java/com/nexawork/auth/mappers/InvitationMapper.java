package com.nexawork.auth.mappers;

import com.nexawork.commons.mappers.EntityMapper;
import com.nexawork.auth.dtos.responses.InvitationResponse;
import com.nexawork.auth.entities.Invitation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface InvitationMapper extends EntityMapper<InvitationResponse, Invitation> {

    @Override
    @Mapping(target = "invitedByDisplayName",
            expression = "java(entity.getInvitedBy() != null ? entity.getInvitedBy().getDisplayName() : null)")
    InvitationResponse asDto(Invitation entity);

    @Override
    @Mapping(target = "organisation", ignore = true)
    @Mapping(target = "token", ignore = true)
    @Mapping(target = "invitedBy", ignore = true)
    Invitation asEntity(InvitationResponse dto);
}
