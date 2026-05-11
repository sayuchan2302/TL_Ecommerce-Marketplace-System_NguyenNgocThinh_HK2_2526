package vn.edu.hcmuaf.fit.marketplace.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PayoutRequestCreateRequest {

    @NotNull(message = "Payout amount is required")
    @Positive(message = "Payout amount must be greater than zero")
    private BigDecimal amount;

    @NotBlank(message = "Bank account holder is required")
    @Size(max = 120, message = "Bank account holder must be at most 120 characters")
    private String bankAccountName;

    @NotBlank(message = "Bank account number is required")
    @Size(max = 64, message = "Bank account number must be at most 64 characters")
    private String bankAccountNumber;

    @NotBlank(message = "Bank name is required")
    @Size(max = 120, message = "Bank name must be at most 120 characters")
    private String bankName;
}
