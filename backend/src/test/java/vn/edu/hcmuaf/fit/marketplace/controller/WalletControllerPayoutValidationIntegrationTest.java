package vn.edu.hcmuaf.fit.marketplace.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WalletControllerPayoutValidationIntegrationTest {

    private static final String TEST_PASSWORD = "Test@123";
    private static final String VENDOR_EMAIL = "an.shop@fashion.local";

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void createPayoutRejectsMissingAmount() {
        ResponseEntity<String> response = postMyPayout(Map.of(
                "bankAccountName", "NGUYEN VAN A",
                "bankAccountNumber", "123456789",
                "bankName", "VCB"
        ));

        assertBadRequestContaining(response, "amount: Payout amount is required");
    }

    @Test
    void createPayoutRejectsNonPositiveAmount() {
        ResponseEntity<String> response = postMyPayout(Map.of(
                "amount", BigDecimal.ZERO,
                "bankAccountName", "NGUYEN VAN A",
                "bankAccountNumber", "123456789",
                "bankName", "VCB"
        ));

        assertBadRequestContaining(response, "amount: Payout amount must be greater than zero");
    }

    @Test
    void createPayoutRejectsBlankBankAccountName() {
        ResponseEntity<String> response = postMyPayout(Map.of(
                "amount", new BigDecimal("100000"),
                "bankAccountName", " ",
                "bankAccountNumber", "123456789",
                "bankName", "VCB"
        ));

        assertBadRequestContaining(response, "bankAccountName: Bank account holder is required");
    }

    private ResponseEntity<String> postMyPayout(Map<String, Object> payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAndExtractToken());
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.postForEntity(
                "/api/wallets/my-payout",
                new HttpEntity<>(payload, headers),
                String.class
        );
    }

    private void assertBadRequestContaining(ResponseEntity<String> response, String expectedMessage) {
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(
                response.getBody().contains(expectedMessage),
                () -> "Expected response body to contain: " + expectedMessage + "\nActual body: " + response.getBody()
        );
    }

    @SuppressWarnings("unchecked")
    private String loginAndExtractToken() {
        ResponseEntity<Map> loginResponse = restTemplate.postForEntity(
                "/api/auth/login",
                Map.of("email", VENDOR_EMAIL, "password", TEST_PASSWORD),
                Map.class
        );
        assertEquals(HttpStatus.OK, loginResponse.getStatusCode());
        Map<String, Object> body = loginResponse.getBody();
        assertNotNull(body);
        Object token = body.get("token");
        assertNotNull(token);
        return String.valueOf(token);
    }
}
