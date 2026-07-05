package com.nexawork.project.mappers;

import com.nexawork.project.dtos.responses.SubTaskResponse;
import com.nexawork.project.entities.SubTask;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * SubTask → SubTaskResponse.
 */
@Mapper(componentModel = "spring")
public interface SubTaskMapper {

    @Mapping(target = "taskId", source = "task.id")
    SubTaskResponse asDto(SubTask entity);

    List<SubTaskResponse> parse(List<SubTask> entities);
}
