package com.sportscamp.attendance.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * Keeps the Render free-tier instance alive by pinging its own health endpoint
 * every 10 minutes. Render shuts down instances after ~15 min of inactivity,
 * so this prevents cold-starts during active use.
 *
 * Activate by setting RENDER_EXTERNAL_URL in the Render environment variables
 * (Render sets this automatically for every web service).
 * Disabled locally because RENDER_EXTERNAL_URL will not be set.
 */
@Component
@EnableScheduling
@ConditionalOnProperty(name = "app.keep-alive.enabled", havingValue = "true")
public class KeepAliveScheduler {

    private static final Logger log = LoggerFactory.getLogger(KeepAliveScheduler.class);

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.keep-alive.url}")
    private String pingUrl;

    /** Fires every 10 minutes (600 000 ms). */
    @Scheduled(fixedRateString = "600000", initialDelayString = "60000")
    public void ping() {
        try {
            restTemplate.getForObject(pingUrl, String.class);
            log.info("[KeepAlive] Pinged {} — instance is warm.", pingUrl);
        } catch (Exception ex) {
            log.warn("[KeepAlive] Ping to {} failed: {}", pingUrl, ex.getMessage());
        }
    }
}
