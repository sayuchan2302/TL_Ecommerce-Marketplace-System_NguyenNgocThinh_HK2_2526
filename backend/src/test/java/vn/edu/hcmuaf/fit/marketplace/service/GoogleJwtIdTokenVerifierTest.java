package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.config.GoogleAuthProperties;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class GoogleJwtIdTokenVerifierTest {

    private static final Instant NOW = Instant.parse("2026-05-17T10:00:00Z");

    private GoogleAuthProperties properties;
    private Clock clock;

    @BeforeEach
    void setUp() {
        properties = new GoogleAuthProperties();
        properties.setClientId("client-id.apps.googleusercontent.com");
        clock = Clock.fixed(NOW, ZoneId.of("UTC"));
    }

    @Test
    void verifyReturnsGoogleUserInfoForValidToken() {
        GoogleJwtIdTokenVerifier verifier = verifierReturning(validJwt());

        GoogleUserInfo userInfo = verifier.verify("credential");

        assertEquals("google-sub", userInfo.subject());
        assertEquals("user@test.local", userInfo.email());
        assertEquals("Google User", userInfo.name());
        assertEquals("https://lh3.googleusercontent.com/avatar", userInfo.picture());
    }

    @Test
    void verifyRejectsDecoderFailure() {
        GoogleJwtIdTokenVerifier verifier = new GoogleJwtIdTokenVerifier(
                properties,
                token -> {
                    throw new JwtException("bad token");
                },
                clock
        );

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> verifier.verify("credential")
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void verifyRejectsWrongAudience() {
        GoogleJwtIdTokenVerifier verifier = verifierReturning(
                jwt("https://accounts.google.com", List.of("another-client"), NOW.plusSeconds(300), true)
        );

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> verifier.verify("credential")
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void verifyRejectsWrongIssuer() {
        GoogleJwtIdTokenVerifier verifier = verifierReturning(
                jwt("https://evil.example", List.of("client-id.apps.googleusercontent.com"), NOW.plusSeconds(300), true)
        );

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> verifier.verify("credential")
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void verifyRejectsExpiredToken() {
        GoogleJwtIdTokenVerifier verifier = verifierReturning(
                jwt("https://accounts.google.com", List.of("client-id.apps.googleusercontent.com"), NOW.minusSeconds(1), true)
        );

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> verifier.verify("credential")
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void verifyRejectsUnverifiedEmail() {
        GoogleJwtIdTokenVerifier verifier = verifierReturning(
                jwt("https://accounts.google.com", List.of("client-id.apps.googleusercontent.com"), NOW.plusSeconds(300), false)
        );

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> verifier.verify("credential")
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void verifyRejectsMissingClientIdConfiguration() {
        properties.setClientId("");
        GoogleJwtIdTokenVerifier verifier = verifierReturning(validJwt());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> verifier.verify("credential")
        );

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatusCode());
    }

    private GoogleJwtIdTokenVerifier verifierReturning(Jwt jwt) {
        JwtDecoder decoder = token -> jwt;
        return new GoogleJwtIdTokenVerifier(properties, decoder, clock);
    }

    private Jwt validJwt() {
        return jwt("https://accounts.google.com", List.of("client-id.apps.googleusercontent.com"), NOW.plusSeconds(300), true);
    }

    private Jwt jwt(String issuer, List<String> audience, Instant expiresAt, Object emailVerified) {
        return Jwt.withTokenValue("credential")
                .header("alg", "RS256")
                .subject("google-sub")
                .issuer(issuer)
                .audience(audience)
                .issuedAt(NOW.minusSeconds(60))
                .expiresAt(expiresAt)
                .claim("email", "USER@Test.Local")
                .claim("email_verified", emailVerified)
                .claim("name", "Google User")
                .claim("picture", "https://lh3.googleusercontent.com/avatar")
                .build();
    }
}
