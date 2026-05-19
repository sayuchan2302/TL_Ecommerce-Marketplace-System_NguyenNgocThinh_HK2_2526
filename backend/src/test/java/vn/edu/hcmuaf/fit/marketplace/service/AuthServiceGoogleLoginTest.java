package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.dto.request.GoogleLoginRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.response.AuthResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.config.GoogleAuthProperties;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;
import vn.edu.hcmuaf.fit.marketplace.security.JwtService;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceGoogleLoginTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private FakeJwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserDetailsService userDetailsService;

    @Mock
    private StoreRepository storeRepository;

    private StubGoogleIdTokenVerifier googleIdTokenVerifier;

    private AuthService service;

    @BeforeEach
    void setUp() {
        jwtService = new FakeJwtService();
        googleIdTokenVerifier = new StubGoogleIdTokenVerifier();
        service = new AuthService(
                userRepository,
                passwordEncoder,
                jwtService,
                authenticationManager,
                userDetailsService,
                storeRepository,
                googleIdTokenVerifier,
                null
        );
    }

    @Test
    void loginWithGoogleCreatesCustomerWithCartForNewEmail() {
        GoogleUserInfo googleUser = new GoogleUserInfo(
                "google-sub-1",
                "new.customer@test.local",
                "New Customer",
                "https://lh3.googleusercontent.com/avatar"
        );
        googleIdTokenVerifier.userInfo = googleUser;
        when(userRepository.findByGoogleSubject("google-sub-1")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("new.customer@test.local")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-random-secret");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });
        stubTokenIssue("new.customer@test.local", User.Role.CUSTOMER);

        AuthResponse response = service.loginWithGoogle(new GoogleLoginRequest("id-token"));

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User saved = userCaptor.getValue();
        assertEquals("new.customer@test.local", saved.getEmail());
        assertEquals("google-sub-1", saved.getGoogleSubject());
        assertEquals("encoded-random-secret", saved.getPassword());
        assertEquals("New Customer", saved.getName());
        assertEquals("https://lh3.googleusercontent.com/avatar", saved.getAvatar());
        assertEquals(User.Role.CUSTOMER, saved.getRole());
        assertTrue(saved.getIsActive());
        assertNotNull(saved.getCart());
        assertSame(saved, saved.getCart().getUser());
        assertEquals("jwt-token", response.getToken());
        assertEquals("refresh-token", response.getRefreshToken());
        assertEquals("CUSTOMER", response.getRole());
    }

    @Test
    void loginWithGoogleLinksExistingEmailAndKeepsRole() {
        User user = buildUser("vendor@test.local", User.Role.VENDOR);
        GoogleUserInfo googleUser = new GoogleUserInfo(
                "google-vendor",
                "vendor@test.local",
                "Vendor Name",
                "https://lh3.googleusercontent.com/vendor"
        );
        googleIdTokenVerifier.userInfo = googleUser;
        when(userRepository.findByGoogleSubject("google-vendor")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("vendor@test.local")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        stubTokenIssue("vendor@test.local", User.Role.VENDOR);

        AuthResponse response = service.loginWithGoogle(new GoogleLoginRequest("id-token"));

        assertEquals("google-vendor", user.getGoogleSubject());
        assertEquals(User.Role.VENDOR, user.getRole());
        assertEquals("https://lh3.googleusercontent.com/vendor", user.getAvatar());
        assertEquals("VENDOR", response.getRole());
    }

    @Test
    void loginWithGoogleUsesAlreadyLinkedUser() {
        User user = buildUser("customer@test.local", User.Role.CUSTOMER);
        user.setGoogleSubject("linked-sub");
        user.setAvatar("https://existing/avatar.png");
        GoogleUserInfo googleUser = new GoogleUserInfo(
                "linked-sub",
                "customer@test.local",
                "Customer",
                "https://new/avatar.png"
        );
        googleIdTokenVerifier.userInfo = googleUser;
        when(userRepository.findByGoogleSubject("linked-sub")).thenReturn(Optional.of(user));
        when(userRepository.findByEmailIgnoreCase("customer@test.local")).thenReturn(Optional.of(user));
        stubTokenIssue("customer@test.local", User.Role.CUSTOMER);

        AuthResponse response = service.loginWithGoogle(new GoogleLoginRequest("id-token"));

        verify(userRepository, never()).save(any(User.class));
        assertEquals("https://existing/avatar.png", response.getAvatar());
        assertEquals("CUSTOMER", response.getRole());
    }

    @Test
    void loginWithGoogleRejectsInactiveExistingUser() {
        User user = buildUser("inactive@test.local", User.Role.CUSTOMER);
        user.setIsActive(false);
        GoogleUserInfo googleUser = new GoogleUserInfo("sub", "inactive@test.local", "Inactive", "");
        googleIdTokenVerifier.userInfo = googleUser;
        when(userRepository.findByGoogleSubject("sub")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("inactive@test.local")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.loginWithGoogle(new GoogleLoginRequest("id-token"))
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(userRepository, never()).save(any(User.class));
        assertEquals(0, jwtService.tokenCount);
        assertEquals(0, jwtService.refreshCount);
    }

    @Test
    void loginWithGoogleRejectsEmailLinkedToDifferentGoogleSubject() {
        User user = buildUser("customer@test.local", User.Role.CUSTOMER);
        user.setGoogleSubject("other-sub");
        GoogleUserInfo googleUser = new GoogleUserInfo("new-sub", "customer@test.local", "Customer", "");
        googleIdTokenVerifier.userInfo = googleUser;
        when(userRepository.findByGoogleSubject("new-sub")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("customer@test.local")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.loginWithGoogle(new GoogleLoginRequest("id-token"))
        );

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(userRepository, never()).save(any(User.class));
        assertEquals(0, jwtService.tokenCount);
        assertEquals(0, jwtService.refreshCount);
    }

    @Test
    void loginWithGooglePropagatesInvalidTokenAsBadRequest() {
        googleIdTokenVerifier.exception = new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Google ID token");

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.loginWithGoogle(new GoogleLoginRequest("id-token"))
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(userRepository);
        assertEquals(0, jwtService.tokenCount);
        assertEquals(0, jwtService.refreshCount);
    }

    private User buildUser(String email, User.Role role) {
        return User.builder()
                .id(UUID.randomUUID())
                .email(email)
                .password("encoded-password")
                .name("Existing User")
                .role(role)
                .isActive(true)
                .build();
    }

    private void stubTokenIssue(String email, User.Role role) {
        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername(email)
                .password("encoded-password")
                .authorities("ROLE_" + role.name())
                .build();
        when(userDetailsService.loadUserByUsername(email)).thenReturn(userDetails);
    }

    private static final class StubGoogleIdTokenVerifier extends GoogleIdTokenVerifier {
        private GoogleUserInfo userInfo;
        private ResponseStatusException exception;

        private StubGoogleIdTokenVerifier() {
            super(new GoogleAuthProperties());
        }

        @Override
        public GoogleUserInfo verify(String idToken) {
            if (exception != null) {
                throw exception;
            }
            return userInfo;
        }
    }

    private static final class FakeJwtService extends JwtService {
        private int tokenCount;
        private int refreshCount;

        @Override
        public String generateTokenWithUserContext(String userId, String role, String storeId, UserDetails userDetails) {
            tokenCount++;
            return "jwt-token";
        }

        @Override
        public String generateRefreshToken(UserDetails userDetails) {
            refreshCount++;
            return "refresh-token";
        }
    }
}
