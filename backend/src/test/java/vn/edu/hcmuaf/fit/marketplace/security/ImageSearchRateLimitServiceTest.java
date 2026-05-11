package vn.edu.hcmuaf.fit.marketplace.security;

import org.junit.jupiter.api.Test;
import vn.edu.hcmuaf.fit.marketplace.config.VisionSearchProperties;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ImageSearchRateLimitServiceTest {

    @Test
    void allowRejectsWhenMinuteLimitIsExceeded() {
        VisionSearchProperties properties = new VisionSearchProperties();
        properties.setRateLimitPerMinute(2);
        properties.setRateLimitPerHour(10);
        MutableClock clock = new MutableClock(Instant.parse("2026-05-10T10:00:00Z"));
        ImageSearchRateLimitService service = new ImageSearchRateLimitService(properties, clock);

        assertTrue(service.allow("ip:127.0.0.1"));
        assertTrue(service.allow("ip:127.0.0.1"));
        assertFalse(service.allow("ip:127.0.0.1"));

        clock.now = Instant.parse("2026-05-10T10:01:01Z");
        assertTrue(service.allow("ip:127.0.0.1"));
    }

    @Test
    void cleanupRemovesExpiredWindows() {
        VisionSearchProperties properties = new VisionSearchProperties();
        properties.setRateLimitPerMinute(1);
        properties.setRateLimitPerHour(1);
        MutableClock clock = new MutableClock(Instant.parse("2026-05-10T10:00:00Z"));
        ImageSearchRateLimitService service = new ImageSearchRateLimitService(properties, clock);

        assertTrue(service.allow("user:1"));
        assertFalse(service.allow("user:1"));

        clock.now = Instant.parse("2026-05-10T11:01:00Z");
        service.cleanup();
        assertTrue(service.allow("user:1"));
    }

    private static final class MutableClock extends Clock {
        private Instant now;

        private MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
