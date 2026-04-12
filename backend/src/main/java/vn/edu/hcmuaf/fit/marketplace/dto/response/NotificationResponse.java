package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class NotificationResponse {
    private UUID id;
    private String type;
    private String title;
    private String message;
    private String image;
    private String link;
    private Boolean read;
    private LocalDateTime createdAt;
}
