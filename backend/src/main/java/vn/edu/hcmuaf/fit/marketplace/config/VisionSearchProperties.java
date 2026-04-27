package vn.edu.hcmuaf.fit.marketplace.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.vision")
public class VisionSearchProperties {
    private boolean enabled = true;
    private String baseUrl = "http://localhost:8001";
    private String internalSecret = "";
    private int connectTimeoutMs = 3000;
    private int readTimeoutMs = 20000;
    private int maxCandidates = 120;
    private long maxUploadSizeBytes = 5_242_880L;
}

