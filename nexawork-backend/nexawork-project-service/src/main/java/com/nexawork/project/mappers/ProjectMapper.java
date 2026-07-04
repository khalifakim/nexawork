package com.nexawork.project.mappers;

import com.nexawork.project.dtos.responses.ProjectResponse;
import com.nexawork.project.entities.Project;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * Project → ProjectResponse. {@code memberCount} est renseigné en service
 * (agrégat non porté par l'entité).
 */
@Mapper(componentModel = "spring")
public interface ProjectMapper {

    @Mapping(target = "memberCount", ignore = true)
    ProjectResponse asDto(Project entity);

    List<ProjectResponse> parse(List<Project> entities);
}
