"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitManager = void 0;
class RateLimitManager {
    constructor(config) {
        this.config = config;
        this.requestCounts = new Map();
        this.backoffDelays = new Map();
    }
    async executeWithRateLimit(key, operation, fallbacks) {
        if (this.isRateLimited(key)) {
            console.warn(`Rate limit exceeded for ${key}, trying fallback strategies...`);
            return this.executeFallbackStrategies(key, fallbacks);
        }
        try {
            const result = await this.executeWithBackoff(key, operation);
            this.recordSuccessfulRequest(key);
            return result;
        }
        catch (error) {
            if (this.isRateLimitError(error)) {
                console.warn(`Rate limit hit for ${key}, marking as rate limited`);
                this.markAsRateLimited(key);
                return this.executeFallbackStrategies(key, fallbacks);
            }
            throw error;
        }
    }
    async executeWithBackoff(key, operation) {
        const delay = this.backoffDelays.get(key) || 0;
        if (delay > 0) {
            console.log(`Waiting ${delay}ms before retry for ${key}`);
            await this.sleep(delay);
        }
        try {
            const result = await operation();
            this.backoffDelays.delete(key); // Reset on success
            return result;
        }
        catch (error) {
            if (this.isRateLimitError(error)) {
                const newDelay = Math.min((delay || 1000) * this.config.backoffMultiplier, 60000);
                this.backoffDelays.set(key, newDelay);
                throw error;
            }
            throw error;
        }
    }
    async executeFallbackStrategies(key, fallbacks) {
        const strategies = [
            ...(fallbacks || []),
            ...this.config.fallbackStrategies
        ].sort((a, b) => a.priority - b.priority);
        for (const strategy of strategies) {
            try {
                console.log(`Executing fallback strategy: ${strategy.name} for ${key}`);
                const result = await strategy.execute();
                return result;
            }
            catch (error) {
                console.warn(`Fallback strategy ${strategy.name} failed:`, error);
                continue;
            }
        }
        throw new Error(`All fallback strategies failed for ${key}`);
    }
    isRateLimited(key) {
        const counter = this.requestCounts.get(key);
        if (!counter)
            return false;
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        const minuteAgo = now - (60 * 1000);
        // Clean old requests
        counter.requests = counter.requests.filter(time => time > hourAgo);
        const recentRequests = counter.requests.filter(time => time > minuteAgo);
        const hourlyRequests = counter.requests.length;
        return recentRequests.length >= this.config.maxRequestsPerMinute ||
            hourlyRequests >= this.config.maxRequestsPerHour ||
            counter.rateLimitedUntil > now;
    }
    markAsRateLimited(key) {
        const counter = this.getOrCreateCounter(key);
        // Mark as rate limited for 15 minutes
        counter.rateLimitedUntil = Date.now() + (15 * 60 * 1000);
    }
    recordSuccessfulRequest(key) {
        const counter = this.getOrCreateCounter(key);
        counter.requests.push(Date.now());
        counter.rateLimitedUntil = 0;
    }
    getOrCreateCounter(key) {
        if (!this.requestCounts.has(key)) {
            this.requestCounts.set(key, {
                requests: [],
                rateLimitedUntil: 0
            });
        }
        return this.requestCounts.get(key);
    }
    isRateLimitError(error) {
        return error?.status === 403 ||
            error?.response?.status === 403 ||
            error?.message?.toLowerCase().includes('rate limit') ||
            error?.message?.toLowerCase().includes('api rate limit exceeded');
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // Public methods for monitoring
    getRateLimitStatus(key) {
        const counter = this.requestCounts.get(key);
        if (!counter) {
            return {
                isRateLimited: false,
                requestsInLastHour: 0,
                requestsInLastMinute: 0,
                rateLimitedUntil: 0
            };
        }
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        const minuteAgo = now - (60 * 1000);
        const hourlyRequests = counter.requests.filter(time => time > hourAgo).length;
        const recentRequests = counter.requests.filter(time => time > minuteAgo).length;
        return {
            isRateLimited: this.isRateLimited(key),
            requestsInLastHour: hourlyRequests,
            requestsInLastMinute: recentRequests,
            rateLimitedUntil: counter.rateLimitedUntil
        };
    }
    clearRateLimit(key) {
        this.requestCounts.delete(key);
        this.backoffDelays.delete(key);
    }
}
exports.RateLimitManager = RateLimitManager;
//# sourceMappingURL=RateLimitManager.js.map