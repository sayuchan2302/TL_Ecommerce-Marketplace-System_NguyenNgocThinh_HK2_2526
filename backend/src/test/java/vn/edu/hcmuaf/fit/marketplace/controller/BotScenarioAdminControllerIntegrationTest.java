package vn.edu.hcmuaf.fit.marketplace.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class BotScenarioAdminControllerIntegrationTest {

    private static final String TEST_PASSWORD = "Test@123";

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @SuppressWarnings("unchecked")
    void superAdminCanManageBotScenario() {
        String token = loginAndExtractToken("admin@fashion.local", TEST_PASSWORD);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        ResponseEntity<Map> snapshotResponse = restTemplate.exchange(
                "/api/admin/bot/scenario",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
        );
        assertEquals(HttpStatus.OK, snapshotResponse.getStatusCode());
        Map<String, Object> body = snapshotResponse.getBody();
        assertNotNull(body);
        Map<String, Object> draft = (Map<String, Object>) body.get("draft");
        assertNotNull(draft);

        draft.put("unknownPrompt", "Ban hay chon chuc nang de tiep tuc.");

        ResponseEntity<Map> saveDraftResponse = restTemplate.exchange(
                "/api/admin/bot/scenario/draft",
                HttpMethod.PUT,
                new HttpEntity<>(draft, headers),
                Map.class
        );
        assertEquals(HttpStatus.OK, saveDraftResponse.getStatusCode());

        ResponseEntity<Map> publishResponse = restTemplate.exchange(
                "/api/admin/bot/scenario/publish",
                HttpMethod.POST,
                new HttpEntity<>(headers),
                Map.class
        );
        assertEquals(HttpStatus.OK, publishResponse.getStatusCode());

        Map<String, Object> published = (Map<String, Object>) publishResponse.getBody().get("published");
        assertNotNull(published);
        assertEquals("Ban hay chon chuc nang de tiep tuc.", published.get("unknownPrompt"));
    }

    @Test
    void vendorCannotAccessBotScenarioAdminEndpoint() {
        String token = loginAndExtractToken("an.shop@fashion.local", TEST_PASSWORD);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/admin/bot/scenario",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class
        );
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @SuppressWarnings("unchecked")
    private String loginAndExtractToken(String email, String password) {
        Map<String, String> payload = Map.of(
                "email", email,
                "password", password
        );
        ResponseEntity<Map> loginResponse = restTemplate.postForEntity("/api/auth/login", payload, Map.class);
        assertEquals(HttpStatus.OK, loginResponse.getStatusCode());
        Map<String, Object> body = loginResponse.getBody();
        assertNotNull(body);
        Object token = body.get("token");
        assertNotNull(token);
        return String.valueOf(token);
    }
}

