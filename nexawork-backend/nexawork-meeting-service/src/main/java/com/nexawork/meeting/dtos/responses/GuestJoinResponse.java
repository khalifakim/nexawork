package com.nexawork.meeting.dtos.responses;

public record GuestJoinResponse(
    Long callId,
    String topic,
    String roomName,
    String jitsiToken,
    String jitsiUrl
) {}
