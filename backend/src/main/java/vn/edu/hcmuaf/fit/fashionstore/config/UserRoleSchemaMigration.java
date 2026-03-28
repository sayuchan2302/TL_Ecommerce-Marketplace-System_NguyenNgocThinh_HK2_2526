package vn.edu.hcmuaf.fit.fashionstore.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@Order(10)
@ConditionalOnProperty(prefix = "app.migration.user-role", name = "enabled", havingValue = "true", matchIfMissing = false)
@RequiredArgsConstructor
public class UserRoleSchemaMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(String... args) {
        jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
        jdbcTemplate.update("UPDATE users SET role = 'CUSTOMER' WHERE role = 'USER'");
        jdbcTemplate.update("UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN'");
        jdbcTemplate.execute("""
                ALTER TABLE users
                ADD CONSTRAINT users_role_check
                CHECK (role IN ('CUSTOMER', 'VENDOR', 'SUPER_ADMIN'))
                """);

        log.info("Aligned users.role constraint to marketplace roles: CUSTOMER, VENDOR, SUPER_ADMIN");
    }
}
