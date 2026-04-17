package vn.edu.hcmuaf.fit.marketplace.chatbot.scenario;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BotScenarioQuickAction {
    private BotScenarioActionKey key;
    private String label;
}

