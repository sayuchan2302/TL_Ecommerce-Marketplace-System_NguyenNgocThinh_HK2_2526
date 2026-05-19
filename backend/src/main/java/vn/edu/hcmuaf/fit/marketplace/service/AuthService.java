package vn.edu.hcmuaf.fit.marketplace.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.dto.request.GoogleLoginRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.request.LoginRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.request.RegisterRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.response.AuthResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.Cart;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;
import vn.edu.hcmuaf.fit.marketplace.security.JwtService;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Objects;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final StoreRepository storeRepository;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final FacebookIdTokenVerifier facebookIdTokenVerifier;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, AuthenticationManager authenticationManager,
                       UserDetailsService userDetailsService, StoreRepository storeRepository,
                       GoogleIdTokenVerifier googleIdTokenVerifier,
                       FacebookIdTokenVerifier facebookIdTokenVerifier) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.storeRepository = storeRepository;
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.facebookIdTokenVerifier = facebookIdTokenVerifier;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            logger.warn("Register attempt with existing email={}", request.getEmail());
            throw new BadCredentialsException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .phone(request.getPhone())
                .role(User.Role.CUSTOMER)
                .gender(User.Gender.OTHER)
                .loyaltyPoints(0L)
                .isActive(true)
                .build();

        Cart cart = Cart.builder()
                .user(user)
                .build();
        user.setCart(cart);

        userRepository.save(user);

        return issueAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (BadCredentialsException ex) {
            logger.warn("Login failed for email={} : {}", request.getEmail(), ex.getMessage());
            throw new BadCredentialsException("Invalid credentials");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        return issueAuthResponse(user);
    }

    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleUserInfo googleUser = googleIdTokenVerifier.verify(request.getIdToken());
        User user = resolveGoogleUser(googleUser);

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive");
        }

        return issueAuthResponse(user);
    }

    @Transactional
    public AuthResponse loginWithFacebook(vn.edu.hcmuaf.fit.marketplace.dto.request.FacebookLoginRequest request) {
        FacebookUserInfo facebookUser = facebookIdTokenVerifier.verify(request.getAccessToken());
        User user = resolveFacebookUser(facebookUser);

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive");
        }

        return issueAuthResponse(user);
    }

    public AuthResponse refreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            logger.warn("Refresh token request rejected: token is blank");
            throw new BadCredentialsException("Invalid refresh token");
        }

        try {
            String email = jwtService.extractUsername(refreshToken);
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);

            if (!jwtService.isTokenValid(refreshToken, userDetails)) {
                logger.warn("Refresh token invalid for email={}", email);
                throw new BadCredentialsException("Invalid refresh token");
            }

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

            String newToken = jwtService.generateTokenWithUserContext(
                    user.getId().toString(),
                    user.getRole().name(),
                    user.getStoreId() != null ? user.getStoreId().toString() : null,
                    userDetails
            );
            String newRefreshToken = jwtService.generateRefreshToken(userDetails);

            return buildAuthResponse(user, newToken, newRefreshToken);
        } catch (BadCredentialsException ex) {
            throw ex;
        } catch (Exception ex) {
            logger.warn("Refresh token validation failed: {}", ex.getMessage());
            throw new BadCredentialsException("Invalid refresh token");
        }
    }

    private User resolveGoogleUser(GoogleUserInfo googleUser) {
        return userRepository.findByGoogleSubject(googleUser.subject())
                .map(user -> resolveLinkedGoogleUser(user, googleUser))
                .orElseGet(() -> resolveByGoogleEmail(googleUser));
    }

    private User resolveLinkedGoogleUser(User user, GoogleUserInfo googleUser) {
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive");
        }
        userRepository.findByEmailIgnoreCase(googleUser.email())
                .filter(other -> !Objects.equals(other.getId(), user.getId()))
                .ifPresent(other -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Google account is linked to another user");
                });
        return applyGoogleProfileIfNeeded(user, googleUser, false);
    }

    private User resolveByGoogleEmail(GoogleUserInfo googleUser) {
        return userRepository.findByEmailIgnoreCase(googleUser.email())
                .map(user -> linkExistingGoogleUser(user, googleUser))
                .orElseGet(() -> createGoogleUser(googleUser));
    }

    private User linkExistingGoogleUser(User user, GoogleUserInfo googleUser) {
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive");
        }
        if (hasText(user.getGoogleSubject()) && !user.getGoogleSubject().equals(googleUser.subject())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is linked to another Google account");
        }

        boolean changed = !Objects.equals(user.getGoogleSubject(), googleUser.subject());
        user.setGoogleSubject(googleUser.subject());
        return applyGoogleProfileIfNeeded(user, googleUser, changed);
    }

    private User createGoogleUser(GoogleUserInfo googleUser) {
        User user = User.builder()
                .email(googleUser.email())
                .googleSubject(googleUser.subject())
                .password(generateRandomPasswordHash())
                .name(defaultGoogleName(googleUser))
                .avatar(hasText(googleUser.picture()) ? googleUser.picture() : null)
                .role(User.Role.CUSTOMER)
                .gender(User.Gender.OTHER)
                .loyaltyPoints(0L)
                .isActive(true)
                .build();

        Cart cart = Cart.builder()
                .user(user)
                .build();
        user.setCart(cart);

        return userRepository.save(user);
    }

    private User applyGoogleProfileIfNeeded(User user, GoogleUserInfo googleUser, boolean changed) {
        if (!hasText(user.getName()) && hasText(googleUser.name())) {
            user.setName(googleUser.name());
            changed = true;
        }
        if (!hasText(user.getAvatar()) && hasText(googleUser.picture())) {
            user.setAvatar(googleUser.picture());
            changed = true;
        }
        return changed ? userRepository.save(user) : user;
    }

    private User resolveFacebookUser(FacebookUserInfo facebookUser) {
        return userRepository.findByFacebookSubject(facebookUser.subject())
                .map(user -> resolveLinkedFacebookUser(user, facebookUser))
                .orElseGet(() -> resolveByFacebookEmail(facebookUser));
    }

    private User resolveLinkedFacebookUser(User user, FacebookUserInfo facebookUser) {
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive");
        }
        userRepository.findByEmailIgnoreCase(facebookUser.email())
                .filter(other -> !Objects.equals(other.getId(), user.getId()))
                .ifPresent(other -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Facebook account is linked to another user");
                });
        return applyFacebookProfileIfNeeded(user, facebookUser, false);
    }

    private User resolveByFacebookEmail(FacebookUserInfo facebookUser) {
        return userRepository.findByEmailIgnoreCase(facebookUser.email())
                .map(user -> linkExistingFacebookUser(user, facebookUser))
                .orElseGet(() -> createFacebookUser(facebookUser));
    }

    private User linkExistingFacebookUser(User user, FacebookUserInfo facebookUser) {
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive");
        }
        if (hasText(user.getFacebookSubject()) && !user.getFacebookSubject().equals(facebookUser.subject())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is linked to another Facebook account");
        }

        boolean changed = !Objects.equals(user.getFacebookSubject(), facebookUser.subject());
        user.setFacebookSubject(facebookUser.subject());
        return applyFacebookProfileIfNeeded(user, facebookUser, changed);
    }

    private User createFacebookUser(FacebookUserInfo facebookUser) {
        User user = User.builder()
                .email(facebookUser.email())
                .facebookSubject(facebookUser.subject())
                .password(generateRandomPasswordHash())
                .name(defaultFacebookName(facebookUser))
                .avatar(null)
                .role(User.Role.CUSTOMER)
                .gender(User.Gender.OTHER)
                .loyaltyPoints(0L)
                .isActive(true)
                .build();

        Cart cart = Cart.builder()
                .user(user)
                .build();
        user.setCart(cart);

        return userRepository.save(user);
    }

    private User applyFacebookProfileIfNeeded(User user, FacebookUserInfo facebookUser, boolean changed) {
        if (!hasText(user.getName()) && hasText(facebookUser.name())) {
            user.setName(facebookUser.name());
            changed = true;
        }
        return changed ? userRepository.save(user) : user;
    }

    private String defaultFacebookName(FacebookUserInfo facebookUser) {
        if (hasText(facebookUser.name())) {
            return facebookUser.name();
        }
        if (hasText(facebookUser.email())) {
            int atIndex = facebookUser.email().indexOf('@');
            return atIndex > 0 ? facebookUser.email().substring(0, atIndex) : facebookUser.email();
        }
        return "Facebook User";
    }

    private AuthResponse issueAuthResponse(User user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtService.generateTokenWithUserContext(
                user.getId().toString(),
                user.getRole().name(),
                user.getStoreId() != null ? user.getStoreId().toString() : null,
                userDetails
        );
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        return buildAuthResponse(user, token, refreshToken);
    }

    private AuthResponse buildAuthResponse(User user, String token, String refreshToken) {
        boolean approvedVendor = false;
        if (user.getStoreId() != null) {
            approvedVendor = storeRepository.findById(user.getStoreId())
                    .map(store -> store.getApprovalStatus() == Store.ApprovalStatus.APPROVED
                            && store.getStatus() == Store.StoreStatus.ACTIVE)
                    .orElse(false);
        }

        return AuthResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .email(user.getEmail())
                .name(user.getName())
                .avatar(user.getAvatar())
                .role(user.getRole().name())
                .storeId(user.getStoreId())
                .approvedVendor(approvedVendor)
                .build();
    }

    private String generateRandomPasswordHash() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String randomSecret = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return passwordEncoder.encode(randomSecret);
    }

    private String defaultGoogleName(GoogleUserInfo googleUser) {
        if (hasText(googleUser.name())) {
            return googleUser.name();
        }
        int atIndex = googleUser.email().indexOf('@');
        return atIndex > 0 ? googleUser.email().substring(0, atIndex) : googleUser.email();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

}
