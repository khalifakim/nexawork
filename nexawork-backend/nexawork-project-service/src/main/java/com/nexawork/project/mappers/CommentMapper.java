package com.nexawork.project.mappers;

import com.nexawork.project.dtos.responses.CommentResponse;
import com.nexawork.project.entities.TaskComment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * TaskComment → CommentResponse.
 */
@Mapper(componentModel = "spring")
public interface CommentMapper {

    @Mapping(target = "taskId", source = "task.id")
    CommentResponse asDto(TaskComment entity);

    List<CommentResponse> parse(List<TaskComment> entities);
}
