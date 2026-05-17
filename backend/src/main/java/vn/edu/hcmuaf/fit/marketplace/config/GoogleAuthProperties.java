package vn.edu.hcmuaf.fit.marketplace.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.google")
public class GoogleAuthProperties {
    private String clientId = "";
    private String jwkSetUri = "https://www.googleapis.com/oauth2/v3/certs";
    private List<String> issuers = List.of("https://accounts.google.com", "accounts.google.com");
}
