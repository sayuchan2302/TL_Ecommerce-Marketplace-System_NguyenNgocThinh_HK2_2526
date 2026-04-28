package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VisionSearchClientTest {

    @Test
    void sanitizeMultipartFilenameReplacesControlCharactersAndQuotes() {
        String sanitized = VisionSearchClient.sanitizeMultipartFilename("bad\r\n\"name\"\\path/test.jpg");

        assertEquals("bad___name__path_test.jpg", sanitized);
    }

    @Test
    void sanitizeMultipartFilenameFallsBackWhenBlank() {
        assertEquals("query-image", VisionSearchClient.sanitizeMultipartFilename("  "));
        assertEquals("query-image", VisionSearchClient.sanitizeMultipartFilename(null));
    }
}
