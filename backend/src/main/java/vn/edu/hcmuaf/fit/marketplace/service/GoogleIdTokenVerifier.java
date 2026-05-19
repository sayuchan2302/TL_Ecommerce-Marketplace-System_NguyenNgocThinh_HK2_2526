package vn.edu.hcmuaf.fit.marketplace.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import vn.edu.hcmuaf.fit.marketplace.config.GoogleAuthProperties;

import java.util.Locale;
import java.util.Map;

@Service
public class GoogleIdTokenVerifier {
    private static final Logger logger = LoggerFactory.getLogger(GoogleIdTokenVerifier.class);

    private final GoogleAuthProperties properties;
    private final RestTemplate restTemplate;

    @Autowired
    public GoogleIdTokenVerifier(GoogleAuthProperties properties) {
        this(properties, new RestTemplate());
    }

    GoogleIdTokenVerifier(GoogleAuthProperties properties, RestTemplate restTemplate) {
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    public GoogleUserInfo verify(String idToken) {
        if (!hasText(idToken)) {
            throw badRequest("Google ID token is required");
        }

        String clientId = normalize(properties.getClientId());
        if (clientId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Google login is not configured");
        }

        Map<String, Object> payload = fetchTokenInfo(idToken);
        validateIssuer(payload);
        validateAudience(payload, clientId);
        validateVerifiedEmail(payload);

        String subject = normalize(asString(payload.get("sub")));
        String email = normalize(asString(payload.get("email"))).toLowerCase(Locale.ROOT);
        if (subject.isBlank() || email.isBlank()) {
            throw badRequest("Invalid Google ID token");
        }

        return new GoogleUserInfo(
                subject,
                email,
                normalize(asString(payload.get("name"))),
                normalize(asString(payload.get("picture")))
        );
    }

    private Map<String, Object> fetchTokenInfo(String idToken) {
        String url = UriComponentsBuilder
                .fromUriString(properties.getTokenInfoUrl())
                .queryParam("id_token", idToken)
                .encode()
                .toUriString();

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null) {
                throw badRequest("Invalid Google ID token");
            }
            return response;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (HttpStatusCodeException ex) {
            throw badRequest("Invalid Google ID token");
        } catch (RestClientException ex) {
            logger.warn("Google token verification request failed: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Google login is temporarily unavailable");
        }
    }

    private void validateIssuer(Map<String, Object> payload) {
        String issuer = normalize(asString(payload.get("iss")));
        if (!properties.getIssuers().contains(issuer)) {
            throw badRequest("Invalid Google ID token");
        }
    }

    private void validateAudience(Map<String, Object> payload, String clientId) {
        String audience = normalize(asString(payload.get("aud")));
        if (!clientId.equals(audience)) {
            throw badRequest("Invalid Google ID token");
        }
    }

    private void validateVerifiedEmail(Map<String, Object> payload) {
        String email = normalize(asString(payload.get("email")));
        Object verifiedValue = payload.get("email_verified");
        boolean verified = verifiedValue instanceof Boolean bool
                ? bool
                : Boolean.parseBoolean(String.valueOf(verifiedValue));

        if (email.isBlank() || !verified) {
            throw badRequest("Google email is not verified");
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private String asString(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
