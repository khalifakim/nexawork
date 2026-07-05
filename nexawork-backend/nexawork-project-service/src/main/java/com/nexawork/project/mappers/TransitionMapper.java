package com.nexawork.project.mappers;

import com.nexawork.project.dtos.responses.TransitionResponse;
import com.nexawork.project.entities.WorkflowTransition;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * WorkflowTransition → TransitionResponse, avec aplatissement des identifiants et
 * libellés des statuts source/cible.
 */
@Mapper(componentModel = "spring")
public interface TransitionMapper {

    @Mapping(target = "fromStatusId", source = "fromStatus.id")
    @Mapping(target = "fromStatusName", source = "fromStatus.name")
    @Mapping(target = "toStatusId", source = "toStatus.id")
    @Mapping(target = "toStatusName", source = "toStatus.name")
    TransitionResponse asDto(WorkflowTransition entity);

    List<TransitionResponse> parse(List<WorkflowTransition> entities);
}
