// Auto-sync functionality - Updated for Admin Panel Data Source
const SYNC = {
    autoSyncInterval: null,
    lastUpdateTime: null,

    // Initialize sync
    init() {
        this.attachEventListeners();
        this.updateSyncStatus();
    },

    // Update sync status display
    updateSyncStatus() {
        const lastUpdatedElement = document.getElementById('lastUpdated');
        const syncStatus = document.getElementById('syncStatus');
        
        if (!lastUpdatedElement || !syncStatus) return;
        
        if (this.lastUpdateTime) {
            const now = new Date();
            const diffMs = now - this.lastUpdateTime;
            const diffSec = Math.floor(diffMs / 1000);
            
            if (diffSec < 60) {
                lastUpdatedElement.textContent = `${diffSec} seconds ago`;
            } else {
                const diffMin = Math.floor(diffSec / 60);
                lastUpdatedElement.textContent = `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
            }
            
            syncStatus.innerHTML = '<span>✅</span> Last updated: <span id="lastUpdated">' + lastUpdatedElement.textContent + '</span>';
        } else {
            syncStatus.innerHTML = '<span>⏳</span> Loading data...';
        }
    },

    // Sync data from admin panel
    async syncData() {
        try {
            console.log('Syncing data from admin panel...');
            
            const response = await fetch('/admin/api/get-display-data');
            const data = await response.json();
            
            if (response.ok) {
                // Update global data
                DATA_LOADER.teamsData = data.teams || {};
                DATA_LOADER.dateHeaders = data.headers || [];
                DATA_LOADER.allEmployees = data.allEmployees || [];
                
                // Update last sync time
                this.lastUpdateTime = new Date();
                this.updateSyncStatus();
                
                console.log('Data sync completed successfully from admin panel');
                console.log('Loaded data:', {
                    teams: Object.keys(data.teams || {}).length,
                    employees: data.allEmployees?.length || 0,
                    dates: data.headers?.length || 0
                });
                
                return true;
            } else {
                throw new Error('Failed to fetch data from admin panel');
            }
        } catch (error) {
            console.error('Error syncing data:', error);
            this.showSyncError();
            return false;
        }
    },

    // Show sync error
    showSyncError() {
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.innerHTML = '<span>❌</span> Sync failed - <button onclick="SYNC.syncData()" style="background: none; border: none; color: #007bff; cursor: pointer; text-decoration: underline;">Retry</button>';
        }
    },

    // Start auto-sync
    startAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }
        this.autoSyncInterval = setInterval(async () => {
            console.log('Auto-syncing data from admin panel...');
            await this.syncData();
        }, 30000); // 30 seconds
        console.log('Auto-sync started (30s interval)');
    },

    // Stop auto-sync
    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
            console.log('Auto-sync stopped');
        }
    },

    // Handle manual sync
    async handleManualSync() {
        const manualSyncBtn = document.getElementById('manualSyncBtn');
        if (!manualSyncBtn) return;
        
        manualSyncBtn.disabled = true;
        manualSyncBtn.innerHTML = '<span>⏳</span> Updating...';
        
        const success = await this.syncData();
        
        manualSyncBtn.disabled = false;
        manualSyncBtn.innerHTML = '<span>🔄</span> Update Now';
        
        if (success) {
            // Show success feedback
            manualSyncBtn.innerHTML = '<span>✅</span> Updated!';
            setTimeout(() => {
                manualSyncBtn.innerHTML = '<span>🔄</span> Update Now';
            }, 2000);
        }
    },

    // Attach event listeners
    attachEventListeners() {
        const manualSyncBtn = document.getElementById('manualSyncBtn');
        const autoSyncToggle = document.getElementById('autoSyncToggle');
        const retryBtn = document.getElementById('retryBtn');
        
        // Manual sync button
        if (manualSyncBtn) {
            manualSyncBtn.addEventListener('click', () => this.handleManualSync());
        }
        
        // Auto-sync toggle
        if (autoSyncToggle) {
            autoSyncToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoSync();
                } else {
                    this.stopAutoSync();
                }
            });
        }
        
        // Retry button
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                MAIN.initializeApp();
            });
        }
    }
};