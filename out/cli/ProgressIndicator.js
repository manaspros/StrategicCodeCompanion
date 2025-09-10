"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressIndicator = void 0;
class ProgressIndicator {
    constructor() {
        this.steps = [];
        this.currentStep = 0;
        this.startTime = Date.now();
    }
    start(steps) {
        this.steps = steps;
        this.currentStep = 0;
        this.startTime = Date.now();
        console.log('🔄 Starting analysis pipeline...\n');
        this.displayProgress();
    }
    updateStep(stepIndex, message) {
        this.currentStep = stepIndex;
        if (message) {
            console.log(`   ${message}`);
        }
        this.displayProgress();
    }
    nextStep(message) {
        this.currentStep++;
        this.updateStep(this.currentStep, message);
    }
    complete() {
        const elapsed = this.formatElapsedTime();
        console.log('\n✅ Analysis pipeline completed successfully!');
        console.log(`⏱️  Total time: ${elapsed}`);
        console.log('');
    }
    error(errorMessage) {
        const elapsed = this.formatElapsedTime();
        console.log('\n❌ Analysis pipeline failed!');
        console.log(`💥 Error: ${errorMessage}`);
        console.log(`⏱️  Time elapsed: ${elapsed}`);
        console.log('');
    }
    displayProgress() {
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
    createProgressBar(percentage, length = 30) {
        const filled = Math.round(length * percentage / 100);
        const empty = length - filled;
        const fillChar = '█';
        const emptyChar = '░';
        return `[${fillChar.repeat(filled)}${emptyChar.repeat(empty)}]`;
    }
    formatElapsedTime() {
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
    static spinner(message = 'Processing...') {
        const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;
        return setInterval(() => {
            process.stdout.write(`\r${spinnerChars[i]} ${message}`);
            i = (i + 1) % spinnerChars.length;
        }, 100);
    }
    static stopSpinner(spinner, finalMessage) {
        clearInterval(spinner);
        if (finalMessage) {
            process.stdout.write(`\r${finalMessage}\n`);
        }
        else {
            process.stdout.write('\r');
        }
    }
    static simpleProgress(current, total, prefix = 'Progress') {
        const percentage = Math.round((current / total) * 100);
        const progressBar = new ProgressIndicator().createProgressBar(percentage, 20);
        process.stdout.write(`\r${prefix}: ${progressBar} ${percentage}% (${current}/${total})`);
        if (current >= total) {
            console.log(); // New line when complete
        }
    }
}
exports.ProgressIndicator = ProgressIndicator;
//# sourceMappingURL=ProgressIndicator.js.map