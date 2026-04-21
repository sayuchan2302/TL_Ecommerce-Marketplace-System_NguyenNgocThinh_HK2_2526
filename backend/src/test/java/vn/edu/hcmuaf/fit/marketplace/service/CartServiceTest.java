package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import vn.edu.hcmuaf.fit.marketplace.entity.Cart;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.repository.CartRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductVariantRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductVariantRepository productVariantRepository;
    @Mock
    private StoreRepository storeRepository;

    private CartService cartService;

    @BeforeEach
    void setUp() {
        cartService = new CartService(
                cartRepository,
                userRepository,
                productRepository,
                productVariantRepository,
                storeRepository
        );
    }

    @Test
    void getCartByUserIdReturnsExistingCartWhenDuplicateInsertRaceOccurs() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("customer@example.com")
                .password("secret")
                .name("Customer")
                .build();
        Cart existing = Cart.builder()
                .id(UUID.randomUUID())
                .user(user)
                .build();

        when(cartRepository.findByUserIdWithItems(userId))
                .thenReturn(Optional.empty(), Optional.of(existing));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cartRepository.save(any(Cart.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "duplicate key value violates unique constraint \"uk_64t7ox312pqal3p7fg9o503c2\" Detail: Key (user_id)=(...) already exists."
                ));

        Cart actual = cartService.getCartByUserId(userId);

        assertSame(existing, actual);
    }

    @Test
    void getCartByUserIdRethrowsOtherDataIntegrityViolations() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("customer2@example.com")
                .password("secret")
                .name("Customer 2")
                .build();

        when(cartRepository.findByUserIdWithItems(userId)).thenReturn(Optional.empty());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cartRepository.save(any(Cart.class)))
                .thenThrow(new DataIntegrityViolationException("some other integrity violation"));

        assertThrows(DataIntegrityViolationException.class, () -> cartService.getCartByUserId(userId));
    }
}

