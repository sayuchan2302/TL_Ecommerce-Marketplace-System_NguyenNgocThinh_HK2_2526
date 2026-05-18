package vn.edu.hcmuaf.fit.marketplace.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminProcessReportRequest {

    @NotNull(message = "Action is required")
    private ProcessAction action;

    private String adminNote;

    public enum ProcessAction {
        BAN,
        DISMISS
    }
}
