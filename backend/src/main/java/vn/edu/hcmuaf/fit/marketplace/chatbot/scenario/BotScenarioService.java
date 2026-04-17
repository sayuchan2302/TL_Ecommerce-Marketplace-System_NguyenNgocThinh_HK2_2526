package vn.edu.hcmuaf.fit.marketplace.chatbot.scenario;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.dto.response.BotScenarioRevisionMetaResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.BotScenarioSnapshotResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.BotScenarioRevision;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.repository.BotScenarioRevisionRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;
import vn.edu.hcmuaf.fit.marketplace.service.AdminAuditLogService;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class BotScenarioService {

    private static final List<BotScenarioActionKey> REQUIRED_ACTION_KEYS = List.of(
            BotScenarioActionKey.ORDER_LOOKUP,
            BotScenarioActionKey.SIZE_ADVICE,
            BotScenarioActionKey.PRODUCT_FAQ
    );

    private final BotScenarioRevisionRepository revisionRepository;
    private final AdminAuditLogService adminAuditLogService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private volatile BotScenarioPayload cachedPublishedScenario;
    private volatile Integer cachedPublishedVersion;

    public BotScenarioService(
            BotScenarioRevisionRepository revisionRepository,
            AdminAuditLogService adminAuditLogService,
            UserRepository userRepository,
            ObjectMapper objectMapper
    ) {
        this.revisionRepository = revisionRepository;
        this.adminAuditLogService = adminAuditLogService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public BotScenarioSnapshotResponse getSnapshot() {
        Optional<BotScenarioRevision> draftRevision = latestRevision(BotScenarioRevision.ScenarioStatus.DRAFT);
        Optional<BotScenarioRevision> publishedRevision = latestRevision(BotScenarioRevision.ScenarioStatus.PUBLISHED);

        BotScenarioPayload publishedPayload = publishedRevision.map(this::toPayload).orElseGet(this::defaultPayload);
        BotScenarioPayload draftPayload = draftRevision.map(this::toPayload).orElseGet(() -> copyPayload(publishedPayload));

        return BotScenarioSnapshotResponse.builder()
                .draft(draftPayload)
                .published(copyPayload(publishedPayload))
                .draftMeta(draftRevision.map(this::toMeta).orElse(null))
                .publishedMeta(publishedRevision.map(this::toMeta).orElse(null))
                .build();
    }

    @Transactional
    public void saveDraft(BotScenarioPayload payload, String actorEmail) {
        BotScenarioPayload normalized = normalizeAndValidate(payload);
        int nextVersion = nextVersion(BotScenarioRevision.ScenarioStatus.DRAFT);

        BotScenarioRevision saved = revisionRepository.save(BotScenarioRevision.builder()
                .status(BotScenarioRevision.ScenarioStatus.DRAFT)
                .revisionNumber(nextVersion)
                .payloadJson(toJson(normalized))
                .updatedBy(actorEmail)
                .build());

        adminAuditLogService.logAction(
                resolveActorId(actorEmail),
                actorEmail,
                "BOT_SCENARIO",
                "BOT_SCENARIO_SAVE_DRAFT",
                saved.getId(),
                true,
                "Saved draft revision " + nextVersion
        );
    }

    @Transactional
    public void publishDraft(String actorEmail) {
        BotScenarioPayload draftPayload = latestRevision(BotScenarioRevision.ScenarioStatus.DRAFT)
                .map(this::toPayload)
                .orElseGet(this::getPublishedScenario);

        BotScenarioPayload normalized = normalizeAndValidate(draftPayload);
        int nextVersion = nextVersion(BotScenarioRevision.ScenarioStatus.PUBLISHED);

        BotScenarioRevision saved = revisionRepository.save(BotScenarioRevision.builder()
                .status(BotScenarioRevision.ScenarioStatus.PUBLISHED)
                .revisionNumber(nextVersion)
                .payloadJson(toJson(normalized))
                .updatedBy(actorEmail)
                .build());

        cachedPublishedScenario = copyPayload(normalized);
        cachedPublishedVersion = nextVersion;

        adminAuditLogService.logAction(
                resolveActorId(actorEmail),
                actorEmail,
                "BOT_SCENARIO",
                "BOT_SCENARIO_PUBLISH",
                saved.getId(),
                true,
                "Published scenario revision " + nextVersion
        );
    }

    @Transactional
    public void resetDraftFromPublished(String actorEmail) {
        BotScenarioPayload basePayload = getPublishedScenario();
        int nextVersion = nextVersion(BotScenarioRevision.ScenarioStatus.DRAFT);

        revisionRepository.save(BotScenarioRevision.builder()
                .status(BotScenarioRevision.ScenarioStatus.DRAFT)
                .revisionNumber(nextVersion)
                .payloadJson(toJson(basePayload))
                .updatedBy(actorEmail)
                .build());
    }

    @Transactional(readOnly = true)
    public BotScenarioPayload getPublishedScenario() {
        BotScenarioPayload cached = cachedPublishedScenario;
        Integer cachedVersion = cachedPublishedVersion;
        if (cached != null && cachedVersion != null) {
            return copyPayload(cached);
        }

        synchronized (this) {
            if (cachedPublishedScenario != null && cachedPublishedVersion != null) {
                return copyPayload(cachedPublishedScenario);
            }

            Optional<BotScenarioRevision> publishedRevision = latestRevision(BotScenarioRevision.ScenarioStatus.PUBLISHED);
            if (publishedRevision.isPresent()) {
                BotScenarioRevision revision = publishedRevision.get();
                BotScenarioPayload payload = toPayload(revision);
                cachedPublishedScenario = copyPayload(payload);
                cachedPublishedVersion = revision.getRevisionNumber();
                return payload;
            }

            BotScenarioPayload fallback = defaultPayload();
            cachedPublishedScenario = copyPayload(fallback);
            cachedPublishedVersion = 0;
            return fallback;
        }
    }

    private Optional<BotScenarioRevision> latestRevision(BotScenarioRevision.ScenarioStatus status) {
        return revisionRepository.findTopByStatusOrderByRevisionNumberDesc(status);
    }

    private int nextVersion(BotScenarioRevision.ScenarioStatus status) {
        return latestRevision(status).map(BotScenarioRevision::getRevisionNumber).orElse(0) + 1;
    }

    private BotScenarioRevisionMetaResponse toMeta(BotScenarioRevision revision) {
        return BotScenarioRevisionMetaResponse.builder()
                .version(revision.getRevisionNumber())
                .updatedAt(revision.getUpdatedAt())
                .updatedBy(revision.getUpdatedBy())
                .build();
    }

    private UUID resolveActorId(String actorEmail) {
        if (!StringUtils.hasText(actorEmail)) {
            return null;
        }
        return userRepository.findByEmail(actorEmail).map(User::getId).orElse(null);
    }

    private BotScenarioPayload toPayload(BotScenarioRevision revision) {
        try {
            BotScenarioPayload payload = objectMapper.readValue(revision.getPayloadJson(), BotScenarioPayload.class);
            return normalizeAndValidate(payload);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Invalid bot scenario payload in database", ex);
        }
    }

    private String toJson(BotScenarioPayload payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize bot scenario payload", ex);
        }
    }

    private BotScenarioPayload copyPayload(BotScenarioPayload payload) {
        return objectMapper.convertValue(payload, BotScenarioPayload.class);
    }

    private BotScenarioPayload normalizeAndValidate(BotScenarioPayload payload) {
        if (payload == null) {
            throw badRequest("Scenario payload is required");
        }

        BotScenarioPayload normalized = BotScenarioPayload.builder()
                .welcomePrompt(requireNonBlank(payload.getWelcomePrompt(), "welcomePrompt"))
                .unknownPrompt(requireNonBlank(payload.getUnknownPrompt(), "unknownPrompt"))
                .askOrderCodePrompt(requireNonBlank(payload.getAskOrderCodePrompt(), "askOrderCodePrompt"))
                .askOrderPhonePrompt(requireNonBlank(payload.getAskOrderPhonePrompt(), "askOrderPhonePrompt"))
                .orderPhoneInvalidPrompt(requireNonBlank(payload.getOrderPhoneInvalidPrompt(), "orderPhoneInvalidPrompt"))
                .orderLookupContinuePrompt(requireNonBlank(payload.getOrderLookupContinuePrompt(), "orderLookupContinuePrompt"))
                .askHeightPrompt(requireNonBlank(payload.getAskHeightPrompt(), "askHeightPrompt"))
                .invalidHeightPrompt(requireNonBlank(payload.getInvalidHeightPrompt(), "invalidHeightPrompt"))
                .askWeightPrompt(requireNonBlank(payload.getAskWeightPrompt(), "askWeightPrompt"))
                .invalidWeightPrompt(requireNonBlank(payload.getInvalidWeightPrompt(), "invalidWeightPrompt"))
                .sizeAdviceContinuePrompt(requireNonBlank(payload.getSizeAdviceContinuePrompt(), "sizeAdviceContinuePrompt"))
                .productFaqContinuePrompt(requireNonBlank(payload.getProductFaqContinuePrompt(), "productFaqContinuePrompt"))
                .quickActions(normalizeQuickActions(payload.getQuickActions()))
                .build();

        return normalized;
    }

    private List<BotScenarioQuickAction> normalizeQuickActions(List<BotScenarioQuickAction> quickActions) {
        if (quickActions == null || quickActions.isEmpty()) {
            throw badRequest("quickActions is required");
        }

        Map<BotScenarioActionKey, String> labelsByKey = new EnumMap<>(BotScenarioActionKey.class);
        for (BotScenarioQuickAction action : quickActions) {
            if (action == null || action.getKey() == null) {
                throw badRequest("quickActions contains invalid key");
            }
            String label = requireNonBlank(action.getLabel(), "quickActions." + action.getKey() + ".label");
            if (labelsByKey.put(action.getKey(), label) != null) {
                throw badRequest("Duplicate quick action key: " + action.getKey());
            }
        }

        if (labelsByKey.size() != REQUIRED_ACTION_KEYS.size()) {
            throw badRequest("quickActions must include exactly " + REQUIRED_ACTION_KEYS.size() + " keys");
        }

        return REQUIRED_ACTION_KEYS.stream()
                .map(key -> BotScenarioQuickAction.builder()
                        .key(key)
                        .label(labelsByKey.get(key))
                        .build())
                .sorted(Comparator.comparingInt(action -> REQUIRED_ACTION_KEYS.indexOf(action.getKey())))
                .toList();
    }

    private String requireNonBlank(String value, String fieldName) {
        if (!StringUtils.hasText(value)) {
            throw badRequest(fieldName + " is required");
        }
        return value.trim();
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private BotScenarioPayload defaultPayload() {
        List<BotScenarioQuickAction> quickActions = new ArrayList<>();
        quickActions.add(BotScenarioQuickAction.builder().key(BotScenarioActionKey.ORDER_LOOKUP).label("Tra cuu don hang").build());
        quickActions.add(BotScenarioQuickAction.builder().key(BotScenarioActionKey.SIZE_ADVICE).label("Tu van size").build());
        quickActions.add(BotScenarioQuickAction.builder().key(BotScenarioActionKey.PRODUCT_FAQ).label("Hoi dap san pham").build());

        return BotScenarioPayload.builder()
                .welcomePrompt("Xin chao! Minh la tro ly CSKH cua FashMarket. Ban can ho tro gi?")
                .unknownPrompt("Minh chua hieu yeu cau. Ban chon mot chuc nang ben duoi nhe.")
                .askOrderCodePrompt("Ban gui giup minh ma don hang (vi du: DH-260412-000037).")
                .askOrderPhonePrompt("Vui long nhap 4 so cuoi SDT nhan hang de xac minh.")
                .orderPhoneInvalidPrompt("Dinh dang chua dung. Vui long nhap dung 4 chu so.")
                .orderLookupContinuePrompt("Ban can ho tro them gi nua khong?")
                .askHeightPrompt("Ban cho minh chieu cao (cm) truoc nhe.")
                .invalidHeightPrompt("Chieu cao chua hop le. Nhap lai giup minh (cm), vi du: 168.")
                .askWeightPrompt("Cam on ban. Gio nhap can nang (kg), vi du: 58.")
                .invalidWeightPrompt("Can nang chua hop le. Nhap lai giup minh (kg), vi du: 58.")
                .sizeAdviceContinuePrompt("Ban muon tiep tuc voi tac vu nao?")
                .productFaqContinuePrompt("Ban muon hoi them gi?")
                .quickActions(quickActions)
                .build();
    }
}
