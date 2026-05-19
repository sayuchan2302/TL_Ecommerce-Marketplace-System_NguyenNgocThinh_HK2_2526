package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.config.GoogleAuthProperties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GoogleIdTokenVerifierTest {

    private GoogleIdTokenVerifier verifier;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        GoogleAuthProperties properties = new GoogleAuthProperties();
        properties.setClientId("client-id.apps.googleusercontent.com");

        RestTemplate restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        verifier = new GoogleIdTokenVerifier(properties, restTemplate);
    }

    @Test
    void verifyReturnsGoogleUserInfoForValidTokenInfo() {
        server.expect(requestTo("https://oauth2.googleapis.com/tokeninfo?id_token=id-token"))
                .andRespond(withSuccess("""
                        {
                          "iss": "https://accounts.google.com",
                          "aud": "client-id.apps.googleusercontent.com",
                          "sub": "google-sub",
                          "email": "USER@EXAMPLE.COM",
                          "email_verified": "true",
                          "name": "Google User",
                          "picture": "https://lh3.googleusercontent.com/avatar"
                        }
                        """, MediaType.APPLICATION_JSON));

        GoogleUserInfo userInfo = verifier.verify("id-token");

        assertEquals("google-sub", userInfo.subject());
        assertEquals("user@example.com", userInfo.email());
        assertEquals("Google User", userInfo.name());
        assertEquals("https://lh3.googleusercontent.com/avatar", userInfo.picture());
        server.verify();
    }

    @Test
    void verifyRejectsAudienceMismatch() {
        server.expect(requestTo("https://oauth2.googleapis.com/tokeninfo?id_token=id-token"))
                .andRespond(withSuccess("""
                        {
                          "iss": "https://accounts.google.com",
                          "aud": "other-client",
                          "sub": "google-sub",
                          "email": "user@example.com",
                          "email_verified": "true"
                        }
                        """, MediaType.APPLICATION_JSON));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> verifier.verify("id-token"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        server.verify();
    }

    @Test
    void verifyRejectsUnverifiedEmail() {
        server.expect(requestTo("https://oauth2.googleapis.com/tokeninfo?id_token=id-token"))
                .andRespond(withSuccess("""
                        {
                          "iss": "https://accounts.google.com",
                          "aud": "client-id.apps.googleusercontent.com",
                          "sub": "google-sub",
                          "email": "user@example.com",
                          "email_verified": "false"
                        }
                        """, MediaType.APPLICATION_JSON));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> verifier.verify("id-token"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        server.verify();
    }

    @Test
    void verifyRejectsInvalidTokenInfoResponse() {
        server.expect(requestTo("https://oauth2.googleapis.com/tokeninfo?id_token=id-token"))
                .andRespond(withBadRequest()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":\"invalid_token\"}"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> verifier.verify("id-token"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        server.verify();
    }
}
