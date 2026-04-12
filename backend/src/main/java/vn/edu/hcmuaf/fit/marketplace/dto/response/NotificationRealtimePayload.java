package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationRealtimePayload {
    private String event;
    private NotificationResponse notification;
    private long unreadCount;
}
