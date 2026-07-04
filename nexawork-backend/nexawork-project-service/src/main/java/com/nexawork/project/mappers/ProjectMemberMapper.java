package com.nexawork.project.mappers;

import com.nexawork.project.dtos.responses.ProjectMemberResponse;
import com.nexawork.project.entities.ProjectMember;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * ProjectMember → ProjectMemberResponse ; l'équipe (nullable) est aplatie en
 * {@code teamId} / {@code teamName}.
 */
@Mapper(componentModel = "spring")
public interface ProjectMemberMapper {

    @Mapping(target = "teamId", expression = "java(entity.getTeam() != null ? entity.getTeam().getId() : null)")
    @Mapping(target = "teamName", expression = "java(entity.getTeam() != null ? entity.getTeam().getName() : null)")
    ProjectMemberResponse asDto(ProjectMember entity);

    List<ProjectMemberResponse> parse(List<ProjectMember> entities);
}
