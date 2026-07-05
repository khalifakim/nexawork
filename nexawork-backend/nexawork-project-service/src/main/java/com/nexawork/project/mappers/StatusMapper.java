package com.nexawork.project.mappers;

import com.nexawork.project.dtos.responses.StatusResponse;
import com.nexawork.project.entities.WorkflowStatus;
import org.mapstruct.Mapper;

import java.util.List;

/**
 * WorkflowStatus → StatusResponse.
 */
@Mapper(componentModel = "spring")
public interface StatusMapper {

    StatusResponse asDto(WorkflowStatus entity);

    List<StatusResponse> parse(List<WorkflowStatus> entities);
}
