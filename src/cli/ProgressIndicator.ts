export class ProgressIndicator {
    private steps: string[] = [];
    private currentStep: number = 0;
    private startTime: number = Date.now();

    start(steps: string[]): void {
        this.steps = steps;
        this.currentStep = 0;
        this.startTime = Date.now();
        
        console.log('🔄 Starting analysis pipeline...\n');
        this.displayProgress();
    }

    updateStep(stepIndex: number, message?: string): void {
        this.currentStep = stepIndex;
        
        if (message) {
            console.log(`   ${message}`);
        }
        
        this.displayProgress();
    }

    nextStep(message?: string): void {
        this.currentStep++;
        this.updateStep(this.currentStep, message);
    }

    complete(): void {
        const elapsed = this.formatElapsedTime();
        console.log('\n✅ Analysis pipeline completed successfully!');
        console.log(`⏱️  Total time: ${elapsed}`);
        console.log('');
    }

    error(errorMessage: string): void {
        const elapsed = this.formatElapsedTime();
        console.log('\n❌ Analysis pipeline failed!');
        console.log(`💥 Error: ${errorMessage}`);
        console.log(`⏱️  Time elapsed: ${elapsed}`);
        console.log('');
    }

    private displayProgress(): void {
        const totalSteps = this.steps.length;
        const progress = Math.round((this.currentStep / totalSteps) * 100);
        const progressBar = this.createProgressBar(progress);
        const elapsed = this.formatElapsedTime();
        
        // Clear previous line and display new progress
        process.stdout.write(`\r${progressBar} ${progress}% | Step ${this.currentStep + 1}/${totalSteps}: ${this.steps[this.currentStep]} | ${elapsed}`);
        
        if (this.currentStep < totalSteps - 1) {
            console.log(); // New line for next step messages
        }
    }

    private createProgressBar(percentage: number, length: number = 30): string {
        const filled = Math.round(length * percentage / 100);
        const empty = length - filled;
        const fillChar = '█';
        const emptyChar = '░';
        
        return `[${fillChar.repeat(filled)}${emptyChar.repeat(empty)}]`;
    }

    private formatElapsedTime(): string {
        const elapsed = Date.now() - this.startTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    }

    // Static utility methods for one-off progress indication
    static spinner(message: string = 'Processing...'): NodeJS.Timer {
        const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;
        
        return setInterval(() => {
            process.stdout.write(`\r${spinnerChars[i]} ${message}`);
            i = (i + 1) % spinnerChars.length;
        }, 100);
    }

    static stopSpinner(spinner: NodeJS.Timeout, finalMessage?: string): void {
        clearInterval(spinner);
        if (finalMessage) {
            process.stdout.write(`\r${finalMessage}\n`);
        } else {
            process.stdout.write('\r');
        }
    }

    static simpleProgress(current: number, total: number, prefix: string = 'Progress'): void {
        const percentage = Math.round((current / total) * 100);
        const progressBar = new ProgressIndicator().createProgressBar(percentage, 20);
        process.stdout.write(`\r${prefix}: ${progressBar} ${percentage}% (${current}/${total})`);
        
        if (current >= total) {
            console.log(); // New line when complete
        }
    }
}