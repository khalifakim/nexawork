package com.nexawork.ged.mappers;

import com.nexawork.ged.dtos.responses.VersionResponse;
import com.nexawork.ged.entities.GedFileVersion;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * GedFileVersion → VersionResponse. {@code current} est renseigné en service
 * (dépend du max de version du fichier).
 */
@Mapper(componentModel = "spring")
public interface VersionMapper {

    @Mapping(target = "gedFileId", source = "gedFile.id")
    @Mapping(target = "current", ignore = true)
    VersionResponse asDto(GedFileVersion entity);
}
