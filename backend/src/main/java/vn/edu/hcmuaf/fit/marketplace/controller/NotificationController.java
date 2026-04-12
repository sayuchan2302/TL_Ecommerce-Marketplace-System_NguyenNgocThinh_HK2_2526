package vn.edu.hcmuaf.fit.marketplace.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import vn.edu.hcmuaf.fit.marketplace.dto.response.NotificationResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.Notification;
import vn.edu.hcmuaf.fit.marketplace.security.AuthContext;
import vn.edu.hcmuaf.fit.marketplace.service.NotificationDomainService;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationDomainService notificationDomainService;
    private final AuthContext authContext;

    public NotificationController(NotificationDomainService notificationDomainService, AuthContext authContext) {
        this.notificationDomainService = notificationDomainService;
        this.authContext = authContext;
    }

    @GetMapping("/me")
    public ResponseEntity<Page<NotificationResponse>> getMyNotifications(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) Boolean read,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        AuthContext.UserContext ctx = authContext.fromAuthHeader(authHeader);
        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Notification.NotificationType parsedType = parseType(type);
        return ResponseEntity.ok(notificationDomainService.listForUser(ctx.getUserId(), read, parsedType, pageable));
    }

    @GetMapping("/me/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@RequestHeader("Authorization") String authHeader) {
        AuthContext.UserContext ctx = authContext.fromAuthHeader(authHeader);
        long unreadCount = notificationDomainService.countUnreadByUser(ctx.getUserId());
        return ResponseEntity.ok(Map.of("unreadCount", unreadCount));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id
    ) {
        AuthContext.UserContext ctx = authContext.fromAuthHeader(authHeader);
        return ResponseEntity.ok(notificationDomainService.markAsRead(ctx.getUserId(), id));
    }

    @PatchMapping("/me/read-all")
    public ResponseEntity<Map<String, Long>> markAllAsRead(@RequestHeader("Authorization") String authHeader) {
        AuthContext.UserContext ctx = authContext.fromAuthHeader(authHeader);
        notificationDomainService.markAllAsRead(ctx.getUserId());
        long unreadCount = notificationDomainService.countUnreadByUser(ctx.getUserId());
        return ResponseEntity.ok(Map.of("unreadCount", unreadCount));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id
    ) {
        AuthContext.UserContext ctx = authContext.fromAuthHeader(authHeader);
        notificationDomainService.delete(ctx.getUserId(), id);
        return ResponseEntity.noContent().build();
    }

    private Notification.NotificationType parseType(String rawType) {
        if (rawType == null || rawType.isBlank()) {
            return null;
        }
        try {
            return Notification.NotificationType.valueOf(rawType.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported notification type: " + rawType);
        }
    }
}
