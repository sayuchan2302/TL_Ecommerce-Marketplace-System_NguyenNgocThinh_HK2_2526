package vn.edu.hcmuaf.fit.marketplace.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.seed.kaggle")
public class KaggleSeedProperties {
    private boolean enabled = false;
    private int targetCount = 1000;
    private String stylesPath = "data/styles.csv";
    private String imagesPath = "data/images.csv";
    private boolean cleanBeforeImport = true;
}

