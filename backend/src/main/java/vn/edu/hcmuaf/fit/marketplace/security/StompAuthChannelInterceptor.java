package vn.edu.hcmuaf.fit.marketplace.security;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public StompAuthChannelInterceptor(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() != StompCommand.CONNECT) {
            return message;
        }

        String bearer = resolveBearerToken(accessor);
        if (bearer == null) {
            throw new IllegalArgumentException("Missing Authorization header for WebSocket CONNECT");
        }

        String username = jwtService.extractUsername(bearer);
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Invalid JWT subject for WebSocket CONNECT");
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        if (!jwtService.isTokenValid(bearer, userDetails)) {
            throw new IllegalArgumentException("Invalid JWT for WebSocket CONNECT");
        }

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
        );
        accessor.setUser(authentication);
        return message;
    }

    private String resolveBearerToken(StompHeaderAccessor accessor) {
        List<String> authValues = accessor.getNativeHeader("Authorization");
        if (authValues == null || authValues.isEmpty()) {
            return null;
        }
        String auth = authValues.get(0);
        if (auth == null || auth.isBlank()) {
            return null;
        }
        String normalized = auth.trim();
        if (normalized.startsWith("Bearer ")) {
            return normalized.substring(7);
        }
        return normalized;
    }
}
