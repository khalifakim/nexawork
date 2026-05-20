package com.nexawork.meeting.repositories;

import com.nexawork.meeting.entities.Call;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CallRepository extends JpaRepository<Call, Long> {
    List<Call> findByOrganisationId(Long organisationId);
    List<Call> findByProjectId(Long projectId);
    Optional<Call> findByRoomName(String roomName);
}
