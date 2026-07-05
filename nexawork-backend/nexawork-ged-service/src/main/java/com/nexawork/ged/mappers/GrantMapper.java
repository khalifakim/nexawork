package com.nexawork.ged.mappers;

import com.nexawork.ged.dtos.responses.GrantResponse;
import com.nexawork.ged.entities.GedAccessGrant;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * GedAccessGrant → GrantResponse. La ligne propriétaire (R13) est synthétique et
 * ajoutée en service (pas un grant en base).
 */
@Mapper(componentModel = "spring")
public interface GrantMapper {

    @Mapping(target = "owner", constant = "false")
    GrantResponse asDto(GedAccessGrant entity);
}
