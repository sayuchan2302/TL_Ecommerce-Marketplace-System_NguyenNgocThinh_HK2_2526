package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hcmuaf.fit.marketplace.chatbot.scenario.BotScenarioPayload;

@Getter
@Builder
public class BotScenarioSnapshotResponse {
    private BotScenarioPayload draft;
    private BotScenarioPayload published;
    private BotScenarioRevisionMetaResponse draftMeta;
    private BotScenarioRevisionMetaResponse publishedMeta;
}

