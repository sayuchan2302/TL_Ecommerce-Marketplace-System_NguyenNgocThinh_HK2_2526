package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class ContentKeywordUtils {

    private ContentKeywordUtils() {
    }

    public static List<String> normalizeKeywordList(List<String> rawKeywords) {
        if (rawKeywords == null || rawKeywords.isEmpty()) {
            return List.of();
        }

        Set<String> deduplicated = new LinkedHashSet<>();
        for (String raw : rawKeywords) {
            if (!StringUtils.hasText(raw)) {
                continue;
            }
            String[] parts = raw.split("[,;\\n\\r]+");
            for (String part : parts) {
                String normalized = normalizeForSearch(part);
                if (StringUtils.hasText(normalized)) {
                    deduplicated.add(normalized);
                }
            }
        }
        return new ArrayList<>(deduplicated);
    }

    public static String encodeKeywords(List<String> keywords) {
        List<String> normalized = normalizeKeywordList(keywords);
        if (normalized.isEmpty()) {
            return null;
        }
        return String.join("\n", normalized);
    }

    public static List<String> decodeKeywords(String encoded) {
        if (!StringUtils.hasText(encoded)) {
            return List.of();
        }
        String[] lines = encoded.split("[\\n\\r]+");
        List<String> values = new ArrayList<>();
        for (String line : lines) {
            String normalized = normalizeForSearch(line);
            if (StringUtils.hasText(normalized)) {
                values.add(normalized);
            }
        }
        return values;
    }

    public static String normalizeForSearch(String input) {
        if (!StringUtils.hasText(input)) {
            return "";
        }
        String noAccent = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        String normalized = noAccent
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return normalized.toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
    }
}

