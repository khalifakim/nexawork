package com.nexawork.project.services;

import com.nexawork.project.entities.Task;
import com.nexawork.project.entities.WorkflowStatus;
import com.nexawork.project.entities.WorkflowTransition;
import com.nexawork.project.exceptions.InvalidTransitionException;
import com.nexawork.project.exceptions.ResourceNotFoundException;
import com.nexawork.project.repositories.WorkflowStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WorkflowFsmService {

    private final WorkflowStatusRepository statusRepo;

    public void transition(Task task, Long targetStatusId) {
        WorkflowStatus current = task.getStatus();
        WorkflowStatus target = statusRepo.findById(targetStatusId)
            .orElseThrow(() -> new ResourceNotFoundException("Statut cible introuvable : " + targetStatusId));

        if (current == null) {
            task.setStatus(target);
            return;
        }

        boolean allowed = current.getOutgoingTransitions().stream()
            .map(WorkflowTransition::getToStatus)
            .anyMatch(s -> s.getId().equals(targetStatusId));

        if (!allowed) {
            throw new InvalidTransitionException(
                "Transition non autorisée : " + current.getName() + " → " + target.getName());
        }

        task.setStatus(target);
    }
}
