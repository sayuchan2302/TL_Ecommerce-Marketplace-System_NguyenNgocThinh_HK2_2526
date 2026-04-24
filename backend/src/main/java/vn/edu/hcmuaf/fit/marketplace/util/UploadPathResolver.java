package vn.edu.hcmuaf.fit.marketplace.util;

import java.nio.file.Path;
import java.nio.file.Paths;

public final class UploadPathResolver {

    private UploadPathResolver() {
    }

    public static Path resolveBaseUploadPath(String configuredBaseDir) {
        String value = configuredBaseDir == null ? "" : configuredBaseDir.trim();
        if (value.isBlank()) {
            value = "backend/upload";
        }

        Path configuredPath = Paths.get(value);
        if (configuredPath.isAbsolute()) {
            return configuredPath.normalize();
        }

        String normalizedValue = value.replace('\\', '/');
        if (normalizedValue.startsWith("./")) {
            normalizedValue = normalizedValue.substring(2);
        }

        Path currentDir = Paths.get("").toAbsolutePath().normalize();
        String currentDirName = currentDir.getFileName() == null
                ? ""
                : currentDir.getFileName().toString().toLowerCase();

        if ("backend".equals(currentDirName) && normalizedValue.startsWith("backend/")) {
            String trimmed = normalizedValue.substring("backend/".length());
            if (trimmed.isBlank()) {
                trimmed = "upload";
            }
            return currentDir.resolve(trimmed).normalize();
        }

        return currentDir.resolve(configuredPath).normalize();
    }
}
