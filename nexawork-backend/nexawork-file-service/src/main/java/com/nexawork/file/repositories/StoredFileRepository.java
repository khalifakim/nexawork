package com.nexawork.file.repositories;

import com.nexawork.file.entities.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface StoredFileRepository extends JpaRepository<StoredFile, UUID> {
}
