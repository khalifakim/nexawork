package com.nexawork.project.mappers;

import com.nexawork.project.dtos.responses.TeamResponse;
import com.nexawork.project.entities.Team;
import org.mapstruct.Mapper;

import java.util.List;

/**
 * Team → TeamResponse.
 */
@Mapper(componentModel = "spring")
public interface TeamMapper {

    TeamResponse asDto(Team entity);

    List<TeamResponse> parse(List<Team> entities);
}
