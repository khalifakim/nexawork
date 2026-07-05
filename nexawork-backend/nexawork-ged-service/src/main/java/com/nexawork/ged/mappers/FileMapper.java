package com.nexawork.ged.mappers;

import com.nexawork.ged.dtos.responses.FileResponse;
import com.nexawork.ged.entities.GedFile;
import com.nexawork.ged.entities.enums.AccessMode;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;

/**
 * GedFile → FileResponse. {@code folderId} aplati ; {@code restricted} dérivé du mode.
 */
@Mapper(componentModel = "spring")
public interface FileMapper {

    @Mapping(target = "folderId", source = "folder.id")
    @Mapping(target = "restricted", source = "accessMode", qualifiedByName = "isRestrictedFile")
    FileResponse asDto(GedFile entity);

    List<FileResponse> parse(List<GedFile> entities);

    @Named("isRestrictedFile")
    default boolean isRestricted(AccessMode mode) {
        return mode != null && mode != AccessMode.OPEN;
    }
}
