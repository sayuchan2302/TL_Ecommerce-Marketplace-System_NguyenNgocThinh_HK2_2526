package vn.edu.hcmuaf.fit.marketplace.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import vn.edu.hcmuaf.fit.marketplace.config.VisionSearchProperties;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayDeque;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ImageSearchRateLimitService {

    private final VisionSearchProperties properties;
    private final Clock clock;
    private final Map<String, ArrayDeque<Instant>> requestsByKey = new ConcurrentHashMap<>();

    @Autowired
    public ImageSearchRateLimitService(VisionSearchProperties properties) {
        this(properties, Clock.systemUTC());
    }

    ImageSearchRateLimitService(VisionSearchProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public boolean allow(String key) {
        if (!properties.isRateLimitEnabled()) {
            return true;
        }

        int perMinute = Math.max(1, properties.getRateLimitPerMinute());
        int perHour = Math.max(perMinute, properties.getRateLimitPerHour());
        Instant now = clock.instant();
        Instant hourFloor = now.minus(1, ChronoUnit.HOURS);
        Instant minuteFloor = now.minus(1, ChronoUnit.MINUTES);
        ArrayDeque<Instant> requests = requestsByKey.computeIfAbsent(key,
                ignored -> new ArrayDeque<>());

        synchronized (requests) {
            removeOlderThan(requests, hourFloor);
            long minuteCount = requests.stream()
                    .filter(timestamp -> !timestamp.isBefore(minuteFloor))
                    .count();
            if (minuteCount >= perMinute || requests.size() >= perHour) {
                return false;
            }
            requests.addLast(now);
            return true;
        }
    }

    @Scheduled(fixedDelayString = "${app.vision.rate-limit-cleanup-ms:60000}")
    public void cleanup() {
        Instant hourFloor = clock.instant().minus(1, ChronoUnit.HOURS);
        for (Map.Entry<String, ArrayDeque<Instant>> entry : requestsByKey.entrySet()) {
            ArrayDeque<Instant> requests = entry.getValue();
            synchronized (requests) {
                removeOlderThan(requests, hourFloor);
                if (requests.isEmpty()) {
                    requestsByKey.remove(entry.getKey(), requests);
                }
            }
        }
    }

    private void removeOlderThan(ArrayDeque<Instant> requests, Instant floor) {
        Iterator<Instant> iterator = requests.iterator();
        while (iterator.hasNext()) {
            if (!iterator.next().isBefore(floor)) {
                break;
            }
            iterator.remove();
        }
    }
}
