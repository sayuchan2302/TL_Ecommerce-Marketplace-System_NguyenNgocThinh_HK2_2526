package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.config.GoogleAuthProperties;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;

@Service
public class GoogleJwtIdTokenVerifier implements GoogleIdTokenVerifier {

    private final GoogleAuthProperties properties;
    private final JwtDecoder jwtDecoder;
    private final Clock clock;

    @Autowired
    public GoogleJwtIdTokenVerifier(GoogleAuthProperties properties) {
        this(
                properties,
                NimbusJwtDecoder.withJwkSetUri(properties.getJwkSetUri()).build(),
                Clock.systemUTC()
        );
    }

    GoogleJwtIdTokenVerifier(GoogleAuthProperties properties, JwtDecoder jwtDecoder, Clock clock) {
        this.properties = properties;
        this.jwtDecoder = jwtDecoder;
        this.clock = clock;
    }

    @Override
    public GoogleUserInfo verify(String credential) {
        if (credential == null || credential.isBlank()) {
            throw badRequest("Google credential is required");
        }

        String clientId = normalize(properties.getClientId());
        if (clientId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Google login is not configured");
        }

        Jwt jwt;
        try {
            jwt = jwtDecoder.decode(credential);
        } catch (JwtException ex) {
            throw badRequest("Invalid Google credential");
        }

        validateAudience(jwt, clientId);
        validateIssuer(jwt);
        validateExpiration(jwt);
        validateEmailVerified(jwt);

        String subject = normalize(jwt.getSubject());
        String email = normalize(jwt.getClaimAsString("email")).toLowerCase(Locale.ROOT);
        if (subject.isBlank() || email.isBlank()) {
            throw badRequest("Invalid Google credential");
        }

        return new GoogleUserInfo(
                subject,
                email,
                normalize(jwt.getClaimAsString("name")),
                normalize(jwt.getClaimAsString("picture"))
        );
    }

    private void validateAudience(Jwt jwt, String clientId) {
        if (jwt.getAudience() == null || !jwt.getAudience().contains(clientId)) {
            throw badRequest("Invalid Google credential");
        }
    }

    private void validateIssuer(Jwt jwt) {
        String issuer = jwt.getIssuer() != null ? jwt.getIssuer().toString() : "";
        if (!properties.getIssuers().contains(issuer)) {
            throw badRequest("Invalid Google credential");
        }
    }

    private void validateExpiration(Jwt jwt) {
        Instant expiresAt = jwt.getExpiresAt();
        if (expiresAt == null || !expiresAt.isAfter(Instant.now(clock))) {
            throw badRequest("Invalid Google credential");
        }
    }

    private void validateEmailVerified(Jwt jwt) {
        Object value = jwt.getClaims().get("email_verified");
        boolean verified = value instanceof Boolean bool
                ? bool
                : Boolean.parseBoolean(String.valueOf(value));
        if (!verified) {
            throw badRequest("Google email is not verified");
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
