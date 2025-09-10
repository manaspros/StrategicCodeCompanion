export interface RateLimitConfig {
    maxRequestsPerHour: number;
    maxRequestsPerMinute: number;
    backoffMultiplier: number;
    maxRetries: number;
    fallbackStrategies: FallbackStrategy[];
}

export interface FallbackStrategy {
    name: string;
    execute: () => Promise<any>;
    priority: number;
}

export class RateLimitManager {
    private requestCounts: Map<string, RequestCounter> = new Map();
    private backoffDelays: Map<string, number> = new Map();

    constructor(private config: RateLimitConfig) {}

    async executeWithRateLimit<T>(
        key: string,
        operation: () => Promise<T>,
        fallbacks?: FallbackStrategy[]
    ): Promise<T> {
        if (this.isRateLimited(key)) {
            console.warn(`Rate limit exceeded for ${key}, trying fallback strategies...`);
            return this.executeFallbackStrategies(key, fallbacks);
        }

        try {
            const result = await this.executeWithBackoff(key, operation);
            this.recordSuccessfulRequest(key);
            return result;
        } catch (error: any) {
            if (this.isRateLimitError(error)) {
                console.warn(`Rate limit hit for ${key}, marking as rate limited`);
                this.markAsRateLimited(key);
                return this.executeFallbackStrategies(key, fallbacks);
            }
            throw error;
        }
    }

    private async executeWithBackoff<T>(
        key: string, 
        operation: () => Promise<T>
    ): Promise<T> {
        const delay = this.backoffDelays.get(key) || 0;
        
        if (delay > 0) {
            console.log(`Waiting ${delay}ms before retry for ${key}`);
            await this.sleep(delay);
        }

        try {
            const result = await operation();
            this.backoffDelays.delete(key); // Reset on success
            return result;
        } catch (error: any) {
            if (this.isRateLimitError(error)) {
                const newDelay = Math.min((delay || 1000) * this.config.backoffMultiplier, 60000);
                this.backoffDelays.set(key, newDelay);
                throw error;
            }
            throw error;
        }
    }

    private async executeFallbackStrategies<T>(
        key: string, 
        fallbacks?: FallbackStrategy[]
    ): Promise<T> {
        const strategies = [
            ...(fallbacks || []),
            ...this.config.fallbackStrategies
        ].sort((a, b) => a.priority - b.priority);

        for (const strategy of strategies) {
            try {
                console.log(`Executing fallback strategy: ${strategy.name} for ${key}`);
                const result = await strategy.execute();
                return result;
            } catch (error) {
                console.warn(`Fallback strategy ${strategy.name} failed:`, error);
                continue;
            }
        }

        throw new Error(`All fallback strategies failed for ${key}`);
    }

    private isRateLimited(key: string): boolean {
        const counter = this.requestCounts.get(key);
        if (!counter) return false;

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

    private markAsRateLimited(key: string): void {
        const counter = this.getOrCreateCounter(key);
        // Mark as rate limited for 15 minutes
        counter.rateLimitedUntil = Date.now() + (15 * 60 * 1000);
    }

    private recordSuccessfulRequest(key: string): void {
        const counter = this.getOrCreateCounter(key);
        counter.requests.push(Date.now());
        counter.rateLimitedUntil = 0;
    }

    private getOrCreateCounter(key: string): RequestCounter {
        if (!this.requestCounts.has(key)) {
            this.requestCounts.set(key, {
                requests: [],
                rateLimitedUntil: 0
            });
        }
        return this.requestCounts.get(key)!;
    }

    private isRateLimitError(error: any): boolean {
        return error?.status === 403 || 
               error?.response?.status === 403 ||
               error?.message?.toLowerCase().includes('rate limit') ||
               error?.message?.toLowerCase().includes('api rate limit exceeded');
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public methods for monitoring
    getRateLimitStatus(key: string): RateLimitStatus {
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

    clearRateLimit(key: string): void {
        this.requestCounts.delete(key);
        this.backoffDelays.delete(key);
    }
}

interface RequestCounter {
    requests: number[];
    rateLimitedUntil: number;
}

interface RateLimitStatus {
    isRateLimited: boolean;
    requestsInLastHour: number;
    requestsInLastMinute: number;
    rateLimitedUntil: number;
}