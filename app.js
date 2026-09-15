import { db, COLLECTIONS } from './firebase-config.js';
import { collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class TypingApp {
    constructor() {
        this.currentPage = 'home';
        this.testActive = false;
        this.currentText = '';
        this.userInput = '';
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.timerInterval = null;
        this.timeRemaining = 120;
        this.totalTime = 120;
        
        this.config = { language: 'en', difficulty: 'medium', type: 'sentence', time: 120 };
        this.stats = this.loadStats();
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.setupTheme();
        this.animateCounters();
        this.updateQuickStats();
    }

    // ... [setupEventListeners, setupNavigation, setupTheme same as before but cleaner] ...
    setupEventListeners() {
        document.querySelectorAll('.config-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const config = e.target.dataset.config;
                const value = e.target.dataset.value;
                this.updateConfig(config, value);
                e.target.parentElement.querySelectorAll('.config-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        document.getElementById('quickStartBtn').addEventListener('click', () => {
            this.updateConfig('language', document.getElementById('quickLanguage').value);
            this.updateConfig('difficulty', document.getElementById('quickDifficulty').value);
            this.navigateTo('practice');
            setTimeout(() => this.startTest(), 300);
        });

        document.getElementById('startTestBtn').addEventListener('click', () => this.startTest());
        document.getElementById('typingInput').addEventListener('input', (e) => this.handleInput(e));
        document.getElementById('typingInput').addEventListener('paste', (e) => {
            e.preventDefault();
            this.showToast('Pasting is not allowed', 'warning');
        });
        document.getElementById('restartBtn').addEventListener('click', () => this.restartTest());
        document.getElementById('stopBtn').addEventListener('click', () => this.endTest());
        document.getElementById('retryBtn').addEventListener('click', () => { this.navigateTo('practice'); setTimeout(() => this.startTest(), 100); });
        document.getElementById('newTestBtn').addEventListener('click', () => this.navigateTo('practice'));
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('clearStatsBtn').addEventListener('click', () => this.clearStats());
    }

    setupNavigation() {
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(e.target.dataset.page);
            });
        });
    }

    setupTheme() {
        if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    }

    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none'; // Ensure clean state for animation
        });
        
        const target = document.getElementById(page + 'Page');
        target.style.display = 'block';
        // Trigger reflow to restart animation
        void target.offsetWidth; 
        target.classList.add('active');
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });
        
        this.currentPage = page;
        if (page === 'stats') this.loadStatistics();
        if (page === 'home') this.animateCounters();
    }

    updateConfig(key, value) {
        this.config[key] = value;
        if (key === 'time') {
            this.timeRemaining = parseInt(value);
            this.totalTime = parseInt(value);
        }
    }

    async startTest() {
        this.testActive = true;
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.userInput = '';
        this.timeRemaining = this.totalTime;
        
        document.querySelector('.config-panel').style.display = 'none';
        document.getElementById('typingArea').style.display = 'block';
        document.getElementById('typingArea').classList.add('animate-fade-in');
        
        await this.loadContent();
        this.startTimer();
        document.getElementById('typingInput').value = '';
        document.getElementById('typingInput').focus();
        this.showToast('Test started! Focus and type.', 'success');
    }

    async loadContent() {
        const loadingState = document.getElementById('loadingState');
        const textContent = document.getElementById('textContent');
        loadingState.style.display = 'flex';
        textContent.innerHTML = '';

        try {
            let content = [];
            const q = query(
                collection(db, COLLECTIONS.TYPING_CONTENT),
                where('language', '==', this.config.language),
                where('difficulty', '==', this.config.difficulty),
                where('active', '==', true),
                limit(50)
            );
            
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                content = snapshot.docs.map(doc => doc.data().text || doc.data().word);
            }

            if (content.length === 0) content = this.getLocalFallback();
            
            this.currentText = this.config.type === 'word' ? content.join(' ') : content.slice(0, 5).join(' ');
            this.displayText();
        } catch (error) {
            console.error('Firestore error:', error);
            this.currentText = this.getLocalFallback().join(' ');
            this.displayText();
        } finally {
            loadingState.style.display = 'none';
        }
    }

    getLocalFallback() {
        const en = ["The quick brown fox jumps over the lazy dog.", "Practice makes perfect in typing.", "Technology is changing the world rapidly."];
        const bn = ["আমি প্রতিদিন টাইপিং অনুশীলন করি।", "প্র্যাকটিস করলেই পারফেক্ট হওয়া যায়।", "প্রযুক্তি আমাদের জীবনকে সহজ করেছে।"];
        return this.config.language === 'en' ? en : bn;
    }

    displayText() {
        const textContent = document.getElementById('textContent');
        textContent.innerHTML = '';
        this.currentText.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.className = 'char';
            span.textContent = char;
            span.dataset.index = index;
            textContent.appendChild(span);
        });
        if (textContent.firstChild) textContent.firstChild.classList.add('current');
    }

    startTimer() {
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            if (this.timeRemaining <= 0) this.endTest();
        }, 1000);
    }

    updateTimerDisplay() {
        const m = Math.floor(this.timeRemaining / 60);
        const s = this.timeRemaining % 60;
        document.getElementById('timer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }

    handleInput(e) {
        if (!this.testActive) return;
        const input = e.target.value;
        this.userInput = input;
        const textChars = document.querySelectorAll('.char');

        this.correctChars = 0;
        this.incorrectChars = 0;

        textChars.forEach((char, index) => {
            char.classList.remove('correct', 'incorrect', 'current');
            if (index < input.length) {
                if (input[index] === char.textContent) {
                    char.classList.add('correct');
                    this.correctChars++;
                } else {
                    char.classList.add('incorrect');
                    this.incorrectChars++;
                }
            }
            if (index === input.length) char.classList.add('current');
        });

        this.updateLiveStats();
        if (input.length >= this.currentText.length) this.endTest();
    }

    updateLiveStats() {
        const timeElapsed = Math.max((this.totalTime - this.timeRemaining) / 60, 0.016); // min 1 sec
        const wordsTyped = this.userInput.trim().split(/\s+/).filter(w => w).length;
        const wpm = Math.round(wordsTyped / timeElapsed);
        const totalChars = this.correctChars + this.incorrectChars;
        const accuracy = totalChars > 0 ? Math.round((this.correctChars / totalChars) * 100) : 100;

        document.getElementById('liveWPM').textContent = wpm;
        document.getElementById('liveAccuracy').textContent = accuracy + '%';
        document.getElementById('liveErrors').textContent = this.incorrectChars;
        
        const progress = (this.userInput.length / this.currentText.length) * 100;
        document.getElementById('progressFill').style.width = Math.min(progress, 100) + '%';
    }

    endTest() {
        this.testActive = false;
        clearInterval(this.timerInterval);
        const results = this.calculateResults();
        this.addToStats(results);
        this.displayResults(results);
        this.navigateTo('results');
    }

    calculateResults() {
        const duration = Math.max((this.totalTime - this.timeRemaining) / 60, 0.016);
        const wordsTyped = this.userInput.trim().split(/\s+/).filter(w => w).length;
        const totalChars = this.correctChars + this.incorrectChars;
        
        return {
            wpm: Math.round(wordsTyped / duration),
            cpm: Math.round(totalChars / duration),
            accuracy: totalChars > 0 ? Math.round((this.correctChars / totalChars) * 100) : 100,
            correctChars: this.correctChars,
            incorrectChars: this.incorrectChars,
            totalChars,
            correctWords: Math.round(this.correctChars / 5),
            incorrectWords: Math.round(this.incorrectChars / 5),
            totalWords: wordsTyped,
            duration: this.totalTime - this.timeRemaining,
            language: this.config.language,
            timestamp: new Date().toISOString()
        };
    }

    displayResults(r) {
        document.getElementById('resultWPM').textContent = r.wpm;
        document.getElementById('resultCPM').textContent = r.cpm;
        document.getElementById('resultAccuracy').textContent = r.accuracy;
        document.getElementById('resultConsistency').textContent = Math.min(100, r.accuracy + 5);
        
        document.getElementById('resultCorrectChars').textContent = r.correctChars;
        document.getElementById('resultIncorrectChars').textContent = r.incorrectChars;
        document.getElementById('resultTotalChars').textContent = r.totalChars;
        
        document.getElementById('resultCorrectWords').textContent = r.correctWords;
        document.getElementById('resultIncorrectWords').textContent = r.incorrectWords;
        document.getElementById('resultTotalWords').textContent = r.totalWords;
        
        const m = Math.floor(r.duration / 60);
        const s = r.duration % 60;
        document.getElementById('resultDuration').textContent = `${m}:${s.toString().padStart(2, '0')}`;

        // Trigger counter animations for results
        setTimeout(() => this.animateCounters(), 100);
    }

    // Modern Counter Animation
    animateCounters() {
        document.querySelectorAll('.counter').forEach(counter => {
            const target = +counter.getAttribute('data-target') || +counter.textContent.replace('%', '');
            const duration = 1500; // ms
            const increment = target / (duration / 16); // 60fps
            
            let current = 0;
            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.textContent = Math.ceil(current) + (counter.id.includes('Accuracy') ? '%' : '');
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target + (counter.id.includes('Accuracy') ? '%' : '');
                }
            };
            updateCounter();
        });
    }

    addToStats(results) {
        this.stats.tests.push(results);
        this.stats.totalTests++;
        if (results.wpm > this.stats.bestWPM) this.stats.bestWPM = results.wpm;
        localStorage.setItem('typingStats', JSON.stringify(this.stats));
        this.updateQuickStats();
    }

    loadStats() {
        return JSON.parse(localStorage.getItem('typingStats')) || { tests: [], bestWPM: 0, totalTests: 0 };
    }

    updateQuickStats() {
        document.getElementById('bestWPM').textContent = this.stats.bestWPM;
        document.getElementById('totalTests').textContent = this.stats.totalTests;
        const avg = this.stats.totalTests > 0 ? Math.round(this.stats.tests.reduce((a, b) => a + b.accuracy, 0) / this.stats.totalTests) : 0;
        document.getElementById('avgAccuracy').textContent = avg + '%';
    }

    loadStatistics() {
        document.getElementById('statBestWPM').textContent = this.stats.bestWPM;
        const avgWPM = this.stats.tests.length > 0 ? Math.round(this.stats.tests.reduce((sum, t) => sum + t.wpm, 0) / this.stats.tests.length) : 0;
        document.getElementById('statAvgWPM').textContent = avgWPM;
        const bestAcc = this.stats.tests.length > 0 ? Math.max(...this.stats.tests.map(t => t.accuracy)) : 0;
        document.getElementById('statBestAccuracy').textContent = bestAcc + '%';
        
        const totalTime = this.stats.tests.reduce((sum, t) => sum + t.duration, 0);
        document.getElementById('statTotalTime').textContent = Math.round(totalTime / 60) + 'm';

        const list = document.getElementById('recentTestsList');
        if (this.stats.tests.length === 0) {
            list.innerHTML = '<p class="empty-state">No tests completed yet. Start typing!</p>';
        } else {
            list.innerHTML = this.stats.tests.slice(-10).reverse().map(t => `
                <div class="test-item">
                    <div class="test-info">
                        <div class="test-wpm">${t.wpm} WPM</div>
                        <div class="test-meta">${t.language === 'en' ? 'English' : 'বাংলা'} • ${t.difficulty} • ${new Date(t.timestamp).toLocaleDateString()}</div.
                    </div>
                    <div class="test-accuracy">${t.accuracy}%</div>
                </div>
            `).join('');
        }
        setTimeout(() => this.animateCounters(), 100);
    }

    restartTest() {
        document.getElementById('typingInput').value = '';
        this.userInput = '';
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.timeRemaining = this.totalTime;
        this.displayText();
        this.updateTimerDisplay();
        document.getElementById('liveWPM').textContent = '0';
        document.getElementById('liveAccuracy').textContent = '100%';
        document.getElementById('liveErrors').textContent = '0';
        document.getElementById('progressFill').style.width = '0%';
        clearInterval(this.timerInterval);
        this.startTimer();
        document.getElementById('typingInput').focus();
    }

    clearStats() {
        if (confirm('Are you sure you want to clear all statistics?')) {
            this.stats = { tests: [], bestWPM: 0, totalTests: 0 };
            localStorage.setItem('typingStats', JSON.stringify(this.stats));
            this.updateQuickStats();
            this.showToast('Statistics cleared', 'success');
            this.loadStatistics();
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</span> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TypingApp();
});
