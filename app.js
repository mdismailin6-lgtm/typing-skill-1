import { db, COLLECTIONS } from './firebase-config.js';
import { collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class TypingApp {
    constructor() {
        this.testActive = false;
        this.currentTime = 30;
        this.timeLeft = 30;
        this.timer = null;
        this.words = [];
        this.currentWordIndex = 0;
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.wpmHistory = [];
        this.config = { language: 'en', time: 30, type: 'word' };
        this.stats = this.loadStats();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateHomeStats();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.navigateTo(e.target.dataset.page);
            });
        });

        // Config buttons
        document.querySelectorAll('.config-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const group = e.target.closest('.config-group');
                group.querySelectorAll('.config-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const config = e.target.dataset.config;
                const value = e.target.dataset.value;
                this.config[config] = config === 'time' ? parseInt(value) : value;
                
                if (config === 'time') {
                    this.currentTime = parseInt(value);
                    this.timeLeft = parseInt(value);
                }
            });
        });

        // Quick start
        document.getElementById('quickStart').addEventListener('click', () => {
            this.navigateTo('practice');
            setTimeout(() => this.startTest(), 300);
        });

        // Focus prompt
        document.getElementById('focusPrompt').addEventListener('click', () => this.startTest());

        // Typing input
        const input = document.getElementById('typingInput');
        input.addEventListener('input', (e) => this.handleInput(e));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                this.endTest();
            }
            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                this.restartTest();
            }
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
        });

        // Language toggle
        document.getElementById('langToggle').addEventListener('click', () => {
            this.config.language = this.config.language === 'en' ? 'bn' : 'en';
            this.showToast(`Language: ${this.config.language === 'en' ? 'English' : 'বাংলা'}`, 'success');
        });
    }

    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
            setTimeout(() => {
                if (!p.classList.contains('active')) p.style.display = 'none';
            }, 300);
        });
        
        const target = document.getElementById(page + 'Page');
        target.style.display = 'block';
        setTimeout(() => target.classList.add('active'), 10);
        
        if (page === 'stats') this.loadStatistics();
    }

    async startTest() {
        document.getElementById('focusPrompt').style.display = 'none';
        document.getElementById('typingWrapper').style.display = 'block';
        
        this.testActive = true;
        this.currentWordIndex = 0;
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.wpmHistory = [];
        this.timeLeft = this.currentTime;
        
        await this.loadWords();
        this.displayWords();
        document.getElementById('typingInput').value = '';
        document.getElementById('typingInput').focus();
        
        this.startTimer();
        this.showToast('Test started!', 'success');
    }

    async loadWords() {
        try {
            const q = query(
                collection(db, this.config.type === 'word' ? COLLECTIONS.TYPING_WORDS : COLLECTIONS.TYPING_SENTENCES),
                where('language', '==', this.config.language),
                where('active', '==', true),
                limit(100)
            );
            
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                this.words = this.getFallbackWords();
            } else {
                this.words = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return data.text || data.word;
                });
            }
        } catch (error) {
            console.error('Error loading words:', error);
            this.words = this.getFallbackWords();
        }
    }

    getFallbackWords() {
        const en = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at'];
        const bn = ['আমি', 'তুমি', 'সে', 'আমরা', 'তোমরা', 'তারা', 'এই', 'ওই', 'যে', 'কি', 'না', 'হয়', 'ছিল', 'হবে'];
        return this.config.language === 'en' ? en : bn;
    }

    displayWords() {
        const container = document.getElementById('wordsDisplay');
        container.innerHTML = '';
        
        const wordsToShow = this.words.slice(0, 50);
        wordsToShow.forEach((word, index) => {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = word;
            span.dataset.index = index;
            container.appendChild(span);
        });
        
        if (container.firstChild) {
            container.firstChild.classList.add('current');
        }
    }

    startTimer() {
        this.updateLiveStats();
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateLiveStats();
            
            if (this.timeLeft <= 0) {
                this.endTest();
            }
        }, 1000);
    }

    handleInput(e) {
        if (!this.testActive) return;
        
        const input = e.target.value;
        const words = document.querySelectorAll('.word');
        
        if (input.endsWith(' ')) {
            const currentWord = words[this.currentWordIndex];
            const typedWord = input.trim();
            
            if (typedWord === this.words[this.currentWordIndex]) {
                currentWord.classList.add('correct');
                this.correctChars += typedWord.length + 1;
            } else {
                currentWord.classList.add('incorrect');
                this.incorrectChars += typedWord.length;
            }
            
            currentWord.classList.remove('current');
            this.currentWordIndex++;
            
            if (this.currentWordIndex < words.length) {
                words[this.currentWordIndex].classList.add('current');
                words[this.currentWordIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            e.target.value = '';
            
            if (this.currentWordIndex >= this.words.length) {
                this.endTest();
            }
        }
        
        this.updateLiveStats();
    }

    updateLiveStats() {
        const timeElapsed = (this.currentTime - this.timeLeft) / 60;
        const wordsTyped = this.currentWordIndex;
        const wpm = timeElapsed > 0 ? Math.round(wordsTyped / timeElapsed) : 0;
        const totalChars = this.correctChars + this.incorrectChars;
        const acc = totalChars > 0 ? Math.round((this.correctChars / totalChars) * 100) : 100;
        
        document.getElementById('liveTimer').textContent = this.timeLeft;
        document.getElementById('liveWPM').textContent = wpm;
        document.getElementById('liveAcc').textContent = acc + '%';
        
        if (timeElapsed > 0) {
            this.wpmHistory.push(wpm);
        }
    }

    endTest() {
        this.testActive = false;
        clearInterval(this.timer);
        
        const results = this.calculateResults();
        this.showResults(results);
        this.addToStats(results);
        this.navigateTo('results');
    }

    calculateResults() {
        const timeElapsed = (this.currentTime - this.timeLeft) / 60 || 0.016;
        const wordsTyped = this.currentWordIndex;
        const totalChars = this.correctChars + this.incorrectChars;
        
        return {
            wpm: Math.round(wordsTyped / timeElapsed),
            raw: Math.round((this.correctChars + this.incorrectChars) / 5 / timeElapsed),
            acc: totalChars > 0 ? Math.round((this.correctChars / totalChars) * 100) : 100,
            correctChars: this.correctChars,
            incorrectChars: this.incorrectChars,
            totalChars: totalChars,
            consistency: this.calculateConsistency(),
            time: this.currentTime - this.timeLeft,
            language: this.config.language,
            timestamp: new Date().toISOString()
        };
    }

    calculateConsistency() {
        if (this.wpmHistory.length < 2) return 100;
        const avg = this.wpmHistory.reduce((a, b) => a + b, 0) / this.wpmHistory.length;
        const variance = this.wpmHistory.reduce((sum, wpm) => sum + Math.pow(wpm - avg, 2), 0) / this.wpmHistory.length;
        const stdDev = Math.sqrt(variance);
        return Math.max(0, Math.min(100, Math.round(100 - (stdDev / avg) * 100)));
    }

    showResults(results) {
        document.getElementById('resultWPM').textContent = results.wpm;
        document.getElementById('resultAcc').textContent = results.acc + '%';
        document.getElementById('resultType').textContent = `time ${this.currentTime}`;
        document.getElementById('resultRaw').textContent = results.raw;
        document.getElementById('resultChars').textContent = 
            `${results.correctChars}/${results.incorrectChars}/0/0`;
        document.getElementById('resultCons').textContent = results.consistency + '%';
        
        const mins = Math.floor(results.time / 60);
        const secs = results.time % 60;
        document.getElementById('resultTime').textContent = 
            `${mins}:${secs.toString().padStart(2, '0')}`;
        
        this.drawChart(results);
    }

    drawChart(results) {
        const ctx = document.getElementById('wpmChart').getContext('2d');
        
        if (window.wpmChart) {
            window.wpmChart.destroy();
        }
        
        const isDark = !document.body.classList.contains('light-mode');
        
        window.wpmChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.wpmHistory.map((_, i) => i + 1),
                datasets: [{
                    label: 'WPM',
                    data: this.wpmHistory,
                    borderColor: '#e2b714',
                    backgroundColor: 'rgba(226, 183, 20, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: isDark ? '#323437' : '#e0e0e0' },
                        ticks: { color: isDark ? '#646669' : '#777' }
                    },
                    y: {
                        grid: { color: isDark ? '#323437' : '#e0e0e0' },
                        ticks: { color: isDark ? '#646669' : '#777' }
                    }
                }
            }
        });
    }

    addToStats(results) {
        this.stats.tests.push(results);
        if (results.wpm > this.stats.bestWPM) this.stats.bestWPM = results.wpm;
        localStorage.setItem('typingStats', JSON.stringify(this.stats));
        this.updateHomeStats();
    }

    loadStats() {
        return JSON.parse(localStorage.getItem('typingStats')) || { 
            tests: [], 
            bestWPM: 0 
        };
    }

    updateHomeStats() {
        document.getElementById('homeBestWPM').textContent = this.stats.bestWPM;
        document.getElementById('homeTotalTests').textContent = this.stats.tests.length;
        
        if (this.stats.tests.length > 0) {
            const avg = this.stats.tests.reduce((sum, t) => sum + t.acc, 0) / this.stats.tests.length;
            document.getElementById('homeAvgAcc').textContent = Math.round(avg) + '%';
        }
    }

    loadStatistics() {
        const tests = this.stats.tests;
        
        document.getElementById('statBestWPM').textContent = this.stats.bestWPM;
        
        if (tests.length > 0) {
            const avgWPM = Math.round(tests.reduce((sum, t) => sum + t.wpm, 0) / tests.length);
            const bestAcc = Math.max(...tests.map(t => t.acc));
            const totalTime = Math.round(tests.reduce((sum, t) => sum + t.time, 0) / 60);
            
            document.getElementById('statAvgWPM').textContent = avgWPM;
            document.getElementById('statBestAcc').textContent = bestAcc + '%';
            document.getElementById('statTotalTime').textContent = totalTime + 'm';
        }
        
        const container = document.getElementById('recentTests');
        if (tests.length === 0) {
            container.innerHTML = '<p style="color: var(--text-sub); text-align: center;">No tests yet</p>';
        } else {
            container.innerHTML = '<h3>Recent Tests</h3>' + 
                tests.slice(-10).reverse().map(t => `
                    <div class="test-item">
                        <div class="test-info">
                            <div class="test-wpm">${t.wpm} WPM</div>
                            <div class="test-meta">${t.language === 'en' ? 'English' : 'বাংলা'} • ${new Date(t.timestamp).toLocaleDateString()}</div>
                        </div>
                        <div class="test-acc">${t.acc}%</div>
                    </div>
                `).join('');
        }
    }

    restartTest() {
        this.navigateTo('practice');
        setTimeout(() => this.startTest(), 300);
    }

    newTest() {
        this.navigateTo('practice');
        document.getElementById('typingWrapper').style.display = 'none';
        document.getElementById('focusPrompt').style.display = 'flex';
    }

    saveResult() {
        this.showToast('Result saved!', 'success');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize app
const app = new TypingApp();
window.app = app;
