package vn.edu.hcmuaf.fit.marketplace.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.edu.hcmuaf.fit.marketplace.config.VisionSearchProperties;
import vn.edu.hcmuaf.fit.marketplace.dto.response.ApiErrorResponse;

import java.io.IOException;

@Component
public class ImageSearchRateLimitFilter extends OncePerRequestFilter {

    private static final String IMAGE_SEARCH_PATH = "/api/public/marketplace/search/image";

    private final ImageSearchRateLimitService rateLimitService;
    private final VisionSearchProperties properties;
    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    public ImageSearchRateLimitFilter(
            ImageSearchRateLimitService rateLimitService,
            VisionSearchProperties properties,
            JwtService jwtService,
            ObjectMapper objectMapper) {
        this.rateLimitService = rateLimitService;
        this.properties = properties;
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return !HttpMethod.POST.matches(request.getMethod())
                || !IMAGE_SEARCH_PATH.equals(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String key = resolveKey(request);
        if (rateLimitService.allow(key)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", "60");
        response.setContentType("application/json;charset=UTF-8");
        ApiErrorResponse body = ApiErrorResponse.of(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too many image search requests. Please try again later.",
                request.getRequestURI());
        objectMapper.writeValue(response.getWriter(), body);
    }

    private String resolveKey(HttpServletRequest request) {
        String userId = resolveAuthenticatedUserId(request);
        if (userId != null && !userId.isBlank()) {
            return "user:" + userId;
        }
        return "ip:" + resolveClientIp(request);
    }

    private String resolveAuthenticatedUserId(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        String token = resolveBearerToken(request);
        if (token == null) {
            return authentication.getName();
        }
        try {
            String userId = jwtService.extractUserId(token);
            return userId == null || userId.isBlank() ? authentication.getName() : userId;
        } catch (RuntimeException ignored) {
            return authentication.getName();
        }
    }

    private String resolveBearerToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        return authHeader.substring(7);
    }

    private String resolveClientIp(HttpServletRequest request) {
        if (properties.isTrustProxyHeaders()) {
            String forwardedFor = firstHeaderValue(request.getHeader("X-Forwarded-For"));
            if (forwardedFor != null) {
                return forwardedFor;
            }
            String realIp = firstHeaderValue(request.getHeader("X-Real-IP"));
            if (realIp != null) {
                return realIp;
            }
        }
        return request.getRemoteAddr();
    }

    private String firstHeaderValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String first = value.split(",", 2)[0].trim();
        return first.isBlank() ? null : first;
    }
}
