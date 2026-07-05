package com.nexawork.project.mappers;

import com.nexawork.project.dtos.responses.TaskResponse;
import com.nexawork.project.entities.Task;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * Task → TaskResponse. {@code projectId}/{@code statusId}/{@code statusName} sont
 * aplatis depuis les associations ; les compteurs sont renseignés en service.
 */
@Mapper(componentModel = "spring")
public interface TaskMapper {

    @Mapping(target = "projectId", source = "project.id")
    @Mapping(target = "statusId", expression = "java(entity.getStatus() != null ? entity.getStatus().getId() : null)")
    @Mapping(target = "statusName", expression = "java(entity.getStatus() != null ? entity.getStatus().getName() : null)")
    @Mapping(target = "subtaskCount", ignore = true)
    @Mapping(target = "commentCount", ignore = true)
    @Mapping(target = "attachmentCount", ignore = true)
    TaskResponse asDto(Task entity);

    List<TaskResponse> parse(List<Task> entities);
}
