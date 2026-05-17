package vn.edu.hcmuaf.fit.marketplace.service;

public interface GoogleIdTokenVerifier {
    GoogleUserInfo verify(String credential);
}
