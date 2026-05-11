package vn.edu.hcmuaf.fit.marketplace.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.security")
public class AppSecurityProperties {
    private List<String> corsAllowedOrigins = List.of("http://localhost:5173", "http://127.0.0.1:5173");
    private List<String> corsAllowedOriginPatterns = List.of();
}
