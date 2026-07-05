package com.nexawork.ged.mappers;

import com.nexawork.ged.dtos.responses.FolderResponse;
import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.entities.enums.AccessMode;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;

/**
 * GedFolder → FolderResponse. {@code restricted} dérivé du mode d'accès (cadenas).
 */
@Mapper(componentModel = "spring")
public interface FolderMapper {

    @Mapping(target = "restricted", source = "accessMode", qualifiedByName = "isRestricted")
    FolderResponse asDto(GedFolder entity);

    List<FolderResponse> parse(List<GedFolder> entities);

    @Named("isRestricted")
    default boolean isRestricted(AccessMode mode) {
        return mode != null && mode != AccessMode.OPEN;
    }
}
