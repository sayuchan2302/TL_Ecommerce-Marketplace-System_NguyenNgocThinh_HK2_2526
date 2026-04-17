package vn.edu.hcmuaf.fit.marketplace.chatbot.service;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import vn.edu.hcmuaf.fit.marketplace.entity.ContentPage;
import vn.edu.hcmuaf.fit.marketplace.repository.ContentPageRepository;
import vn.edu.hcmuaf.fit.marketplace.service.ContentKeywordUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

class ContentPageFaqLookupServiceTest {

    @Test
    void findAnswerByKeyword_returnsBodyFromFirstMatchedFaq() {
        ContentPageRepository repository = Mockito.mock(ContentPageRepository.class);
        ContentPageFaqLookupService service = new ContentPageFaqLookupService(repository);

        ContentPage faq = new ContentPage();
        faq.setType(ContentPage.ContentType.FAQ);
        faq.setBody("Ban co the doi tra trong 7 ngay.");
        faq.setKeywords(ContentKeywordUtils.encodeKeywords(List.of("doi tra", "tra hang")));

        when(repository.findByTypeOrderByDisplayOrderAscUpdatedAtDesc(ContentPage.ContentType.FAQ))
                .thenReturn(List.of(faq));

        Optional<String> result = service.findAnswerByKeyword("Toi muon doi tra ao nay");

        assertTrue(result.isPresent());
        assertEquals("Ban co the doi tra trong 7 ngay.", result.get());
    }

    @Test
    void findAnswerByKeyword_returnsEmptyWhenNoMatch() {
        ContentPageRepository repository = Mockito.mock(ContentPageRepository.class);
        ContentPageFaqLookupService service = new ContentPageFaqLookupService(repository);

        ContentPage faq = new ContentPage();
        faq.setType(ContentPage.ContentType.FAQ);
        faq.setBody("Thong tin giao hang.");
        faq.setKeywords(ContentKeywordUtils.encodeKeywords(List.of("giao hang")));

        when(repository.findByTypeOrderByDisplayOrderAscUpdatedAtDesc(ContentPage.ContentType.FAQ))
                .thenReturn(List.of(faq));

        Optional<String> result = service.findAnswerByKeyword("Toi can tu van size");

        assertTrue(result.isEmpty());
    }
}

