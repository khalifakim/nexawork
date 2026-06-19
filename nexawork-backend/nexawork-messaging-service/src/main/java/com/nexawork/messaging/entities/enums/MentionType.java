package com.nexawork.messaging.entities.enums;

public enum MentionType {
    USER,       // @prénom — mentionne un utilisateur
    TASK,       // @@titre — référence une tâche
    DOCUMENT,   // @@@nom — référence un document GED
    CHANNEL     // #canal — référence un canal
}
