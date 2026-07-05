package com.nexawork.project.mappers;

import com.nexawork.project.dtos.responses.AttachmentResponse;
import com.nexawork.project.entities.TaskAttachment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * TaskAttachment → AttachmentResponse.
 */
@Mapper(componentModel = "spring")
public interface AttachmentMapper {

    @Mapping(target = "taskId", source = "task.id")
    AttachmentResponse asDto(TaskAttachment entity);

    List<AttachmentResponse> parse(List<TaskAttachment> entities);
}
