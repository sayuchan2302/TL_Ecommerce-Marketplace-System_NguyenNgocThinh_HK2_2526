package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class BotScenarioRevisionMetaResponse {
    private Integer version;
    private LocalDateTime updatedAt;
    private String updatedBy;
}

