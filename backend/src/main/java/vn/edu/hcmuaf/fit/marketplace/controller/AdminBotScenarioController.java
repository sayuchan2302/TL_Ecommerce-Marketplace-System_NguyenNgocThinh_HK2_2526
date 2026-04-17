package vn.edu.hcmuaf.fit.marketplace.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hcmuaf.fit.marketplace.chatbot.scenario.BotScenarioPayload;
import vn.edu.hcmuaf.fit.marketplace.chatbot.scenario.BotScenarioService;
import vn.edu.hcmuaf.fit.marketplace.dto.response.BotScenarioSnapshotResponse;

import java.security.Principal;

@RestController
@RequestMapping("/api/admin/bot/scenario")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminBotScenarioController {

    private final BotScenarioService botScenarioService;

    public AdminBotScenarioController(BotScenarioService botScenarioService) {
        this.botScenarioService = botScenarioService;
    }

    @GetMapping
    public ResponseEntity<BotScenarioSnapshotResponse> getSnapshot() {
        return ResponseEntity.ok(botScenarioService.getSnapshot());
    }

    @PutMapping("/draft")
    public ResponseEntity<BotScenarioSnapshotResponse> saveDraft(
            @RequestBody BotScenarioPayload payload,
            Principal principal
    ) {
        botScenarioService.saveDraft(payload, principal != null ? principal.getName() : null);
        return ResponseEntity.ok(botScenarioService.getSnapshot());
    }

    @PostMapping("/publish")
    public ResponseEntity<BotScenarioSnapshotResponse> publishDraft(Principal principal) {
        botScenarioService.publishDraft(principal != null ? principal.getName() : null);
        return ResponseEntity.ok(botScenarioService.getSnapshot());
    }

    @PostMapping("/draft/reset")
    public ResponseEntity<BotScenarioSnapshotResponse> resetDraftFromPublished(Principal principal) {
        botScenarioService.resetDraftFromPublished(principal != null ? principal.getName() : null);
        return ResponseEntity.ok(botScenarioService.getSnapshot());
    }
}

