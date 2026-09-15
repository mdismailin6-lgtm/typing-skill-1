class TypingApp {
    constructor() {
        this.currentPage = 'home';
        this.testActive = false;
        this.testStartTime = null;
        this.testEndTime = null;
        this.currentText = '';
        this.userInput = '';
        this.errors = 0;
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.timerInterval = null;
        this.timeRemaining = 120;
        this.totalTime = 120;
        
        this.config = {
            language: 'en',
            difficulty: 'medium',
            type: 'sentence',
            time: 120
        };
        
        this.stats = this.loadStats();
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.setupTheme();
        this.updateQuickStats();
    }
    
    setupEventListeners() {
        // Config buttons
        document.querySelectorAll('.config-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const config = e.target.dataset.config;
                const value = e.target.dataset.value;
                this.updateConfig(config, value);
                
                // Update active state
                e.target.parentElement.querySelectorAll('.config-btn').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
            });
        });
        
        // Start test button
        document.getElementById('startTestBtn').addEventListener('click', () => {
            this.startTest();
        });
        
        // Quick start button
        document.getElementById('quickStartBtn').addEventListener('click', () => {
            const lang = document.getElementById('quickLanguage').value;
            const diff = document.getElementById('quickDifficulty').value;
            this.updateConfig('language', lang);
            this.updateConfig('difficulty', diff);
            this.navigateTo('practice');
            this.startTest();
        });
        
        // Typing input
        document.getElementById('typingInput').addEventListener('input', (e) => {
            this.handleInput(e);
        });
        
        document.getElementById('typingInput').addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.restartTest();
            }
        });
        
        // Test controls
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartTest();
        });
        
        document.getElementById('stopBtn').addEventListener('click', () => {
            this.endTest();
        });
        
        // Results buttons
        document.getElementById('retryBtn').addEventListener('click', () => {
            this.retryTest();
        });
        
        document.getElementById('newTestBtn').addEventListener('click', () => {
            this.navigateTo('practice');
        });
        
        document.getElementById('saveResultBtn').addEventListener('click', () => {
            this.saveResult();
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Language toggle
        document.getElementById('languageToggle').addEventListener('click', () => {
            this.toggleLanguage();
        });
        
        // Stats buttons
        document.getElementById('clearStatsBtn').addEventListener('click', () => {
            this.clearStats();
        });
        
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
        });
        
        document.getElementById('importDataBtn').addEventListener('click', () => {
            this.importData();
        });
        
        // Prevent paste in typing input
        document.getElementById('typingInput').addEventListener('paste', (e) => {
            e.preventDefault();
            this.showToast('Pasting is not allowed', 'warning');
        });
    }
    
    setupNavigation() {
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                this.navigateTo(page);
            });
        });
    }
    
    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    }
    
    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
    }
    
    toggleLanguage() {
        const btn = document.getElementById('languageToggle');
        const current = btn.textContent;
        btn.textContent = current === 'EN' ? 'BN' : 'EN';
        // Update config
        this.updateConfig('language', current === 'EN' ? 'bn' : 'en');
    }
    
    navigateTo(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // Show target page
        document.getElementById(page + 'Page').classList.add('active');
        
        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });
        
        this.currentPage = page;
        
        // Load page-specific data
        if (page === 'stats') {
            this.loadStatistics();
        }
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
        this.errors = 0;
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.userInput = '';
        this.testStartTime = Date.now();
        this.timeRemaining = this.totalTime;
        
        // Show typing area
        document.querySelector('.config-panel').style.display = 'none';
        document.getElementById('typingArea').style.display = 'block';
        
        // Load content
        await this.loadContent();
        
        // Start timer
        this.startTimer();
        
        // Focus input
        document.getElementById('typingInput').focus();
        
        this.showToast('Test started! Good luck!', 'success');
    }
    
    async loadContent() {
        const loadingState = document.getElementById('loadingState');
        const textContent = document.getElementById('textContent');
        
        loadingState.style.display = 'flex';
        textContent.innerHTML = '';
        
        try {
            let content;
            
            // Try to load from Firestore first
            if (window.db) {
                content = await this.loadFromFirestore();
            }
            
            // Fallback to local content if Firestore fails or is empty
            if (!content || content.length === 0) {
                content = this.getLocalContent();
            }
            
            // Combine and shuffle
            this.currentText = this.combineContent(content);
            
            // Display text
            this.displayText();
            
        } catch (error) {
            console.error('Error loading content:', error);
            this.showToast('Error loading content. Using fallback.', 'error');
            this.currentText = this.getLocalContent();
            this.displayText();
        } finally {
            loadingState.style.display = 'none';
        }
    }
    
    async loadFromFirestore() {
        try {
            const collection = this.getCollectionForType();
            let query = db.collection(collection)
                .where('language', '==', this.config.language)
                .where('difficulty', '==', this.config.difficulty)
                .where('active', '==', true)
                .limit(50);
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                // Try without difficulty filter
                query = db.collection(collection)
                    .where('language', '==', this.config.language)
                    .where('active', '==', true)
                    .limit(50);
                const fallbackSnapshot = await query.get();
                
                return fallbackSnapshot.docs.map(doc => doc.data());
            }
            
            return snapshot.docs.map(doc => doc.data());
            
        } catch (error) {
            console.error('Firestore error:', error);
            return [];
        }
    }
    
    getCollectionForType() {
        switch(this.config.type) {
            case 'word': return COLLECTIONS.TYPING_WORDS;
            case 'sentence': return COLLECTIONS.TYPING_SENTENCES;
            case 'paragraph': return COLLECTIONS.TYPING_PARAGRAPHS;
            default: return COLLECTIONS.TYPING_CONTENT;
        }
    }
    
    getLocalContent() {
        const englishContent = {
            word: ['computer', 'keyboard', 'monitor', 'software', 'hardware', 'internet', 'network', 'database', 'program', 'algorithm'],
            sentence: [
                'The quick brown fox jumps over the lazy dog.',
                'Practice makes perfect in typing.',
                'Technology is changing the world rapidly.',
                'Learning to type fast takes time and patience.',
                'Computers are essential tools in modern life.'
            ],
            paragraph: [
                'Typing is an essential skill in the modern world. Whether you are a student, professional, or just someone who uses a computer regularly, being able to type quickly and accurately can save you a lot of time. Regular practice is the key to improvement. Start with simple words and gradually move to more complex sentences.'
            ]
        };
        
        const banglaContent = {
            word: ['কম্পিউটার', 'কীবোর্ড', 'মনিটর', 'সফটওয়্যার', 'হার্ডওয়্যার', 'ইন্টারনেট', 'নেটওয়ার্ক', 'ডেটাবেস'],
            sentence: [
                'আমি প্রতিদিন টাইপিং অনুশীলন করি।',
                'প্র্যাকটিস করলেই পারফেক্ট হওয়া যায়।',
                'প্রযুক্তি আমাদের জীবনকে সহজ করেছে।',
                'দ্রুত টাইপিং শেখা সময় ও ধৈর্যের ব্যাপার।',
                'কম্পিউটার আধুনিক জীবনের অপরিহার্য অংশ।'
            ],
            paragraph: [
                'টাইপিং আধুনিক বিশ্বের একটি অত্যন্ত গুরুত্বপূর্ণ দক্ষতা। আপনি ছাত্র হোন, পেশাজীবী হোন বা নিয়মিত কম্পিউটার ব্যবহারকারী হোন, দ্রুত এবং নির্ভুলভাবে টাইপ করতে পারলে অনেক সময় বাঁচে। নিয়মিত অনুশীলনই উন্নতির চাবিকাঠি। সহজ শব্দ দিয়ে শুরু করুন এবং ধীরে ধীরে জটিল বাক্যের দিকে এগিয়ে যান।'
            ]
        };
        
        const content = this.config.language === 'en' ? englishContent : banglaContent;
        return content[this.config.type] || content.sentence;
    }
    
    combineContent(content) {
        if (this.config.type === 'word') {
            return content.join(' ');
        } else if (this.config.type === 'sentence') {
            return content.join(' ');
        } else {
            return content.join(' ');
        }
    }
    
    displayText() {
        const textContent = document.getElementById('textContent');
        textContent.innerHTML = '';
        
        const chars = this.currentText.split('');
        chars.forEach((char, index) => {
            const span = document.createElement('span');
            span.className = 'char';
            span.textContent = char;
            span.dataset.index = index;
            textContent.appendChild(span);
        });
        
        // Highlight first character
        if (textContent.firstChild) {
            textContent.firstChild.classList.add('current');
        }
    }
    
    startTimer() {
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.endTest();
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        document.getElementById('timer').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    handleInput(e) {
        if (!this.testActive) return;
        
        const input = e.target.value;
        const inputLength = input.length;
        const textChars = document.querySelectorAll('.char');
        
        // Calculate stats
        this.userInput = input;
        
        // Update character highlighting
        textChars.forEach((char, index) => {
            char.classList.remove('correct', 'incorrect', 'current');
            
            if (index < inputLength) {
                if (input[index] === char.textContent) {
                    char.classList.add('correct');
                    this.correctChars++;
                } else {
                    char.classList.add('incorrect');
                    this.incorrectChars++;
                }
            }
            
            if (index === inputLength) {
                char.classList.add('current');
            }
        });
        
        // Update live stats
        this.updateLiveStats();
        
        // Check if completed
        if (inputLength >= this.currentText.length) {
            this.endTest();
        }
    }
    
    updateLiveStats() {
        const timeElapsed = (this.totalTime - this.timeRemaining) / 60; // in minutes
        const wordsTyped = this.userInput.trim().split(/\s+/).length;
        
        const wpm = timeElapsed > 0 ? Math.round(wordsTyped / timeElapsed) : 0;
        const totalChars = this.correctChars + this.incorrectChars;
        const accuracy = totalChars > 0 ? 
            Math.round((this.correctChars / totalChars) * 100) : 100;
        
        document.getElementById('liveWPM').textContent = wpm;
        document.getElementById('liveAccuracy').textContent = accuracy + '%';
        document.getElementById('liveErrors').textContent = this.incorrectChars;
        
        // Update progress bar
        const progress = (this.userInput.length / this.currentText.length) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
    }
    
    endTest() {
        this.testActive = false;
        clearInterval(this.timerInterval);
        this.testEndTime = Date.now();
        
        // Calculate final results
        const results = this.calculateResults();
        
        // Display results
        this.displayResults(results);
        
        // Save to local stats
        this.addToStats(results);
        
        // Navigate to results page
        this.navigateTo('results');
    }
    
    calculateResults() {
        const duration = (this.totalTime - this.timeRemaining) / 60; // in minutes
        const wordsTyped = this.userInput.trim().split(/\s+/).length;
        const totalChars = this.correctChars + this.incorrectChars;
        
        const wpm = duration > 0 ? Math.round(wordsTyped / duration) : 0;
        const cpm = duration > 0 ? Math.round(totalChars / duration) : 0;
        const accuracy = totalChars > 0 ? 
            Math.round((this.correctChars / totalChars) * 100) : 100;
        
        return {
            wpm,
            cpm,
            accuracy,
            correctChars: this.correctChars,
            incorrectChars: this.incorrectChars,
            totalChars,
            correctWords: Math.round(this.correctChars / 5), // Average word length
            incorrectWords: Math.round(this.incorrectChars / 5),
            totalWords: wordsTyped,
            duration: this.totalTime - this.timeRemaining,
            language: this.config.language,
            difficulty: this.config.difficulty,
            type: this.config.type,
            timestamp: new Date().toISOString()
        };
    }
    
    displayResults(results) {
        document.getElementById('resultWPM').textContent = results.wpm;
        document.getElementById('resultCPM').textContent = results.cpm;
        document.getElementById('resultAccuracy').textContent = results.accuracy + '%';
        document.getElementById('resultConsistency').textContent = 
            this.calculateConsistency(results) + '%';
        
        document.getElementById('resultCorrectChars').textContent = results.correctChars;
        document.getElementById('resultIncorrectChars').textContent = results.incorrectChars;
        document.getElementById('resultTotalChars').textContent = results.totalChars;
        
        document.getElementById('resultCorrectWords').textContent = results.correctWords;
        document.getElementById('resultIncorrectWords').textContent = results.incorrectWords;
        document.getElementById('resultTotalWords').textContent = results.totalWords;
        
        const minutes = Math.floor(results.duration / 60);
        const seconds = results.duration % 60;
        document.getElementById('resultDuration').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('resultLanguage').textContent = 
            this.config.language === 'en' ? 'English' : 'বাংলা';
    }
    
    calculateConsistency(results) {
        // Simple consistency calculation based on accuracy and speed variance
        // In a real app, you'd track WPM at intervals
        return Math.min(100, results.accuracy + 10);
    }
    
    retryTest() {
        this.navigateTo('practice');
        setTimeout(() => this.startTest(), 100);
    }
    
    saveResult() {
        const results = this.calculateResults();
        
        // Try to save to Firestore if authenticated
        if (window.db && firebase.auth().currentUser) {
            db.collection('user_results').add({
                ...results,
                userId: firebase.auth().currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                this.showToast('Result saved successfully!', 'success');
            }).catch(err => {
                console.error('Error saving result:', err);
                this.showToast('Error saving result', 'error');
            });
        } else {
            // Save to local storage
            const savedResults = JSON.parse(localStorage.getItem('typingResults') || '[]');
            savedResults.push(results);
            localStorage.setItem('typingResults', JSON.stringify(savedResults));
            this.showToast('Result saved locally!', 'success');
        }
    }
    
    loadStats() {
        const saved = localStorage.getItem('typingStats');
        return saved ? JSON.parse(saved) : {
            tests: [],
            bestWPM: 0,
            totalTests: 0,
            totalAccuracy: 0
        };
    }
    
    addToStats(results) {
        this.stats.tests.push(results);
        this.stats.totalTests++;
        this.stats.totalAccuracy += results.accuracy;
        
        if (results.wpm > this.stats.bestWPM) {
            this.stats.bestWPM = results.wpm;
        }
        
        this.saveStats();
        this.updateQuickStats();
    }
    
    saveStats() {
        localStorage.setItem('typingStats', JSON.stringify(this.stats));
    }
    
    updateQuickStats() {
        document.getElementById('bestWPM').textContent = this.stats.bestWPM;
        document.getElementById('totalTests').textContent = this.stats.totalTests;
        const avgAcc = this.stats.totalTests > 0 ? 
            Math.round(this.stats.totalAccuracy / this.stats.totalTests) : 0;
        document.getElementById('avgAccuracy').textContent = avgAcc + '%';
    }
    
    loadStatistics() {
        // Update overview stats
        document.getElementById('statBestWPM').textContent = this.stats.bestWPM;
        
        const avgWPM = this.stats.tests.length > 0 ? 
            Math.round(this.stats.tests.reduce((sum, t) => sum + t.wpm, 0) / this.stats.tests.length) : 0;
        document.getElementById('statAvgWPM').textContent = avgWPM;
        
        const bestAcc = this.stats.tests.length > 0 ? 
            Math.max(...this.stats.tests.map(t => t.accuracy)) : 0;
        document.getElementById('statBestAccuracy').textContent = bestAcc + '%';
        
        const totalTime = this.stats.tests.reduce((sum, t) => sum + t.duration, 0);
        document.getElementById('statTotalTime').textContent = Math.round(totalTime / 60) + 'm';
        
        // Load recent tests
        this.loadRecentTests();
        
        // Draw chart
        this.drawProgressChart();
    }
    
    loadRecentTests() {
        const list = document.getElementById('recentTestsList');
        
        if (this.stats.tests.length === 0) {
            list.innerHTML = '<p class="empty-state">No tests completed yet</p>';
            return;
        }
        
        const recent = this.stats.tests.slice(-10).reverse();
        
        list.innerHTML = recent.map(test => `
            <div class="test-item">
                <div class="test-info">
                    <div class="test-wpm">${test.wpm} WPM</div>
                    <div class="test-meta">
                        ${test.language === 'en' ? 'English' : 'বাংলা'} • 
                        ${test.difficulty} • 
                        ${new Date(test.timestamp).toLocaleDateString()}
                    </div>
                </div>
                <div class="test-accuracy">${test.accuracy}%</div>
            </div>
        `).join('');
    }
    
    drawProgressChart() {
        const canvas = document.getElementById('progressChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        if (this.stats.tests.length === 0) {
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-muted');
            ctx.font = '16px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('Complete tests to see your progress', canvas.width/2, canvas.height/2);
            return;
        }
        
        // Simple line chart
        const tests = this.stats.tests.slice(-20);
        const wpmValues = tests.map(t => t.wpm);
        const maxWPM = Math.max(...wpmValues, 100);
        
        ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--primary-color');
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const padding = 40;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;
        
        wpmValues.forEach((wpm, i) => {
            const x = padding + (i / (wpmValues.length - 1 || 1)) * chartWidth;
            const y = padding + chartHeight - (wpm / maxWPM) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--primary-color');
        wpmValues.forEach((wpm, i) => {
            const x = padding + (i / (wpmValues.length - 1 || 1)) * chartWidth;
            const y = padding + chartHeight - (wpm / maxWPM) * chartHeight;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    clearStats() {
        if (confirm('Are you sure you want to clear all statistics?')) {
            this.stats = {
                tests: [],
                bestWPM: 0,
                totalTests: 0,
                totalAccuracy: 0
            };
            this.saveStats();
            this.updateQuickStats();
            this.showToast('Statistics cleared', 'success');
        }
    }
    
    exportData() {
        const data = {
            stats: this.stats,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `typing-stats-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        this.showToast('Data exported successfully', 'success');
    }
    
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.stats) {
                        this.stats = data.stats;
                        this.saveStats();
                        this.updateQuickStats();
                        this.showToast('Data imported successfully', 'success');
                    }
                } catch (err) {
                    this.showToast('Error importing data', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    restartTest() {
        document.getElementById('typingInput').value = '';
        this.userInput = '';
        this.errors = 0;
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.timeRemaining = this.totalTime;
        this.testStartTime = Date.now();
        
        // Reset display
        this.displayText();
        this.updateTimerDisplay();
        document.getElementById('liveWPM').textContent = '0';
        document.getElementById('liveAccuracy').textContent = '100%';
        document.getElementById('liveErrors').textContent = '0';
        document.getElementById('progressFill').style.width = '0%';
        
        // Restart timer
        clearInterval(this.timerInterval);
        this.startTimer();
        
        document.getElementById('typingInput').focus();
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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TypingApp();
});
