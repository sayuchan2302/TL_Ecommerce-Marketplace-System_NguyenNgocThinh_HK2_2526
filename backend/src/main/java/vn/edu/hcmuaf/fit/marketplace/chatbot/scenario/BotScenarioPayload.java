package vn.edu.hcmuaf.fit.marketplace.chatbot.scenario;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BotScenarioPayload {
    private String welcomePrompt;
    private String unknownPrompt;
    private String askOrderCodePrompt;
    private String askOrderPhonePrompt;
    private String orderPhoneInvalidPrompt;
    private String orderLookupContinuePrompt;
    private String askHeightPrompt;
    private String invalidHeightPrompt;
    private String askWeightPrompt;
    private String invalidWeightPrompt;
    private String sizeAdviceContinuePrompt;
    private String productFaqContinuePrompt;
    private List<BotScenarioQuickAction> quickActions;
}

