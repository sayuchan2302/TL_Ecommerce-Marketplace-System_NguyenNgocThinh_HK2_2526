package vn.edu.hcmuaf.fit.marketplace;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.Locale;

public class TestDatabaseSafetyInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        String url = applicationContext.getEnvironment().getProperty("spring.datasource.url", "");
        if (url.isBlank()) {
            throw new IllegalStateException("Test database URL is missing. Set TEST_DB_URL.");
        }
        if (pointsToMarketplaceDevDatabase(url)) {
            throw new IllegalStateException(
                    "Refusing to run tests against marketplace_db. Set TEST_DB_URL to marketplace_test_db or another disposable database."
            );
        }
    }

    private boolean pointsToMarketplaceDevDatabase(String url) {
        String normalized = url.trim().toLowerCase(Locale.ROOT);
        int optionsIndex = firstOptionsIndex(normalized);
        String baseUrl = optionsIndex >= 0 ? normalized.substring(0, optionsIndex) : normalized;
        int separatorIndex = Math.max(baseUrl.lastIndexOf('/'), baseUrl.lastIndexOf(':'));
        String databaseName = separatorIndex >= 0 ? baseUrl.substring(separatorIndex + 1) : baseUrl;
        return "marketplace_db".equals(databaseName);
    }

    private int firstOptionsIndex(String value) {
        int queryIndex = value.indexOf('?');
        int semicolonIndex = value.indexOf(';');
        if (queryIndex < 0) {
            return semicolonIndex;
        }
        if (semicolonIndex < 0) {
            return queryIndex;
        }
        return Math.min(queryIndex, semicolonIndex);
    }
}
