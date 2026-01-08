// KICK BOT - Enhanced Version with Fixed Pastebin Support
class SnkKickSpammer {
    constructor() {
        this.tokens = [];
        this.activeTokens = [];
        this.currentChannel = null;
        this.currentChannelId = null;
        this.isSpamming = false;
        this.pastebinLines = null;
        this.spamStats = { sent: 0, failed: 0, total: 0 };
        this.isContinuousSpamming = false;
        this.continuousSpamInterval = null;
        this.continuousSpamSpeed = 1; // Ultra fast speed
        this.continuousSpamBackupTimer = null; // Backup timer for off-tab reliability
        this.visibilityHandler = null; // Visibility change handler
        this.continuousSpamSent = 0;
        this.continuousSpamFailed = 0;
        this.continuousPastebinIndex = 0; // Track pastebin rotation
        
        // New statistics tracking
        this.chatroomStats = {
            messagesSent: 0,
            messagesFailed: 0,
            chatroomBans: 0,
            accountsBanned: 0,
            accountsFlagged: 0,
            bannedTokens: new Set(),
            flaggedTokens: new Set()
        };
        this.tokenHealth = new Map();
        this.settings = {
            maxConcurrent: 5,
            autoRotateTokens: true,
            showNotifications: true,
            messageDelay: 1, // instant messaging - 1ms for minimal delay
            backgroundSpamming: true // Enable background spamming
        };
        this.backgroundWorker = null;
        this.isBackgroundSpamming = false;
        this.randomEmotes = [
            '[emote:39286:YOUTried]', '[emote:37239:WeSmart]', '[emote:37240:WeirdChamp]', '[emote:39284:vibePlz]',
            '[emote:37237:TriKool]', '[emote:39283:ToXiC]', '[emote:37236:ThisIsFine]', '[emote:37235:SUSSY]',
            '[emote:28633:SenpaiWhoo]', '[emote:39282:saltyTrain]', '[emote:37248:ratJAM]', '[emote:37234:Prayge]',
            '[emote:39279:PPJedi]', '[emote:39277:politeCat]', '[emote:37230:POLICE]', '[emote:37233:PogU]',
            '[emote:39275:peepoShyy]', '[emote:37246:peepoRiot]', '[emote:37245:peepoDJ]', '[emote:37232:PeepoClap]',
            '[emote:37231:PatrickBoo]', '[emote:28632:OuttaPocke]', '[emote:37229:OOOO]', '[emote:28631:NugTime]',
            '[emote:37228:NODDERS]', '[emote:39273:MuteD]', '[emote:37244:modCheck]', '[emote:43404:mericKat]',
            '[emote:37227:LULW]', '[emote:39272:LetMeIn]', '[emote:39261:kkHuh]', '[emote:55886:kickSadge]',
            '[emote:37226:KEKW]', '[emote:37225:KEKLEO]', '[emote:39269:KEKByebye]', '[emote:39256:KatKiss]',
            '[emote:305040:KappA]', '[emote:39268:HYPERCLAPH]', '[emote:39267:HaHaaHaHaa]', '[emote:37224:GIGACHAD]',
            '[emote:37243:gachiGASM]', '[emote:39402:Flowie]', '[emote:37221:EZ]', '[emote:39265:EDMusiC]',
            '[emote:39262:duckPlz]', '[emote:37220:DonoWall]', '[emote:39260:DanceDance]', '[emote:39258:coffinPls]',
            '[emote:37218:Clap]', '[emote:37242:catblobDan]', '[emote:39254:CaptFail]', '[emote:37217:Bwop]',
            '[emote:39251:beeBobble]', '[emote:39250:BBooomer]', '[emote:37215:AYAYA]'
        ];
        
        this.debouncedUpdateProgress = this.updateProgress.bind(this);
        this.init();
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // NEW: Auto-reset all spamming information
    resetAllSpammingInfo() {
        // Reset all spamming state variables
        this.isSpamming = false;
        this.isContinuousSpamming = false;
        this.isBackgroundSpamming = false;
        
        // Reset statistics
        this.spamStats = { sent: 0, failed: 0, total: 0 };
        this.continuousSpamSent = 0;
        this.continuousSpamFailed = 0;
        this.continuousPastebinIndex = 0;
        
        // Clear all timers and intervals immediately
        if (this.continuousSpamInterval) {
            clearInterval(this.continuousSpamInterval);
            this.continuousSpamInterval = null;
        }
        
        if (this.continuousSpamBackupTimer) {
            clearInterval(this.continuousSpamBackupTimer);
            this.continuousSpamBackupTimer = null;
        }
        
        // Cancel all active promises
        if (this.activePromises) {
            this.activePromises = [];
            this.activePromises = null;
        }
        
        // Reset UI elements to default state
        document.getElementById('spamButton').disabled = false;
        document.getElementById('stopButton').disabled = true;
        document.getElementById('spamStatus').textContent = 'Ready';
        document.getElementById('continuousSpamCheckbox').checked = false;
        
        // Reset progress displays
        document.getElementById('progressText').textContent = '0 / 0 messages sent - 0 sent | 0 failed';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('successRate').textContent = 'Success: 0%';
        document.getElementById('successRate').style.color = '#53fc18';
        
        // Reset pastebin
        this.pastebinLines = null;
        this.continuousPastebinIndex = 0;
        
        // Stop background worker if running
        if (this.backgroundWorker) {
            this.backgroundWorker.postMessage({ type: 'stop' });
        }
        
        localStorage.removeItem('snkBackgroundSpamActive');
        
        // Show notification about reset
        const sentCount = this.spamStats.sent || 0;
        const failedCount = this.spamStats.failed || 0;
        this.showNotification(`Spamming stopped and reset! All information cleared.`, 'success');
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.updateUI();
        this.createParticles();
        this.loadSettings();
        this.initBackgroundWorker();
        this.setupBackgroundSync();
        this.addBanCheckButton(); // Add ban check button
        this.startUnbanChecker(); // Start automatic unban checking
        this.showNotification('SNK KICK SPAMMER V 2.0 LOADED! 🚀', 'success');
    }

    loadFromStorage() {
        try {
            const savedTokens = localStorage.getItem('snkTokens');
            const savedMessages = localStorage.getItem('snkMessages');
            
            if (savedTokens) {
                this.tokens = JSON.parse(savedTokens);
            }
            
            if (savedMessages) {
                this.savedMessages = JSON.parse(savedMessages);
            } else {
                this.savedMessages = [];
            }
            
            this.updateActiveTokens();
        } catch (error) {
            console.error('Error loading from storage:', error);
            this.tokens = [];
            this.savedMessages = [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('snkTokens', JSON.stringify(this.tokens));
            localStorage.setItem('snkMessages', JSON.stringify(this.savedMessages));
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('snkSettings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
                this.applySettings();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('snkSettings', JSON.stringify(this.settings));
            this.applySettings();
            this.showNotification('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    applySettings() {
        document.getElementById('maxConcurrent').value = this.settings.maxConcurrent;
        document.getElementById('autoRotateTokens').checked = this.settings.autoRotateTokens;
        document.getElementById('showNotifications').checked = this.settings.showNotifications;
        document.getElementById('backgroundSpamming').checked = this.settings.backgroundSpamming;
    }

    updateActiveTokens() {
        this.activeTokens = this.tokens.filter(token => token.status === 'active');
        this.updateTokenSelect();
        this.updateTokenStats();
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        document.getElementById('connectBtn').addEventListener('click', () => this.connectToChannel());

        const debouncedConnect = this.debounce(() => this.connectToChannel(), 500);
        document.getElementById('channelInput').addEventListener('change', debouncedConnect);

        document.getElementById('fetchPastebinBtn').addEventListener('click', () => this.fetchFromPastebin());

        document.getElementById('spamButton').addEventListener('click', () => this.startSpamming());
        document.getElementById('stopButton').addEventListener('click', () => this.stopSpamming());

        document.querySelectorAll('.emote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleEmoteClick(e.target.closest('.emote-btn'));
            });
        });

        document.getElementById('addTokenBtn').addEventListener('click', () => this.showTokenModal());
        document.getElementById('saveTokenBtn').addEventListener('click', () => this.saveToken());
        document.getElementById('cancelTokenBtn').addEventListener('click', () => this.hideTokenModal());

        document.querySelector('.modal-close').addEventListener('click', () => this.hideTokenModal());
        document.getElementById('addMessageBtn').addEventListener('click', () => this.saveCurrentMessage());

        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => this.importData());
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearAllData());
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());

