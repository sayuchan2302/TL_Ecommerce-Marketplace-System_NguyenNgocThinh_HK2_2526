package vn.edu.hcmuaf.fit.marketplace.chatbot.service;

import java.util.Optional;

public interface FaqContentLookupService {
    Optional<String> findAnswerByKeyword(String rawQuestion);
}

