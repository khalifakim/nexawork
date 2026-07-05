package com.nexawork.file.mappers;

import com.nexawork.file.dtos.responses.StoredFileResponse;
import com.nexawork.file.entities.StoredFile;
import org.mapstruct.Mapper;

/**
 * StoredFile → StoredFileResponse.
 */
@Mapper(componentModel = "spring")
public interface StoredFileMapper {

    StoredFileResponse asDto(StoredFile entity);
}
