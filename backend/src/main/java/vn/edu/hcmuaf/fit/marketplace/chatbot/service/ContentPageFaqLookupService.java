package vn.edu.hcmuaf.fit.marketplace.chatbot.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import vn.edu.hcmuaf.fit.marketplace.entity.ContentPage;
import vn.edu.hcmuaf.fit.marketplace.repository.ContentPageRepository;
import vn.edu.hcmuaf.fit.marketplace.service.ContentKeywordUtils;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class ContentPageFaqLookupService implements FaqContentLookupService {

    private final ContentPageRepository contentPageRepository;

    public ContentPageFaqLookupService(ContentPageRepository contentPageRepository) {
        this.contentPageRepository = contentPageRepository;
    }

    @Override
    public Optional<String> findAnswerByKeyword(String rawQuestion) {
        String normalizedQuestion = ContentKeywordUtils.normalizeForSearch(rawQuestion);
        if (!StringUtils.hasText(normalizedQuestion)) {
            return Optional.empty();
        }

        List<ContentPage> faqPages = contentPageRepository.findByTypeOrderByDisplayOrderAscUpdatedAtDesc(ContentPage.ContentType.FAQ);
        for (ContentPage faq : faqPages) {
            List<String> keywords = ContentKeywordUtils.decodeKeywords(faq.getKeywords());
            for (String keyword : keywords) {
                if (!keyword.isBlank() && normalizedQuestion.contains(keyword)) {
                    String answer = faq.getBody();
                    if (StringUtils.hasText(answer)) {
                        return Optional.of(answer.trim());
                    }
                }
            }
        }

        return Optional.empty();
    }
}