        document.getElementById('maxConcurrent').addEventListener('change', (e) => {
            this.settings.maxConcurrent = parseInt(e.target.value) || 5;
        });

        document.getElementById('autoRotateTokens').addEventListener('change', (e) => {
            this.settings.autoRotateTokens = e.target.checked;
        });

        document.getElementById('showNotifications').addEventListener('change', (e) => {
            this.settings.showNotifications = e.target.checked;
        });

        document.getElementById('backgroundSpamming').addEventListener('change', (e) => {
            this.settings.backgroundSpamming = e.target.checked;
        });

        document.getElementById('clearMessageBtn').addEventListener('click', () => {
            document.getElementById('messageInput').value = '';
            this.pastebinLines = null;
            this.continuousPastebinIndex = 0;
        });

        document.getElementById('channelInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connectToChannel();
        });

        const debouncedClearPastebin = this.debounce(() => {
            if (this.pastebinLines && !document.getElementById('messageInput').value.includes('[PASTEBIN MULTI-LINE:')) {
                this.pastebinLines = null;
                this.continuousPastebinIndex = 0;
            }
        }, 300);
        document.getElementById('messageInput').addEventListener('input', debouncedClearPastebin);

        setTimeout(() => {
            const batchImportBtn = document.getElementById('batchImportBtn');
            if (batchImportBtn) {
                batchImportBtn.addEventListener('click', () => this.showBatchImportModal());
            }
        }, 100);
    }

    handleEmoteClick(btn) {
        const messageInput = document.getElementById('messageInput');
        const currentValue = messageInput.value;
        const emoteCode = btn.dataset.emote;
        
        this.pastebinLines = null;
        this.continuousPastebinIndex = 0;
        
        if (currentValue.trim() === '') {
            messageInput.value = emoteCode;
        } else {
            messageInput.value = currentValue + ' ' + emoteCode;
        }
        messageInput.focus();
        
        btn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }

    async fetchAccountInfo(bearerToken) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('https://kick.com/api/v1/user', {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const userData = await response.json();
                return {
                    username: userData.username,
                    id: userData.id,
                    email: userData.email,
                    profilePicture: userData.profile_pic
                };
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to fetch account info:', error);
            }
        }
        return null;
    }

    showBatchImportModal() {
        if (!document.getElementById('batchImportModal')) {
            this.createBatchImportModal();
        }
        document.getElementById('batchImportModal').classList.add('show');
    }

    createBatchImportModal() {
        const modalHTML = `
            <div id="batchImportModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Import Multiple Tokens</h3>
                        <button class="modal-close" onclick="app.hideBatchImportModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="input-group">
                            <label>Upload TXT File:</label>
                            <input type="file" id="tokenFileInput" accept=".txt" class="input-field" style="margin-bottom: 1rem;">
                            <div style="text-align: center; color: #888; margin: 0.5rem 0;">OR</div>
                            <textarea id="batchTokenInput" placeholder="Paste tokens here (one per line)" class="input-field textarea" rows="8"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="importTokensBtn" class="btn btn-primary">Import Tokens</button>
                        <button class="btn btn-outline" onclick="app.hideBatchImportModal()">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        document.getElementById('importTokensBtn').addEventListener('click', () => this.importBatchTokens());
        document.getElementById('tokenFileInput').addEventListener('change', (e) => this.handleFileUpload(e));
    }

    hideBatchImportModal() {
        const modal = document.getElementById('batchImportModal');
        if (modal) {
            modal.classList.remove('show');
            document.getElementById('batchTokenInput').value = '';
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('batchTokenInput').value = e.target.result;
        };
        reader.readAsText(file);
    }

    async importBatchTokens() {
        let tokensText = document.getElementById('batchTokenInput').value.trim();
        
        if (!tokensText) {
            this.showNotification('Please upload a file or enter tokens', 'error');
            return;
        }
        
        const tokens = tokensText.split('\n').map(t => t.trim()).filter(t => t);
        let successCount = 0;
        let failCount = 0;
        
        this.showNotification(`Processing ${tokens.length} tokens...`, 'info');
        
        const batchSize = 5;
        for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);
            
            for (let j = 0; j < batch.length; j++) {
                const token = batch[j];
                
                if (this.tokens.some(t => t.token === token)) {
                    failCount++;
                    continue;
                }
                
                let accountInfo = null;
                let actualName = `Token ${i + j + 1}`;
                
                accountInfo = await this.fetchAccountInfo(token);
                if (accountInfo) {
                    actualName = accountInfo.username;
                }
                
                this.tokens.push({
                    id: Date.now() + i + j,
                    name: actualName,
                    token: token,
                    status: 'active',
                    addedAt: new Date().toISOString(),
                    accountInfo: accountInfo
                });
                
                successCount++;
            }
        }
        
        this.saveToStorage();
        this.updateActiveTokens();
        this.hideBatchImportModal();
        this.showNotification(`Import complete: ${successCount} tokens added, ${failCount} duplicates skipped`, 'success');
    }

    switchTab(tabName) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        if (tabName === 'tokens') {
            this.updateTokenList();
        } else if (tabName === 'messages') {
            this.updateMessageList();
        }
    }

    async connectToChannel() {
        const input = document.getElementById('channelInput').value.trim();
        
        if (!input) {
            this.showNotification('Please enter a channel name or URL', 'error');
            return;
        }

        let channelName = '';
        
        if (input.includes('kick.com/')) {
            channelName = input.replace('https://kick.com/', '').replace('https://www.kick.com/', '').replace('/', '');
        } else {
            channelName = input;
        }
        
        if (!channelName) {
            this.showNotification('Invalid channel input', 'error');
            return;
        }
        
        document.getElementById('channelInput').value = `https://kick.com/${channelName}`;

        try {
            this.showNotification('Connecting to channel...', 'info');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`https://kick.com/api/v2/channels/${channelName}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('Channel not found');
            }
            
            const channelData = await response.json();
            this.currentChannel = channelData;
            this.currentChannelId = channelData.chatroom.id;
            
            document.getElementById('connectionStatus').textContent = `● Connected to ${channelData.user.username}`;
            document.getElementById('connectionStatus').className = 'status-indicator online';
            
            this.showNotification(`Connected to ${channelData.user.username}!`, 'success');
            
        } catch (error) {
            this.showNotification('Failed to connect to channel', 'error');
            console.error('Channel connection error:', error);
        }
    }

    async fetchFromPastebin() {
        const messageInput = document.getElementById('messageInput');
        const pastebinUrl = messageInput.value.trim();
        
        if (!pastebinUrl.includes('pastebin.com')) {
            this.showNotification('Please enter a valid Pastebin URL', 'error');
            return;
        }

        try {
            this.showNotification('Fetching from Pastebin...', 'info');
            
            const pasteId = pastebinUrl.split('pastebin.com/')[1]?.split('?')[0];
            
            if (!pasteId) {
                throw new Error('Invalid Pastebin URL');
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(`https://corsproxy.io/?https://pastebin.com/raw/${pasteId}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('Failed to fetch paste');
            }
            
            const content = await response.text();
            this.pastebinLines = content.split('\n').filter(line => line.trim() !== '');
            this.continuousPastebinIndex = 0; // Reset rotation index
            
            if (this.pastebinLines.length > 1) {
                messageInput.value = `[PASTEBIN MULTI-LINE: ${this.pastebinLines.length} messages]`;
                this.showNotification(`Fetched ${this.pastebinLines.length} messages from Pastebin!`, 'success');
            } else {
                messageInput.value = content;
                this.showNotification('Content fetched successfully!', 'success');
            }
            
        } catch (error) {
            this.showNotification('Failed to fetch from Pastebin', 'error');
            console.error('Pastebin fetch error:', error);
        }
    }

    // Helper function to get next pastebin message with rotation
    getPastebinMessage() {
        if (!this.pastebinLines || this.pastebinLines.length === 0) {
            return null;
        }
        
        if (this.pastebinLines.length === 1) {
            return this.pastebinLines[0];
        }
        
        // Rotate through pastebin messages
        const message = this.pastebinLines[this.continuousPastebinIndex];
        this.continuousPastebinIndex = (this.continuousPastebinIndex + 1) % this.pastebinLines.length;
        
        // Debug logging to check rotation
        console.log(`Pastebin rotation: index ${this.continuousPastebinIndex - 1}, message: "${message.substring(0, 20)}..."`);
        
        return message;
    }

    // Helper function to check if token is banned from current channel
    isTokenBannedFromCurrentChannel(token) {
        if (!token.chatroomBans || !this.currentChannel?.user?.username) {
            return false;
        }
        return token.chatroomBans.includes(this.currentChannel.user.username);
    }

    // Get tokens that are not banned from the current channel
    getTokensForCurrentChannel() {
        return this.activeTokens.filter(token => !this.isTokenBannedFromCurrentChannel(token));
    }

    async startSpamming() {
        if (this.isSpamming || this.isContinuousSpamming || this.isBackgroundSpamming) return;
        
        if (!this.currentChannelId) {
            this.showNotification('Please connect to a channel first', 'error');
            return;
        }
        
        // Get tokens that are not banned from current channel
        const availableTokens = this.getTokensForCurrentChannel();
        
        if (availableTokens.length === 0) {
            this.showNotification('No active tokens available for this channel', 'error');
            return;
        }
        
        const message = document.getElementById('messageInput').value.trim();
        const randomEmote = document.getElementById('randomEmoteCheckbox').checked;
        const bypassEmoteOnly = document.getElementById('bypassEmoteOnlyCheckbox').checked;
        const rotateTokens = document.getElementById('rotateTokensCheckbox').checked;
        const tokenSelect = document.getElementById('tokenSelect').value;
        const continuousSpam = document.getElementById('continuousSpamCheckbox').checked;
        
        if (!message && !randomEmote) {
            this.showNotification('Please enter a message or enable random emotes', 'error');
            return;
        }
        
        if (continuousSpam) {
            this.startContinuousSpamming();
            return;
        }
        
        const requestedCount = parseInt(document.getElementById('countInput').value) || 1;
        let count = requestedCount;
        let actualMessage = message;
        
        if (this.pastebinLines && this.pastebinLines.length > 1) {
            const repetitions = Math.ceil(count / this.pastebinLines.length);
            let expandedLines = [];
            for (let i = 0; i < repetitions; i++) {
                expandedLines.push(...this.pastebinLines);
            }
            this.pastebinLines = expandedLines.slice(0, count);
            actualMessage = this.pastebinLines[0];
        }
        
        this.isSpamming = true;
        this.spamStats = { sent: 0, failed: 0, total: count };
        
        document.getElementById('spamButton').disabled = true;
        document.getElementById('stopButton').disabled = false;
        document.getElementById('spamStatus').textContent = 'Spamming...';
        
        this.updateProgress();
        this.showNotification(`Starting spam: ${count} messages`, 'info');
        
        try {
            await this.sendMessages(actualMessage, count, randomEmote, bypassEmoteOnly, rotateTokens, tokenSelect);
        } catch (error) {
            console.error('Ignoring error (SPAM NEVER STOPS):', error);
        }
        
        this.stopSpamming();
    }

    // UPDATED: Enhanced stopSpamming with auto-reset
    stopSpamming() {
        if (this.isBackgroundSpamming && this.backgroundWorker) {
            this.backgroundWorker.postMessage({ type: 'stop' });
            localStorage.removeItem('snkBackgroundSpamActive');
            this.resetAllSpammingInfo(); // Auto-reset when stopping background spamming
            return;
        }
        
        this.isSpamming = false;
        
        // Cancel all active promises immediately
        if (this.activePromises) {
            this.activePromises = [];
            this.activePromises = null; // Clear the reference completely
        }
        
        if (this.isContinuousSpamming) {
            this.stopContinuousSpamming();
            return;
        }
        
        // Auto-reset all spamming information for regular spamming
        this.resetAllSpammingInfo();
    }

    // BALANCED HIGH SUCCESS RATE PARALLELISM - NO LAG VERSION
    async sendMessages(message, count, randomEmote, bypassEmoteOnly, rotateTokens, tokenSelect) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const successRate = document.getElementById('successRate');
        
        // Get tokens that are not banned from current channel
        let tokensToUse = this.getTokensForCurrentChannel();
        
        if (tokenSelect !== 'all') {
            tokensToUse = tokensToUse.filter(token => token.name === tokenSelect);
        }
        
        if (tokensToUse.length === 0) {
            this.showNotification('No tokens available for selected option (tokens may be banned from this channel)', 'error');
            return;
        }
        
        let messagesToSend = [];
        if (this.pastebinLines && this.pastebinLines.length > 1) {
            messagesToSend = this.pastebinLines.slice(0, count);
        } else {
            const baseMessage = message;
            for (let i = 0; i < count; i++) {
                messagesToSend.push(baseMessage);
            }
        }
        
        // BALANCED FIRE ALL MESSAGES - PREVENT OVERLOAD
        let tokenIndex = 0;
        const allPromises = [];
        
        // FIRE MESSAGES WITH SMART TOKEN ROTATION
        for (let i = 0; i < messagesToSend.length; i++) {
            if (!this.isSpamming) break;
            
            const currentToken = tokensToUse[tokenIndex % tokensToUse.length];
            if (rotateTokens) tokenIndex++;
            
            let currentMessage;
            if (randomEmote) {
                currentMessage = this.randomEmotes[Math.floor(Math.random() * this.randomEmotes.length)];
            } else if (bypassEmoteOnly && messagesToSend[i]) {
                currentMessage = `[emote:37230:POLICE] ${messagesToSend[i]} [emote:37230:POLICE]`;
            } else {
                currentMessage = messagesToSend[i];
            }
            
            // SINGLE TOKEN WITH SMART BACKUP
            const promise = this.sendMessageWithRetry(currentToken.token, currentMessage)
                .then(success => {
                    if (success) {
                        this.spamStats.sent++;
                        this.updateProgress();
                    } else {
                        this.spamStats.failed++;
                        this.updateProgress();
                        // Try ONE backup token only if failed
                        const backupToken = tokensToUse[(tokenIndex + 1) % tokensToUse.length];
                        this.sendMessageWithRetry(backupToken.token, currentMessage)
                            .then(backupSuccess => {
                                if (backupSuccess) {
                                    this.spamStats.sent++;
                                    this.spamStats.failed--; // Undo fail
                                    this.updateProgress();
                                }
                            })
                            .catch(() => {}); // Ignore backup failures
                    }
                })
                .catch(error => {
                    this.spamStats.failed++;
                    this.updateProgress();
                });
            
            allPromises.push(promise);
        }
        
        // Track promises for immediate stop capability
        this.activePromises = allPromises;
        // Wait for all promises to complete
        await Promise.allSettled(allPromises);
    }

    updateProgress() {
        const sent = this.spamStats.sent || 0;
        const failed = this.spamStats.failed || 0;
        const totalProcessed = sent + failed;
        const total = this.spamStats.total || 1;
        
        // Update new statistics display
        this.updateStatisticsDisplay(sent, failed);
        
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');
        const successRate = document.getElementById('successRate');
        
        if (progressText) {
            progressText.textContent = `${sent} / ${total} messages sent (${sent} sent | ${failed} failed)`;
        }
        
        const progress = (totalProcessed / total) * 100;
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        const successPercent = totalProcessed > 0 ? 
            Math.round((sent / totalProcessed) * 100) : 0;
        if (successRate) {
            successRate.textContent = `Success: ${successPercent}%`;

            let color = "#ff4444";
            if (successPercent >= 70) color = "#44ff44";
            else if (successPercent >= 40) color = "#ffaa00";
            
            successRate.style.color = color;
            successRate.style.fontWeight = "bold";
        }
        
        if (progressText && progressBar) {
            progressText.offsetHeight;
            progressBar.offsetHeight;
        }
    }

    updateStatisticsDisplay(sent, failed) {
        // Update messages sent
        const messagesSentEl = document.getElementById('messagesSent');
        if (messagesSentEl) {
            messagesSentEl.textContent = this.chatroomStats.messagesSent;
        }
        
        // Update messages failed
        const messagesFailedEl = document.getElementById('messagesFailed');
        if (messagesFailedEl) {
            messagesFailedEl.textContent = this.chatroomStats.messagesFailed;
        }
        
        // Update chatroom bans
        const chatroomBansEl = document.getElementById('chatroomBans');
        if (chatroomBansEl) {
            chatroomBansEl.textContent = this.chatroomStats.chatroomBans;
        }
        
        // Update accounts banned
        const accountsBannedEl = document.getElementById('accountsBanned');
        if (accountsBannedEl) {
            accountsBannedEl.textContent = this.chatroomStats.accountsBanned;
        }
        
        // Update accounts flagged
        const accountsFlaggedEl = document.getElementById('accountsFlagged');
        if (accountsFlaggedEl) {
            accountsFlaggedEl.textContent = this.chatroomStats.accountsFlagged;
        }
    }

    // Add method to update stats without parameters (for manual calls)
    updateStatisticsDisplay() {
        // Update messages sent
        const messagesSentEl = document.getElementById('messagesSent');
        if (messagesSentEl) {
            messagesSentEl.textContent = this.chatroomStats.messagesSent;
        }
        
        // Update messages failed
        const messagesFailedEl = document.getElementById('messagesFailed');
        if (messagesFailedEl) {
            messagesFailedEl.textContent = this.chatroomStats.messagesFailed;
        }
        
        // Update chatroom bans
        const chatroomBansEl = document.getElementById('chatroomBans');
        if (chatroomBansEl) {
            chatroomBansEl.textContent = this.chatroomStats.chatroomBans;
        }
        
        // Update accounts banned
        const accountsBannedEl = document.getElementById('accountsBanned');
        if (accountsBannedEl) {
            accountsBannedEl.textContent = this.chatroomStats.accountsBanned;
        }
        
        // Update accounts flagged
        const accountsFlaggedEl = document.getElementById('accountsFlagged');
        if (accountsFlaggedEl) {
            accountsFlaggedEl.textContent = this.chatroomStats.accountsFlagged;
        }
    }

    // Add method to manually check all tokens for bans
    async checkAllTokensForBans() {
        console.log('Checking all tokens for bans...');
        
        for (const token of this.tokens) {
            if (token.status === 'active') {
                const isBanned = await this.checkTokenStatus(token.token);
                if (!isBanned) {
                    console.log(`Token ${token.name} is banned or invalid`);
                }
            }
        }
        
        // Update UI after checking
        this.updateActiveTokens();
        this.updateStatisticsDisplay();
        
        if (document.getElementById('tokens-tab').classList.contains('active')) {
            this.updateTokenList();
        }
    }

    // Add buttons to manually check for bans and unbans
    addBanCheckButton() {
        setTimeout(() => {
            const tokenStats = document.querySelector('.token-stats');
            if (tokenStats && !document.getElementById('checkUnbansBtn')) {
                // Check for unbans button
                const unbanCheckBtn = document.createElement('button');
                unbanCheckBtn.id = 'checkUnbansBtn';
                unbanCheckBtn.className = 'btn btn-success';
                unbanCheckBtn.textContent = '✅ Check for Unbans';
                unbanCheckBtn.style.marginTop = '0.5rem';
                unbanCheckBtn.style.width = '100%';
                
                unbanCheckBtn.addEventListener('click', () => {
                    this.checkAllBannedTokens();
                    this.showNotification('Checking for unbanned accounts...', 'info');
                });
                
                tokenStats.appendChild(unbanCheckBtn);
            }
        }, 100);
    }

    detectAccountIssues(bearerToken, responseStatus, error = null) {
        // Detect account bans (401/403 responses)
        if (responseStatus === 401 || responseStatus === 403) {
            this.handleAccountBan(bearerToken, responseStatus, error || '');
            return;
        }
        
        // Detect account flagging (rate limiting, temporary issues)
        if (responseStatus === 429 || responseStatus === 408) {
            if (!this.chatroomStats.flaggedTokens.has(bearerToken)) {
                this.chatroomStats.flaggedTokens.add(bearerToken);
                this.chatroomStats.accountsFlagged++;
                this.showNotification('Account flagged for rate limiting!', 'info');
            }
        }
        
        // Detect chatroom bans (multiple failures from same chatroom)
        if (error && error.message && error.message.includes('chatroom')) {
            this.chatroomStats.chatroomBans++;
            this.showNotification('Chatroom ban detected!', 'error');
        }
    }

    incrementMessageStats(success, bearerToken = null, responseStatus = null, error = null) {
        if (success) {
            this.chatroomStats.messagesSent++;
        } else {
            this.chatroomStats.messagesFailed++;
        }
        
        // Detect account issues if we have the token and response info
        if (bearerToken && responseStatus) {
            this.detectAccountIssues(bearerToken, responseStatus, error);
        }
    }

    // BALANCED HIGH SUCCESS RATE MESSAGE SENDING - NO OVERLOAD
    async sendMessageWithRetry(bearerToken, message, maxRetries = 2) {
        // SEQUENTIAL RETRIES TO PREVENT OVERLOAD
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const success = await this.sendMessage(bearerToken, message);
                if (success) return true;
                
                // Small delay between retries to prevent rate limiting
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                // Continue to next retry
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }
        return false;
    }

    async sendMessage(bearerToken, message, retryCount = 0) {
        const url = `https://kick.com/api/v2/messages/send/${this.currentChannelId}`;
        
        const headers = {
            'accept': '*/*',
            'content-type': 'application/json',
            'Authorization': `Bearer ${bearerToken}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Origin': 'https://kick.com',
            'Referer': 'https://kick.com/',
            'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site'
        };
        
        const data = {
            'content': message,
            'type': 'message',
            'message_ref': String(Date.now() + Math.random() + Math.floor(Math.random() * 10000))
        };
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const responseStatus = response.status;
            let responseText = '';
            
            try {
                responseText = await response.text();
            } catch (e) {
                // If we can't read response text, continue with status code only
            }
            
            // Enhanced ban detection
            if (responseStatus === 401 || responseStatus === 403) {
                // Check for specific ban indicators in response text
                const isBanned = responseText.toLowerCase().includes('banned') ||
                               responseText.toLowerCase().includes('suspended') ||
                               responseText.toLowerCase().includes('disabled') ||
                               responseText.toLowerCase().includes('blocked');
                
                // Force ban detection for 401/403 regardless of response text
                this.handleAccountBan(bearerToken, responseStatus, responseText);
                this.incrementMessageStats(false, bearerToken, responseStatus);
                return false;
            }
            
            if (responseStatus >= 200 && responseStatus < 300) {
                this.incrementMessageStats(true, bearerToken, responseStatus);
                return true;
            }
            
            // Handle rate limiting and temporary issues
            if (retryCount < 3 && (responseStatus >= 500 || responseStatus === 429 || responseStatus === 408)) {
                this.incrementMessageStats(false, bearerToken, responseStatus);
                const delay = Math.min(200 * Math.pow(2, retryCount), 1000);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.sendMessage(bearerToken, message, retryCount + 1);
            }
            
            // Check for ban indicators even in other error responses
            if (responseText.toLowerCase().includes('banned') || 
                responseText.toLowerCase().includes('suspended')) {
                this.handleAccountBan(bearerToken, responseStatus, responseText);
            }
            
            this.incrementMessageStats(false, bearerToken, responseStatus);
            return false;
            
        } catch (error) {
            if (error.name !== 'AbortError' && retryCount < 2) {
                // Check for network-level ban indicators
                const isBanRelated = error.message && (
                    error.message.toLowerCase().includes('banned') ||
                    error.message.toLowerCase().includes('blocked') ||
                    error.message.toLowerCase().includes('forbidden')
                );
                
                if (isBanRelated) {
                    this.handleAccountBan(bearerToken, 0, error.message);
                }
                
                this.incrementMessageStats(false, bearerToken, null, error);
                const delay = Math.min(300 * Math.pow(2, retryCount), 1500);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.sendMessage(bearerToken, message, retryCount + 1);
            }
            this.incrementMessageStats(false, bearerToken, null, error);
            return false;
        }
    }

    handleAccountBan(bearerToken, statusCode, responseText) {
        // Find the token
        const token = this.tokens.find(t => t.token === bearerToken);
        if (!token) return;
        
        // Initialize chatroom bans array if it doesn't exist
        if (!token.chatroomBans) {
            token.chatroomBans = [];
        }
        
        // Get current channel name for tracking
        const currentChannelName = this.currentChannel?.user?.username || 'unknown';
        
        // Check if token is already banned from this specific chatroom
        if (token.chatroomBans.includes(currentChannelName)) {
            return; // Already banned from this chatroom
        }
        
        // Add this chatroom to the bans list
        token.chatroomBans.push(currentChannelName);
        this.chatroomStats.chatroomBans++;
        
        // Update token status to show it's banned from current chatroom but still usable elsewhere
        token.status = 'active'; // Keep token active for other chatrooms
        token.lastBanInfo = {
            chatroom: currentChannelName,
            statusCode: statusCode,
            reason: responseText || 'Banned from chatroom',
            bannedAt: new Date().toISOString()
        };
        
        // Schedule a check to see if the account gets unbanned
        this.scheduleUnbanCheck(token, currentChannelName);
        
        // Also do an immediate check after 3 seconds for super-fast unbans
        setTimeout(() => {
            this.checkTokenUnbanStatus(token, currentChannelName);
        }, 3 * 1000);
        
        // Show specific notification about which account got banned
        this.showNotification(
            `⚠️ Account "${token.name}" was banned from ${currentChannelName}`,
            'warning'
        );
        
        // Update UI to reflect the chatroom ban
        this.updateStatisticsDisplay();
        
        // Force UI refresh if on tokens tab
        if (document.getElementById('tokens-tab').classList.contains('active')) {
            this.updateTokenList();
        }
        
        console.log(`Chatroom ban detected:`, {
            tokenName: token.name,
            token: bearerToken.substring(0, 20) + '...',
            bannedFrom: currentChannelName,
            statusCode, 
            responseText,
            totalChatroomBans: token.chatroomBans.length,
            timestamp: new Date().toISOString()
        });
    }

    async checkTokenStatus(bearerToken) {
        try {
            const response = await fetch('https://kick.com/api/v1/user', {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.status === 401 || response.status === 403) {
                const responseText = await response.text();
                this.handleAccountBan(bearerToken, response.status, responseText);
                return false;
            }
            
            return response.ok;
        } catch (error) {
            console.error('Token status check failed:', error);
            return false;
        }
    }

    markTokenAsBanned(bearerToken) {
        console.log('Token would be banned, but spamming continues anyway');
    }

    showTokenModal() {
        document.getElementById('tokenModal').classList.add('show');
    }

    hideTokenModal() {
        document.getElementById('tokenModal').classList.remove('show');
        document.getElementById('tokenValue').value = '';
    }

    async saveToken() {
        const token = document.getElementById('tokenValue').value.trim();
        
        if (!token) {
            this.showNotification('Please enter a bearer token', 'error');
            return;
        }
        
        if (this.tokens.some(t => t.token === token)) {
            this.showNotification('Token already exists', 'error');
            return;
        }
        
        this.showNotification('Fetching...', 'info');
        
        const accountInfo = await this.fetchAccountInfo(token);
        const actualName = accountInfo ? accountInfo.username : 'Unknown User';
        
        this.tokens.push({
            id: Date.now(),
            name: actualName,
            token: token,
            status: 'active',
            addedAt: new Date().toISOString(),
            accountInfo: accountInfo
        });
        
        this.saveToStorage();
        this.updateActiveTokens();
        this.hideTokenModal();
        this.showNotification(`Token added successfully for ${actualName}!`, 'success');
    }

    updateTokenSelect() {
        const select = document.getElementById('tokenSelect');
        select.innerHTML = '<option value="all">All Tokens</option>';
        
        this.activeTokens.forEach(token => {
            const option = document.createElement('option');
            option.value = token.name;
            option.textContent = token.name;
            select.appendChild(option);
        });
    }

    updateTokenStats() {
        document.getElementById('totalTokens').textContent = this.tokens.length;
        document.getElementById('activeTokens').textContent = this.activeTokens.length;
        document.getElementById('bannedTokens').textContent = 
            this.tokens.filter(token => token.status === 'banned').length;
        
        // Also update our custom statistics
        this.updateStatisticsDisplay();
    }

    resetStatistics() {
        this.chatroomStats = {
            messagesSent: 0,
            messagesFailed: 0,
            chatroomBans: 0,
            accountsBanned: 0,
            accountsFlagged: 0,
            bannedTokens: new Set(),
            flaggedTokens: new Set()
        };
        
        this.updateStatisticsDisplay();
        this.showNotification('Statistics reset!', 'info');
    }

    updateTokenList() {
        const container = document.getElementById('tokenList');
        container.innerHTML = '';
        
        this.tokens.forEach(token => {
            const card = document.createElement('div');
            card.className = 'token-card';
            
            // Determine status and color - simplified display
            const statusColor = token.status === 'active' ? '#00ff00' : 
                               token.status === 'banned' ? '#ff4444' : '#ffaa00';
            const statusText = token.status.toUpperCase();
            
            card.innerHTML = `
                <div class="token-info">
                    <h3>${token.name}</h3>
                    <div class="token-status">
                        <span style="color: ${statusColor};">● ${statusText}</span>
                        <span style="margin-left: 1rem; color: #777;">Added: ${new Date(token.addedAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="token-actions">
                    <button class="btn btn-outline" onclick="app.removeToken(${token.id})">Remove</button>
                    ${token.status === 'banned' ? `<button class="btn btn-secondary" onclick="app.reactivateToken(${token.id})">Reactivate</button>` : ''}
                </div>
            `;
            
            container.appendChild(card);
        });
    }

    

    removeToken(tokenId) {
        if (confirm('Are you sure you want to remove this token?')) {
            this.tokens = this.tokens.filter(token => token.id !== tokenId);
            this.saveToStorage();
            this.updateActiveTokens();
            this.updateTokenList();
            this.showNotification('Token removed', 'success');
        }
    }

    reactivateToken(tokenId) {
        const token = this.tokens.find(t => t.id === tokenId);
        if (token) {
            token.status = 'active';
            this.saveToStorage();
            this.updateActiveTokens();
            this.updateTokenList();
            this.showNotification('Token reactivated', 'success');
        }
    }

    saveCurrentMessage() {
        const message = document.getElementById('messageInput').value.trim();
        
        if (!message) {
            this.showNotification('No message to save', 'error');
            return;
        }
        
        if (this.savedMessages.some(m => m.content === message)) {
            this.showNotification('Message already saved', 'warning');
            return;
        }
        
        this.savedMessages.push({
            id: Date.now(),
            content: message,
            savedAt: new Date().toISOString()
        });
        
        this.saveToStorage();
        this.updateMessageList();
        this.showNotification('Message saved', 'success');
    }

    updateMessageList() {
        const container = document.getElementById('messageList');
        container.innerHTML = '';
        
        if (this.savedMessages.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #777;">No saved messages yet</p>';
            return;
        }
        
        this.savedMessages.forEach(message => {
            const card = document.createElement('div');
            card.className = 'message-card';
            
            card.innerHTML = `
                <div class="message-content">${message.content}</div>
                <div class="message-actions">
                    <button class="btn btn-secondary" onclick="app.loadMessage(${message.id})">Load</button>
                    <button class="btn btn-outline" onclick="app.deleteMessage(${message.id})">Delete</button>
                </div>
            `;
            
            container.appendChild(card);
        });
    }

    loadMessage(messageId) {
        const message = this.savedMessages.find(m => m.id === messageId);
        if (message) {
            document.getElementById('messageInput').value = message.content;
            this.showNotification('Message loaded', 'success');
        }
    }

    deleteMessage(messageId) {
        this.savedMessages = this.savedMessages.filter(m => m.id !== messageId);
        this.saveToStorage();
        this.updateMessageList();
        this.showNotification('Message deleted', 'success');
    }

    exportData() {
        const data = {
            tokens: this.tokens,
            messages: this.savedMessages,
            settings: this.settings,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `snk-kick-spammer-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Data exported successfully', 'success');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (data.tokens) this.tokens = data.tokens;
                    if (data.messages) this.savedMessages = data.messages;
                    if (data.settings) {
                        this.settings = { ...this.settings, ...data.settings };
                        this.applySettings();
                    }
                    
                    this.saveToStorage();
                    this.updateActiveTokens();
                    this.updateUI();
                    
                    this.showNotification('Data imported successfully', 'success');
                } catch (error) {
                    this.showNotification('Invalid data file', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            this.tokens = [];
            this.savedMessages = [];
            this.settings = {
                maxConcurrent: 5,
                autoRotateTokens: true,
                showNotifications: true,
                messageDelay: 50
            };
            this.currentChannel = null;
            this.currentChannelId = null;
            
            localStorage.removeItem('snkTokens');
            localStorage.removeItem('snkMessages');
            localStorage.removeItem('snkSettings');
            
            this.updateActiveTokens();
            this.updateUI();
            this.applySettings();
            
            document.getElementById('connectionStatus').textContent = '● Not Connected';
            document.getElementById('connectionStatus').className = 'status-indicator offline';
            document.getElementById('channelInput').value = '';
            document.getElementById('messageInput').value = '';
            
            this.showNotification('All data cleared', 'success');
        }
    }

    updateUI() {
        this.updateTokenList();
        this.updateMessageList();
        this.updateTokenStats();
    }

    startContinuousSpamming() {
        if (!this.currentChannelId) {
            this.showNotification('Please connect to a channel first', 'error');
            return;
        }

        // Get tokens that are not banned from current channel
        const availableTokens = this.getTokensForCurrentChannel();

        if (availableTokens.length === 0) {
            this.showNotification('No active tokens available for this channel', 'error');
            return;
        }

        const message = document.getElementById('messageInput').value.trim();
        const randomEmote = document.getElementById('randomEmoteCheckbox').checked;
        const bypassEmoteOnly = document.getElementById('bypassEmoteOnlyCheckbox').checked;

        if (!message && !randomEmote) {
            this.showNotification('Please enter a message or enable random emotes', 'error');
            return;
        }

        this.isContinuousSpamming = true;
        this.continuousSpamSent = 0;
        this.continuousSpamFailed = 0;

        // Reset pastebin rotation index when starting continuous spam
        if (this.pastebinLines && this.pastebinLines.length > 1) {
            this.continuousPastebinIndex = 0;
            console.log(`Starting continuous spam with ${this.pastebinLines.length} pastebin messages`);
        }

        document.getElementById('spamButton').disabled = true;
        document.getElementById('stopButton').disabled = false;
        document.getElementById('spamStatus').textContent = 'Continuous spamming...';

        this.updateContinuousProgress();
        this.showNotification('Continuous spam started - will spam until stopped', 'success');

        this.continuousSpamSettings = {
            message: message,
            randomEmote: randomEmote,
            bypassEmoteOnly: bypassEmoteOnly
        };
        this.activePromises = [];

        this.continuousSpamLoop();
    }

    // BALANCED HIGH SUCCESS RATE CONTINUOUS SPAM - NO LAG VERSION
    async continuousSpamLoop() {
        if (!this.isContinuousSpamming) return;

        // Get tokens that are not banned from current channel
        const availableTokens = this.getTokensForCurrentChannel();
        
        if (availableTokens.length === 0) {
            this.showNotification('No available tokens for this channel - stopping continuous spam', 'error');
            this.stopContinuousSpamming();
            return;
        }

        // Initialize pastebin rotation if needed
        if (this.pastebinLines && this.pastebinLines.length > 1) {
            if (this.continuousPastebinIndex === undefined || this.continuousPastebinIndex === null) {
                this.continuousPastebinIndex = 0;
            }
        }

        // BALANCED BATCH SIZE TO PREVENT OVERLOAD
        const batchSize = Math.min(availableTokens.length * 3, 15);
        let tokenIndex = 0;

        // FIRE MESSAGES WITH SMART REDUNDANCY FOR HIGH SUCCESS RATE
        for (let i = 0; i < batchSize; i++) {
            if (!this.isContinuousSpamming) break;
            
            const currentToken = availableTokens[tokenIndex % availableTokens.length];
            tokenIndex++;

            let currentMessage;
            if (this.continuousSpamSettings.randomEmote) {
                currentMessage = this.randomEmotes[Math.floor(Math.random() * this.randomEmotes.length)];
            } else if (this.continuousSpamSettings.bypassEmoteOnly) {
                // Get fresh pastebin message for each iteration
                let baseMessage;
                if (this.pastebinLines && this.pastebinLines.length > 1) {
                    baseMessage = this.pastebinLines[this.continuousPastebinIndex];
                    this.continuousPastebinIndex = (this.continuousPastebinIndex + 1) % this.pastebinLines.length;
                } else {
                    baseMessage = this.continuousSpamSettings.message;
                }
                currentMessage = `[emote:37230:POLICE] ${baseMessage} [emote:37230:POLICE]`;
            } else {
                // Get fresh pastebin message for each iteration
                if (this.pastebinLines && this.pastebinLines.length > 1) {
                    currentMessage = this.pastebinLines[this.continuousPastebinIndex];
                    this.continuousPastebinIndex = (this.continuousPastebinIndex + 1) % this.pastebinLines.length;
                    console.log(`Direct pastebin: index ${this.continuousPastebinIndex - 1}, message: "${currentMessage.substring(0, 20)}..."`);
                } else {
                    currentMessage = this.continuousSpamSettings.message;
                }
            }

            // SMART SINGLE TOKEN WITH RETRY - NO OVERLOAD
            this.sendMessageWithRetry(currentToken.token, currentMessage)
                .then(success => {
                    if (success) {
                        this.continuousSpamSent++;
                        this.updateContinuousProgress();
                    } else {
                        this.continuousSpamFailed++;
                        // Try ONE backup token if failed
                        const backupToken = availableTokens[(tokenIndex + 1) % availableTokens.length];
                        this.sendMessageWithRetry(backupToken.token, currentMessage)
                            .then(backupSuccess => {
                                if (backupSuccess) {
                                    this.continuousSpamSent++;
                                    this.continuousSpamFailed--; // Undo failure
                                    this.updateContinuousProgress();
                                } else {
                                    this.updateContinuousProgress();
                                }
                            })
                            .catch(() => {
                                this.updateContinuousProgress();
                            });
                    }
                })
                .catch(() => {
                    this.continuousSpamFailed++;
                    this.updateContinuousProgress();
                });
        }

        // CONTINUE WITH BALANCED SPEED - WORKS OFF TAB TOO
        if (this.isContinuousSpamming) {
            if (!this.continuousSpamInterval) {
                this.continuousSpamInterval = setInterval(() => {
                    if (this.isContinuousSpamming) {
                        this.continuousSpamLoop();
                    } else {
                        clearInterval(this.continuousSpamInterval);
                        this.continuousSpamInterval = null;
                    }
                }, 100); // Balanced speed - 100ms prevents overload

                // Simple backup timer for off-tab
                this.continuousSpamBackupTimer = setInterval(() => {
                    if (this.isContinuousSpamming && document.hidden) {
                        // Only run if tab is hidden and spamming
                        this.continuousSpamLoop();
                    }
                }, 150);
            }
        }
    }

    updateContinuousProgress() {
        const sent = this.continuousSpamSent || 0;
        const failed = this.continuousSpamFailed || 0;
        const total = sent + failed;
        
        // Update new statistics display
        this.updateStatisticsDisplay(sent, failed);
        
        const progressText = document.getElementById('progressText');
        const successRate = document.getElementById('successRate');
        const progressBar = document.getElementById('progressBar');
        
        if (progressText) {
            const successPercent = total > 0 ? Math.round((sent / total) * 100) : 0;
        progressText.textContent = `CONTINUOUS: ${sent} sent | ${failed} failed | ${successPercent}% success`;
        }
        
        const successPercent = total > 0 ?
            Math.round((sent / total) * 100) : 0;
        if (successRate) {
            successRate.textContent = `Success: ${successPercent}%`;

            let color = "#ff4444";
            if (successPercent >= 70) color = "#44ff44";
            else if (successPercent >= 40) color = "#ffaa00";
            
            successRate.style.color = color;
            successRate.style.fontWeight = "bold";
        }
        
        const time = Date.now() / 1000;
        const progress = (Math.sin(time) + 1) * 50;
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }

    // UPDATED: Enhanced stopContinuousSpamming with auto-reset
    stopContinuousSpamming() {
        this.isContinuousSpamming = false;
        this.continuousSpamSettings = null;

        // Clear ALL timers for complete stop
        if (this.continuousSpamInterval) {
            clearInterval(this.continuousSpamInterval);
            this.continuousSpamInterval = null;
        }
        
        if (this.continuousSpamBackupTimer) {
            clearInterval(this.continuousSpamBackupTimer);
            this.continuousSpamBackupTimer = null;
        }

        // Remove visibility change listener
        document.removeEventListener('visibilitychange', this.visibilityHandler);

        // Cancel all active promises immediately
        if (this.activePromises) {
            this.activePromises = [];
            this.activePromises = null;
        }

        // Auto-reset all spamming information
        this.resetAllSpammingInfo();
    }

    createParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = Math.random() * 3 + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 20}s`;
            particle.style.animationDuration = `${Math.random() * 15 + 20}s`;
            
            const colors = ['#53fc18', '#00ff00', '#6b46c1', '#ff4444'];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            particlesContainer.appendChild(particle);
        }
    }

    initBackgroundWorker() {
        try {
            this.backgroundWorker = new Worker('background-worker.js');
            this.backgroundWorker.onmessage = (e) => this.handleWorkerMessage(e.data);
            
            this.backgroundWorker.postMessage({ type: 'getStats' });
        } catch (error) {
            console.error('Failed to initialize background worker:', error);
            this.showNotification('Continuous spamming not available', 'warning');
        }
    }

    handleWorkerMessage(data) {
        const { type, stats, mode } = data;
        
        switch (type) {
            case 'progress':
                this.updateProgressFromWorker(stats, mode);
                break;
            case 'complete':
                this.handleWorkerComplete(stats);
                break;
            case 'started':
                this.handleWorkerStarted(mode);
                break;
            case 'stopped':
                this.handleWorkerStopped(stats);
                break;
            case 'stats':
                if (stats.sent > 0 || stats.failed > 0) {
                    this.restoreBackgroundSpamState(stats);
                }
                break;
        }
    }

    updateProgressFromWorker(stats, mode) {
        const sent = stats.sent || 0;
        const failed = stats.failed || 0;
        const total = stats.total || sent + failed || 1;
        
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');
        const successRate = document.getElementById('successRate');
        
        if (progressText) {
            if (mode === 'continuous') {
                const successPercent = total > 0 ? Math.round((sent / total) * 100) : 0;
            progressText.textContent = `CONTINUOUS: ${sent} sent | ${failed} failed | ${successPercent}% success`;
            } else {
                progressText.textContent = `${sent} / ${total} messages sent - ${sent} sent | ${failed} failed`;
            }
        }
        
        const progress = (sent / total) * 100;
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        const totalProcessed = sent + failed;
        const successPercent = totalProcessed > 0 ? 
            Math.round((sent / totalProcessed) * 100) : 0;
        if (successRate) {
            successRate.textContent = `Success: ${successPercent}%`;

            let color = "#ff4444";
            if (successPercent >= 70) color = "#44ff44";
            else if (successPercent >= 40) color = "#ffaa00";
            
            successRate.style.color = color;
            successRate.style.fontWeight = "bold";
        }
        
        if (progressText && progressBar) {
            progressText.offsetHeight;
            progressBar.offsetHeight;
        }
    }

    handleWorkerStarted(mode) {
        this.isBackgroundSpamming = true;
        document.getElementById('spamButton').disabled = true;
        document.getElementById('stopButton').disabled = false;
        
        if (mode === 'continuous') {
            document.getElementById('spamStatus').textContent = 'Continuous spamming...';
            document.getElementById('continuousSpamCheckbox').checked = true;
        } else {
            document.getElementById('spamStatus').textContent = 'Continuous spamming...';
        }
        
        this.showNotification(`Continuous ${mode} spam started!`, 'success');
    }

    handleWorkerStopped(stats) {
        this.isBackgroundSpamming = false;
        document.getElementById('spamButton').disabled = false;
        document.getElementById('stopButton').disabled = true;
        document.getElementById('spamStatus').textContent = 'Ready';
        document.getElementById('continuousSpamCheckbox').checked = false;
        
        this.showNotification(`Continuous spam stopped! ${stats.sent} sent, ${stats.failed} failed`, 'info');
        
        document.getElementById('progressText').textContent = '0 / 0 messages sent - 0 sent | 0 failed';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('successRate').textContent = 'Success: 0%';
    }

    handleWorkerComplete(stats) {
        this.handleWorkerStopped(stats);
    }

    restoreBackgroundSpamState(stats) {
        this.isBackgroundSpamming = true;
        document.getElementById('spamButton').disabled = true;
        document.getElementById('stopButton').disabled = false;
        document.getElementById('spamStatus').textContent = 'Continuous spamming active...';
        
        this.updateProgressFromWorker(stats, stats.total ? 'regular' : 'continuous');
        this.showNotification('Restored continuous spamming session!', 'info');
    }

    setupBackgroundSync() {
        setInterval(() => {
            if (this.isBackgroundSpamming) {
                localStorage.setItem('snkBackgroundSpamActive', 'true');
            } else {
                localStorage.removeItem('snkBackgroundSpamActive');
            }
        }, 1000);
        
        if (localStorage.getItem('snkBackgroundSpamActive') === 'true') {
            setTimeout(() => {
                if (this.backgroundWorker) {
                    this.backgroundWorker.postMessage({ type: 'getStats' });
                }
            }, 1000);
        }
    }

    // Schedule periodic unban check for a token
    scheduleUnbanCheck(token, chatroom) {
        // Check immediately, then frequently at first, then less frequently
        const checkIntervals = [
            10 * 1000,      // 10 seconds - immediate check
            30 * 1000,      // 30 seconds
            60 * 1000,      // 1 minute
            2 * 60 * 1000,  // 2 minutes
            5 * 60 * 1000,  // 5 minutes
            10 * 60 * 1000, // 10 minutes
            15 * 60 * 1000, // 15 minutes
            30 * 60 * 1000, // 30 minutes
            60 * 60 * 1000  // 1 hour
        ];
        
        let intervalIndex = 0;
        const scheduleNextCheck = () => {
            const delay = intervalIndex < checkIntervals.length ? 
                         checkIntervals[intervalIndex] : 
                         checkIntervals[checkIntervals.length - 1]; // Use last interval (1 hour) indefinitely
            
            if (intervalIndex < checkIntervals.length - 1) {
                intervalIndex++;
            }
            
            setTimeout(() => {
                this.checkTokenUnbanStatus(token, chatroom).then(isUnbanned => {
                    if (!isUnbanned && token.chatroomBans && token.chatroomBans.includes(chatroom)) {
                        scheduleNextCheck(); // Schedule next check if still banned
                    }
                });
            }, delay);
        };
        
        // Start checking immediately (10 seconds)
        setTimeout(scheduleNextCheck, 10 * 1000);
    }

    // Check if a token has been unbanned from a specific chatroom
    async checkTokenUnbanStatus(token, chatroom) {
        try {
            // Try to send a test message to check if the token is still banned
            // We'll check this when connected to the same channel
            if (this.currentChannel?.user?.username === chatroom && this.currentChannelId) {
                const testMessage = `[unban_check_${Date.now()}]`;
                const success = await this.sendMessage(token.token, testMessage);
                
                if (success) {
                    // Token is unbanned! Remove from chatroom bans
                    this.removeChatroomBan(token, chatroom);
                    return true;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    // Remove chatroom ban from token
    removeChatroomBan(token, chatroom) {
        if (!token.chatroomBans) return;
        
        const banIndex = token.chatroomBans.indexOf(chatroom);
        if (banIndex > -1) {
            token.chatroomBans.splice(banIndex, 1);
            this.chatroomStats.chatroomBans = Math.max(0, this.chatroomStats.chatroomBans - 1);
            
            // Clean up lastBanInfo if no more bans
            if (token.chatroomBans.length === 0) {
                delete token.lastBanInfo;
            }
            
            this.saveToStorage();
            this.updateActiveTokens();
            this.updateStatisticsDisplay();
            
            // Show success notification
            this.showNotification(
                `✅ Account "${token.name}" has been unbanned from ${chatroom} and can be used again!`,
                'success'
            );
            
            // Update UI if on tokens tab
            if (document.getElementById('tokens-tab').classList.contains('active')) {
                this.updateTokenList();
            }
            
            console.log(`Token unbanned:`, {
                tokenName: token.name,
                unbannedFrom: chatroom,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Start automatic unban checking for all tokens with bans
    startUnbanChecker() {
        // Check every 2 minutes for any tokens that might have been unbanned
        setInterval(() => {
            this.checkAllBannedTokens();
        }, 2 * 60 * 1000); // 2 minutes
    }

    // Check all tokens that have chatroom bans
    async checkAllBannedTokens() {
        for (const token of this.tokens) {
            if (token.chatroomBans && token.chatroomBans.length > 0) {
                for (const chatroom of [...token.chatroomBans]) { // Use spread to avoid modification during iteration
                    await this.checkTokenUnbanStatus(token, chatroom);
                }
            }
        }
    }

    showNotification(message, type = 'info') {
        if (!this.settings.showNotifications) return;
        
        const container = document.getElementById('notificationContainer');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 200);
        }, 4000);
    }
}

const app = new SnkKickSpammer();

if (!localStorage.getItem('snkMessages')) {
    const defaultMessages = [
        'SNK was here! 🚀'
    ];
    
    app.savedMessages = defaultMessages.map((content, index) => ({
        id: Date.now() + index,
        content: content,
        savedAt: new Date().toISOString()
    }));
    
    app.saveToStorage();
}
