package vn.edu.hcmuaf.fit.marketplace.chatbot.scenario;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.edu.hcmuaf.fit.marketplace.entity.BotScenarioRevision;
import vn.edu.hcmuaf.fit.marketplace.repository.BotScenarioRevisionRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.AdminAuditLogRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;
import vn.edu.hcmuaf.fit.marketplace.service.AdminAuditLogService;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BotScenarioServiceTest {

    private BotScenarioRevisionRepository revisionRepository;
    private AdminAuditLogService adminAuditLogService;
    private UserRepository userRepository;
    private BotScenarioService botScenarioService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        revisionRepository = mock(BotScenarioRevisionRepository.class);
        AdminAuditLogRepository adminAuditLogRepository = mock(AdminAuditLogRepository.class);
        adminAuditLogService = new AdminAuditLogService(adminAuditLogRepository);
        userRepository = mock(UserRepository.class);
        objectMapper = new ObjectMapper();
        botScenarioService = new BotScenarioService(revisionRepository, adminAuditLogService, userRepository, objectMapper);

        when(revisionRepository.save(any(BotScenarioRevision.class))).thenAnswer(invocation -> {
            BotScenarioRevision revision = invocation.getArgument(0);
            if (revision.getId() == null) {
                revision.setId(UUID.randomUUID());
            }
            return revision;
        });
    }

    @Test
    void saveDraft_rejectsPayloadWhenMissingRequiredQuickAction() {
        BotScenarioPayload invalidPayload = basePayload();
        invalidPayload.setQuickActions(List.of(
                BotScenarioQuickAction.builder().key(BotScenarioActionKey.ORDER_LOOKUP).label("Tra cuu don").build(),
                BotScenarioQuickAction.builder().key(BotScenarioActionKey.SIZE_ADVICE).label("Tu van size").build()
        ));

        RuntimeException error = assertThrows(RuntimeException.class,
                () -> botScenarioService.saveDraft(invalidPayload, "admin@fashion.local"));

        assertTrue(error.getMessage().contains("quickActions must include exactly"));
    }

    @Test
    void publishDraft_usesDraftPayloadAndUpdatesCachedPublishedScenario() throws Exception {
        BotScenarioPayload draftPayload = basePayload();
        draftPayload.setWelcomePrompt("Welcome from draft");

        BotScenarioRevision draftRevision = BotScenarioRevision.builder()
                .status(BotScenarioRevision.ScenarioStatus.DRAFT)
                .revisionNumber(4)
                .payloadJson(objectMapper.writeValueAsString(draftPayload))
                .build();

        BotScenarioRevision publishedRevision = BotScenarioRevision.builder()
                .status(BotScenarioRevision.ScenarioStatus.PUBLISHED)
                .revisionNumber(2)
                .payloadJson(objectMapper.writeValueAsString(basePayload()))
                .build();

        when(revisionRepository.findTopByStatusOrderByRevisionNumberDesc(BotScenarioRevision.ScenarioStatus.DRAFT))
                .thenReturn(Optional.of(draftRevision));
        when(revisionRepository.findTopByStatusOrderByRevisionNumberDesc(BotScenarioRevision.ScenarioStatus.PUBLISHED))
                .thenReturn(Optional.of(publishedRevision));

        botScenarioService.publishDraft("admin@fashion.local");

        BotScenarioPayload published = botScenarioService.getPublishedScenario();
        assertEquals("Welcome from draft", published.getWelcomePrompt());

        ArgumentCaptor<BotScenarioRevision> captor = ArgumentCaptor.forClass(BotScenarioRevision.class);
        verify(revisionRepository, atLeastOnce()).save(captor.capture());
        BotScenarioRevision savedPublished = captor.getAllValues().stream()
                .filter(item -> item.getStatus() == BotScenarioRevision.ScenarioStatus.PUBLISHED)
                .findFirst()
                .orElseThrow();
        assertEquals(3, savedPublished.getRevisionNumber());
    }

    private BotScenarioPayload basePayload() {
        return BotScenarioPayload.builder()
                .welcomePrompt("Xin chao")
                .unknownPrompt("Khong hieu")
                .askOrderCodePrompt("Nhap ma don")
                .askOrderPhonePrompt("Nhap 4 so cuoi")
                .orderPhoneInvalidPrompt("Sai 4 so")
                .orderLookupContinuePrompt("Can ho tro them?")
                .askHeightPrompt("Nhap chieu cao")
                .invalidHeightPrompt("Sai chieu cao")
                .askWeightPrompt("Nhap can nang")
                .invalidWeightPrompt("Sai can nang")
                .sizeAdviceContinuePrompt("Tiep tuc tac vu?")
                .productFaqContinuePrompt("Hoi them gi?")
                .quickActions(List.of(
                        BotScenarioQuickAction.builder().key(BotScenarioActionKey.ORDER_LOOKUP).label("Tra cuu don").build(),
                        BotScenarioQuickAction.builder().key(BotScenarioActionKey.SIZE_ADVICE).label("Tu van size").build(),
                        BotScenarioQuickAction.builder().key(BotScenarioActionKey.PRODUCT_FAQ).label("Hoi dap san pham").build()
                ))
                .build();
    }
}
