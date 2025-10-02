// static/js/admin.js - Complete version with all features
const ADMIN = {
    currentDataSource: 'admin',
    activeShiftDropdown: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    modifiedShifts: new Set(),
    autoSyncInterval: null,
    autoSyncEnabled: false,
    shiftMap: {
        "M2": "8 AM – 5 PM",
        "M3": "9 AM – 6 PM", 
        "M4": "10 AM – 7 PM",
        "D1": "12 PM – 9 PM",
        "D2": "1 PM – 10 PM",
        "DO": "OFF",
        "SL": "Sick Leave",
        "CL": "Casual Leave",
        "EL": "Emergency Leave",
        "": "N/A"
    },

    // Initialize admin panel
    init() {
        this.loadAutoSyncSetting();
        this.initLogin();
        this.initNavigation();
        this.initDataSync();
        this.initGoogleLinks();
        this.initTeamManagement();
        this.initGoogleData();
        this.initAdminData();
        this.initCSVImport();
        this.initModifiedShifts();
        this.loadDataStats();
        this.updateMonthDisplay();
        this.startAutoSyncIfEnabled();
    },

    // Load auto-sync setting from localStorage
    loadAutoSyncSetting() {
        const savedSetting = localStorage.getItem('admin_auto_sync');
        this.autoSyncEnabled = savedSetting === 'true';
        
        const autoSyncToggle = document.getElementById('autoSyncToggle');
        if (autoSyncToggle) {
            autoSyncToggle.checked = this.autoSyncEnabled;
        }
    },

    // Save auto-sync setting to localStorage
    saveAutoSyncSetting() {
        localStorage.setItem('admin_auto_sync', this.autoSyncEnabled.toString());
    },

    // Start auto-sync if enabled
    startAutoSyncIfEnabled() {
        if (this.autoSyncEnabled) {
            this.startAutoSync();
        }
    },

    // Start auto-sync
    startAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }
        
        this.autoSyncInterval = setInterval(async () => {
            console.log('Auto-syncing Google Sheets data...');
            await this.syncGoogleSheets();
        }, 30000);
        
        this.autoSyncEnabled = true;
        this.saveAutoSyncSetting();
        this.updateAutoSyncStatus();
        console.log('Auto-sync started (30s interval)');
    },

    // Stop auto-sync
    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
        }
        
        this.autoSyncEnabled = false;
        this.saveAutoSyncSetting();
        this.updateAutoSyncStatus();
        console.log('Auto-sync stopped');
    },

    // Update auto-sync status display
    updateAutoSyncStatus() {
        const autoSyncStatus = document.getElementById('autoSyncStatus');
        const autoSyncToggle = document.getElementById('autoSyncToggle');
        
        if (autoSyncStatus) {
            if (this.autoSyncEnabled) {
                autoSyncStatus.textContent = 'Auto-sync: Enabled (30s)';
                autoSyncStatus.className = 'sync-status enabled';
            } else {
                autoSyncStatus.textContent = 'Auto-sync: Disabled';
                autoSyncStatus.className = 'sync-status disabled';
            }
        }
        
        if (autoSyncToggle) {
            autoSyncToggle.checked = this.autoSyncEnabled;
        }
    },

    // Initialize login functionality
    initLogin() {
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(loginForm);
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>⏳</span> Logging in...';
                
                try {
                    const response = await fetch('/admin/login', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        window.location.href = '/admin/dashboard';
                    } else {
                        this.showLoginMessage(result.error, 'error');
                    }
                } catch (error) {
                    this.showLoginMessage('Login failed. Please try again.', 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            });
        }
    },

    // Show login message
    showLoginMessage(message, type) {
        const messageEl = document.getElementById('loginMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `login-message ${type}`;
        }
    },

   // In admin.js - replace the initNavigation method with this:
initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            this.handleNavigation(btn);
        });
    });
},

// Add this new method to handle navigation
handleNavigation(btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    
    btn.classList.add('active');
    const tabId = btn.dataset.tab;
    const tab = document.getElementById(tabId);
    
    if (tab) {
        tab.classList.add('active');
        
        // Load data for specific tabs
        if (tabId === 'schedule-requests') {
            // Use setTimeout to ensure the tab is visible before loading
            setTimeout(() => {
                if (typeof ADMIN_SCHEDULE_REQUESTS !== 'undefined' && 
                    typeof ADMIN_SCHEDULE_REQUESTS.loadPendingRequests === 'function') {
                    console.log('Loading schedule requests...');
                    ADMIN_SCHEDULE_REQUESTS.loadPendingRequests();
                } else {
                    console.warn('ADMIN_SCHEDULE_REQUESTS not available yet');
                    // Try to initialize it
                    if (typeof ADMIN_SCHEDULE_REQUESTS !== 'undefined' && 
                        typeof ADMIN_SCHEDULE_REQUESTS.init === 'function') {
                        ADMIN_SCHEDULE_REQUESTS.init();
                        setTimeout(() => {
                            if (typeof ADMIN_SCHEDULE_REQUESTS.loadPendingRequests === 'function') {
                                ADMIN_SCHEDULE_REQUESTS.loadPendingRequests();
                            }
                        }, 100);
                    }
                }
            }, 50);
        } else if (tabId === 'google-links') {
            this.loadGoogleLinks();
        } else if (tabId === 'google-data') {
            this.loadGoogleData();
        } else if (tabId === 'admin-data') {
            this.loadAdminData();
        } else if (tabId === 'team-management') {
            this.loadTeamsAndEmployees();
        } else if (tabId === 'data-sync') {
            this.loadDataStats();
            this.loadModifiedShiftsStats();
        }
    }
},

    // Update month display
    updateMonthDisplay() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        
        const googleMonthEl = document.getElementById('currentMonthGoogle');
        const adminMonthEl = document.getElementById('currentMonthAdmin');
        
        if (googleMonthEl) {
            googleMonthEl.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        }
        if (adminMonthEl) {
            adminMonthEl.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        }
    },

    // Change month
    changeMonth(delta) {
        this.currentMonth += delta;
        
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        
        this.updateMonthDisplay();
        
        if (document.querySelector('#google-data').classList.contains('active')) {
            this.loadGoogleData();
        } else if (document.querySelector('#admin-data').classList.contains('active')) {
            this.loadAdminData();
        }
    },

    // Get dates for current month
    getCurrentMonthDates(headers) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = monthNames[this.currentMonth];
        
        return headers.filter(header => {
            return header.includes(currentMonth);
        });
    },

    // Get shift meaning
    getShiftMeaning(shiftCode) {
        return this.shiftMap[shiftCode] || shiftCode;
    },

    // Initialize data sync functionality
    initDataSync() {
        const syncBtn = document.getElementById('syncGoogleSheets');
        const resetBtn = document.getElementById('resetToGoogle');
        const autoSyncToggle = document.getElementById('autoSyncToggle');
        const prevMonthGoogle = document.getElementById('prevMonthGoogle');
        const nextMonthGoogle = document.getElementById('nextMonthGoogle');
        const prevMonthAdmin = document.getElementById('prevMonthAdmin');
        const nextMonthAdmin = document.getElementById('nextMonthAdmin');
        
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.syncGoogleSheets());
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToGoogle());
        }
        
        if (autoSyncToggle) {
            autoSyncToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoSync();
                } else {
                    this.stopAutoSync();
                }
            });
        }
        
        if (prevMonthGoogle) {
            prevMonthGoogle.addEventListener('click', () => this.changeMonth(-1));
        }
        
        if (nextMonthGoogle) {
            nextMonthGoogle.addEventListener('click', () => this.changeMonth(1));
        }
        
        if (prevMonthAdmin) {
            prevMonthAdmin.addEventListener('click', () => this.changeMonth(-1));
        }
        
        if (nextMonthAdmin) {
            nextMonthAdmin.addEventListener('click', () => this.changeMonth(1));
        }
        
        this.updateAutoSyncStatus();
    },

    // Sync Google Sheets data
    async syncGoogleSheets() {
        const syncBtn = document.getElementById('syncGoogleSheets');
        const originalText = syncBtn.innerHTML;
        
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<span>⏳</span> Syncing...';
        
        try {
            const response = await fetch('/admin/api/sync-google-sheets', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSyncMessage(result.message, 'success');
                this.updateDataStatus();
                this.loadDataStats();
                this.loadModifiedShiftsStats();
                this.loadGoogleLinks();
                
                if (document.querySelector('#google-data').classList.contains('active')) {
                    this.loadGoogleData();
                }
                if (document.querySelector('#admin-data').classList.contains('active')) {
                    this.loadAdminData();
                }
            } else {
                this.showSyncMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Sync error:', error);
            this.showSyncMessage('Sync failed. Please try again.', 'error');
        } finally {
            syncBtn.disabled = false;
            syncBtn.innerHTML = originalText;
        }
    },

    // Reset to Google data
    async resetToGoogle() {
        if (!confirm('Are you sure you want to reset all admin modifications? This cannot be undone.')) {
            return;
        }
        
        const resetBtn = document.getElementById('resetToGoogle');
        const originalText = resetBtn.innerHTML;
        
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<span>⏳</span> Resetting...';
        
        try {
            const response = await fetch('/admin/api/reset-to-google', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSyncMessage(result.message, 'success');
                this.modifiedShifts.clear();
                this.updateDataStatus();
                this.loadDataStats();
                this.loadModifiedShiftsStats();
                this.loadAdminData();
            } else {
                this.showSyncMessage('Reset failed.', 'error');
            }
        } catch (error) {
            console.error('Reset error:', error);
            this.showSyncMessage('Reset failed. Please try again.', 'error');
        } finally {
            resetBtn.disabled = false;
            resetBtn.innerHTML = originalText;
        }
    },

    // Show sync message
    showSyncMessage(message, type) {
        const messageEl = document.createElement('div');
        messageEl.className = `sync-message ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            z-index: 1000;
            font-weight: 600;
            ${type === 'success' ? 'background: #27ae60;' : 'background: #e74c3c;'}
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    },

    // Update data status display
    async updateDataStatus() {
        try {
            const [googleResponse, adminResponse] = await Promise.all([
                fetch('/admin/api/get-google-data'),
                fetch('/admin/api/get-admin-data')
            ]);
            
            const googleData = await googleResponse.json();
            const adminData = await adminResponse.json();
            
            const googleStatus = document.getElementById('googleDataStatus');
            const adminStatus = document.getElementById('adminDataStatus');
            
            if (googleStatus) {
                const empCount = googleData.allEmployees?.length || 0;
                googleStatus.textContent = empCount > 0 ? `${empCount} employees loaded` : 'Not loaded';
                googleStatus.style.color = empCount > 0 ? '#27ae60' : '#e74c3c';
            }
            
            if (adminStatus) {
                const empCount = adminData.allEmployees?.length || 0;
                adminStatus.textContent = empCount > 0 ? `${empCount} employees` : 'Not available';
                adminStatus.style.color = empCount > 0 ? '#3498db' : '#e74c3c';
            }
        } catch (error) {
            console.error('Error updating data status:', error);
        }
    },

    // Load data statistics
    async loadDataStats() {
        try {
            const response = await fetch('/admin/api/get-display-data');
            const data = await response.json();
            
            if (response.ok) {
                const totalEmployees = data.allEmployees?.length || 0;
                const totalTeams = Object.keys(data.teams || {}).length;
                const totalDates = data.headers?.length || 0;
                
                document.getElementById('totalEmployees').textContent = totalEmployees;
                document.getElementById('totalTeams').textContent = totalTeams;
                document.getElementById('totalDates').textContent = totalDates;
                
                const modifiedCount = await this.calculateModifiedShifts();
                document.getElementById('modifiedShifts').textContent = modifiedCount;
            }
        } catch (error) {
            console.error('Error loading data stats:', error);
        }
        
        this.updateDataStatus();
    },

    // Calculate modified shifts count
    async calculateModifiedShifts() {
        try {
            const [googleResponse, adminResponse] = await Promise.all([
                fetch('/admin/api/get-google-data'),
                fetch('/admin/api/get-admin-data')
            ]);
            
            const googleData = await googleResponse.json();
            const adminData = await adminResponse.json();
            
            let modifiedCount = 0;
            
            for (const teamName in adminData.teams) {
                if (googleData.teams[teamName]) {
                    for (const adminEmployee of adminData.teams[teamName]) {
                        const googleEmployee = googleData.teams[teamName].find(emp => emp.id === adminEmployee.id);
                        if (googleEmployee) {
                            for (let i = 0; i < adminEmployee.schedule.length; i++) {
                                if (adminEmployee.schedule[i] !== googleEmployee.schedule[i] && 
                                    adminEmployee.schedule[i] !== '') {
                                    modifiedCount++;
                                }
                            }
                        }
                    }
                }
            }
            
            return modifiedCount;
        } catch (error) {
            console.error('Error calculating modified shifts:', error);
            return 0;
        }
    },

    // Initialize Google Links Management
    initGoogleLinks() {
        const addLinkBtn = document.getElementById('addGoogleLinkBtn');
        const googleLinkForm = document.getElementById('googleLinkForm');
        const cancelGoogleLinkBtn = document.getElementById('cancelGoogleLinkBtn');
        
        if (addLinkBtn) {
            addLinkBtn.addEventListener('click', () => this.showGoogleLinkModal());
        }
        
        if (googleLinkForm) {
            googleLinkForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveGoogleLink();
            });
        }
        
        if (cancelGoogleLinkBtn) {
            cancelGoogleLinkBtn.addEventListener('click', () => {
                document.getElementById('googleLinkModal').style.display = 'none';
            });
        }
        
        // Close modal on outside click
        const googleLinkModal = document.getElementById('googleLinkModal');
        if (googleLinkModal) {
            googleLinkModal.addEventListener('click', (e) => {
                if (e.target === googleLinkModal) {
                    googleLinkModal.style.display = 'none';
                }
            });
        }
    },

    // Load Google Sheets links
    async loadGoogleLinks() {
        try {
            const response = await fetch('/admin/api/get-google-links');
            const links = await response.json();
            
            if (response.ok) {
                this.populateGoogleLinks(links);
            }
        } catch (error) {
            console.error('Error loading Google links:', error);
        }
    },

    // Populate Google Sheets links
    populateGoogleLinks(links) {
        const linksList = document.getElementById('linksList');
        if (!linksList) return;

        linksList.innerHTML = '';

        if (Object.keys(links).length === 0) {
            linksList.innerHTML = `
                <div class="no-links">
                    <p>No Google Sheets links added yet.</p>
                    <p>Click "Add New Month Link" to get started.</p>
                </div>
            `;
            return;
        }

        for (const [monthYear, link] of Object.entries(links)) {
            const linkItem = document.createElement('div');
            linkItem.className = 'link-item';
            
            // Check if this link is currently in use
            const isActive = this.isLinkActive(monthYear);
            
            linkItem.innerHTML = `
                <div class="link-info">
                    <div class="link-month">${monthYear}</div>
                    <div class="link-url">${link}</div>
                </div>
                <div class="link-status">
                    <div class="status ${isActive ? 'synced' : 'not-synced'}">
                        ${isActive ? '✅ Synced' : '❌ Not Synced'}
                    </div>
                </div>
                <div class="link-actions">
                    <button class="action-btn" onclick="ADMIN.editGoogleLink('${monthYear}', '${link}')">Edit</button>
                    <button class="action-btn danger" onclick="ADMIN.deleteGoogleLink('${monthYear}')">Delete</button>
                </div>
            `;
            
            linksList.appendChild(linkItem);
        }
    },

    // Check if a link is active (data exists for this month)
    isLinkActive(monthYear) {
        // This would need to check if we have data for this month
        // For now, we'll assume all links are active if we have any data
        return Object.keys(this.currentGoogleData || {}).length > 0;
    },

    // Show Google Link modal
    showGoogleLinkModal(monthYear = '', link = '') {
        const modal = document.getElementById('googleLinkModal');
        const title = document.getElementById('googleLinkModalTitle');
        const monthInput = document.getElementById('linkMonthYear');
        const linkInput = document.getElementById('googleLink');
        
        if (monthYear) {
            title.textContent = 'Edit Google Sheets Link';
            monthInput.value = monthYear;
            linkInput.value = link;
        } else {
            title.textContent = 'Add Google Sheets Link';
            monthInput.value = '';
            linkInput.value = '';
        }
        
        modal.style.display = 'flex';
    },

    // Save Google Sheets link
    async saveGoogleLink() {
        const monthYear = document.getElementById('linkMonthYear').value.trim();
        const link = document.getElementById('googleLink').value.trim();
        const modalTitle = document.getElementById('googleLinkModalTitle').textContent;
        const isEdit = modalTitle.includes('Edit');
        
        if (!monthYear || !link) {
            alert('Please fill all fields');
            return;
        }
        
        // Validate month-year format (e.g., Sep-2024)
        if (!monthYear.match(/^[A-Za-z]{3}-\d{4}$/)) {
            alert('Please use format: MMM-YYYY (e.g., Sep-2024)');
            return;
        }
        
        try {
            const response = await fetch('/admin/api/save-google-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    monthYear: monthYear,
                    googleLink: link
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('googleLinkModal').style.display = 'none';
                this.loadGoogleLinks();
                this.showSyncMessage(result.message, 'success');
            } else {
                this.showSyncMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Error saving Google link:', error);
            this.showSyncMessage('Error saving Google link', 'error');
        }
    },

    // Edit Google Sheets link
    editGoogleLink(monthYear, link) {
        this.showGoogleLinkModal(monthYear, link);
    },

    // Delete Google Sheets link
    deleteGoogleLink(monthYear) {
        this.showConfirmationModal(
            'Delete Google Sheets Link',
            `Are you sure you want to delete the Google Sheets link for ${monthYear}?`,
            () => this.confirmDeleteGoogleLink(monthYear)
        );
    },

    // Confirm delete Google Sheets link
    async confirmDeleteGoogleLink(monthYear) {
        try {
            const response = await fetch('/admin/api/delete-google-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    monthYear: monthYear
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('confirmationModal').style.display = 'none';
                this.loadGoogleLinks();
                this.showSyncMessage(result.message, 'success');
            } else {
                this.showSyncMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting Google link:', error);
            this.showSyncMessage('Error deleting Google link', 'error');
        }
    },

    // Team Management Functions
    initTeamManagement() {
        this.attachTeamManagementEvents();
    },

    // Attach team management events
    attachTeamManagementEvents() {
        document.getElementById('addTeamBtn').addEventListener('click', () => {
            this.showTeamModal();
        });

        document.getElementById('addEmployeeBtn').addEventListener('click', () => {
            this.showEmployeeModal();
        });

        document.getElementById('employeeTeamFilter').addEventListener('change', () => {
            this.filterEmployees();
        });

        // Attach modal events
        this.attachModalEvents();
    },

    // Attach modal events
    attachModalEvents() {
        // Close modals
        document.querySelectorAll('.management-modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.management-modal').style.display = 'none';
            });
        });

        // Cancel buttons
        document.getElementById('cancelTeamBtn').addEventListener('click', () => {
            document.getElementById('teamModal').style.display = 'none';
        });

        document.getElementById('cancelEmployeeBtn').addEventListener('click', () => {
            document.getElementById('employeeModal').style.display = 'none';
        });

        document.getElementById('cancelConfirmBtn').addEventListener('click', () => {
            document.getElementById('confirmationModal').style.display = 'none';
        });

        // Form submissions
        document.getElementById('teamForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTeam();
        });

        document.getElementById('employeeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEmployee();
        });

        // Close on outside click
        document.querySelectorAll('.management-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    },

    // Load teams and employees
    async loadTeamsAndEmployees() {
        try {
            const response = await fetch('/admin/api/get-admin-data');
            const data = await response.json();
            
            if (response.ok) {
                this.currentTeams = data.teams;
                this.populateTeamsList(data.teams);
                this.populateEmployeesList(data.teams);
                this.populateTeamFilter(data.teams);
            }
        } catch (error) {
            console.error('Error loading teams and employees:', error);
        }
    },

    // Populate teams list
    populateTeamsList(teams) {
        const teamsList = document.getElementById('teamsList');
        if (!teamsList) return;

        teamsList.innerHTML = '';

        for (const [teamName, employees] of Object.entries(teams)) {
            const teamItem = document.createElement('div');
            teamItem.className = 'team-item';
            teamItem.innerHTML = `
                <div class="team-info">
                    <div class="team-name">${teamName}</div>
                    <div class="employee-count">${employees.length} employees</div>
                </div>
                <div class="team-actions">
                    <button class="action-btn" data-team="${teamName}" onclick="ADMIN.editTeam('${teamName}')">Edit</button>
                    <button class="action-btn danger" data-team="${teamName}" onclick="ADMIN.deleteTeam('${teamName}')">Delete</button>
                </div>
            `;
            teamsList.appendChild(teamItem);
        }
    },

    // Populate employees list
    populateEmployeesList(teams) {
        const employeesList = document.getElementById('employeesList');
        if (!employeesList) return;

        employeesList.innerHTML = '';

        for (const [teamName, employees] of Object.entries(teams)) {
            employees.forEach(employee => {
                const employeeItem = document.createElement('div');
                employeeItem.className = 'employee-item';
                employeeItem.innerHTML = `
                    <div class="employee-info">
                        <div class="employee-name">${employee.name}</div>
                        <div class="employee-details">
                            ${employee.id} • ${teamName}
                        </div>
                    </div>
                    <div class="employee-actions">
                        <button class="action-btn" onclick="ADMIN.editEmployee('${employee.id}')">Edit</button>
                        <button class="action-btn danger" onclick="ADMIN.deleteEmployee('${employee.id}')">Delete</button>
                    </div>
                `;
                employeesList.appendChild(employeeItem);
            });
        }
    },

    // Populate team filter
    populateTeamFilter(teams) {
        const teamFilter = document.getElementById('employeeTeamFilter');
        if (!teamFilter) return;

        teamFilter.innerHTML = '<option value="">All Teams</option>';
        
        for (const teamName of Object.keys(teams)) {
            const option = document.createElement('option');
            option.value = teamName;
            option.textContent = teamName;
            teamFilter.appendChild(option);
        }
    },

    // Filter employees
    filterEmployees() {
        const teamFilter = document.getElementById('employeeTeamFilter').value;
        const employeeItems = document.querySelectorAll('.employee-item');
        
        employeeItems.forEach(item => {
            const employeeTeam = item.querySelector('.employee-details').textContent.split('•')[1].trim();
            if (!teamFilter || employeeTeam === teamFilter) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    },

    // Show team modal
    showTeamModal(teamName = '') {
        const modal = document.getElementById('teamModal');
        const title = document.getElementById('teamModalTitle');
        const nameInput = document.getElementById('teamName');
        
        if (teamName) {
            title.textContent = 'Edit Team';
            nameInput.value = teamName;
        } else {
            title.textContent = 'Add Team';
            nameInput.value = '';
        }
        
        modal.style.display = 'flex';
    },

    // Show employee modal
    showEmployeeModal(employee = null) {
        const modal = document.getElementById('employeeModal');
        const title = document.getElementById('employeeModalTitle');
        const nameInput = document.getElementById('employeeName');
        const idInput = document.getElementById('employeeId');
        const teamSelect = document.getElementById('employeeTeam');
        
        teamSelect.innerHTML = '<option value="">Select Team</option>';
        for (const teamName of Object.keys(this.currentTeams || {})) {
            const option = document.createElement('option');
            option.value = teamName;
            option.textContent = teamName;
            teamSelect.appendChild(option);
        }
        
        if (employee) {
            title.textContent = 'Edit Employee';
            nameInput.value = employee.name;
            idInput.value = employee.id;
            teamSelect.value = employee.team;
            idInput.disabled = true;
            
            // Store old data for edit operations
            idInput.dataset.oldId = employee.oldId || employee.id;
            teamSelect.dataset.oldTeam = employee.oldTeam || employee.team;
        } else {
            title.textContent = 'Add Employee';
            nameInput.value = '';
            idInput.value = '';
            teamSelect.value = '';
            idInput.disabled = false;
            
            // Clear old data for new employee
            delete idInput.dataset.oldId;
            delete teamSelect.dataset.oldTeam;
        }
        
        modal.style.display = 'flex';
    },

    // Save team
    async saveTeam() {
        const teamName = document.getElementById('teamName').value.trim();
        const modalTitle = document.getElementById('teamModalTitle').textContent;
        const isEdit = modalTitle.includes('Edit');
        
        if (!teamName) {
            alert('Please enter a team name');
            return;
        }
        
        try {
            const response = await fetch('/admin/api/save-team', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    teamName: teamName,
                    action: isEdit ? 'edit' : 'add'
                })
            });
            
            if (response.ok) {
                document.getElementById('teamModal').style.display = 'none';
                this.loadTeamsAndEmployees();
                this.showSyncMessage(`Team ${isEdit ? 'updated' : 'added'} successfully`, 'success');
            } else {
                throw new Error('Failed to save team');
            }
        } catch (error) {
            console.error('Error saving team:', error);
            this.showSyncMessage('Error saving team', 'error');
        }
    },

    // Save employee
    async saveEmployee() {
        const name = document.getElementById('employeeName').value.trim();
        const id = document.getElementById('employeeId').value.trim();
        const team = document.getElementById('employeeTeam').value;
        const modalTitle = document.getElementById('employeeModalTitle').textContent;
        const isEdit = modalTitle.includes('Edit');
        
        if (!name || !id || !team) {
            alert('Please fill all fields');
            return;
        }
        
        // Get old data from the modal (stored when editing)
        const oldId = document.getElementById('employeeId').dataset.oldId;
        const oldTeam = document.getElementById('employeeTeam').dataset.oldTeam;
        
        try {
            const requestData = {
                name: name,
                id: id,
                team: team,
                action: isEdit ? 'edit' : 'add'
            };
            
            // Add old data for edit operations
            if (isEdit) {
                requestData.oldId = oldId || id;
                requestData.oldTeam = oldTeam || team;
            }
            
            const response = await fetch('/admin/api/save-employee', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            if (response.ok) {
                document.getElementById('employeeModal').style.display = 'none';
                this.loadTeamsAndEmployees();
                this.showSyncMessage(`Employee ${isEdit ? 'updated' : 'added'} successfully`, 'success');
            } else {
                throw new Error('Failed to save employee');
            }
        } catch (error) {
            console.error('Error saving employee:', error);
            this.showSyncMessage('Error saving employee', 'error');
        }
    },

    // Edit team
    editTeam(teamName) {
        this.showTeamModal(teamName);
    },

    // Edit employee
    async editEmployee(employeeId) {
        try {
            const response = await fetch('/admin/api/get-admin-data');
            const data = await response.json();
            
            if (response.ok) {
                for (const [teamName, employees] of Object.entries(data.teams)) {
                    const employee = employees.find(emp => emp.id === employeeId);
                    if (employee) {
                        employee.team = teamName;
                        // Store the original ID and team for the edit operation
                        employee.oldId = employeeId;
                        employee.oldTeam = teamName;
                        this.showEmployeeModal(employee);
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading employee data:', error);
        }
    },

    // Delete team
    deleteTeam(teamName) {
        this.showConfirmationModal(
            'Delete Team',
            `Are you sure you want to delete the team "${teamName}"? This will also remove all employees in this team.`,
            () => this.confirmDeleteTeam(teamName)
        );
    },

    // Delete employee
    deleteEmployee(employeeId) {
        this.showConfirmationModal(
            'Delete Employee',
            'Are you sure you want to delete this employee? This action cannot be undone.',
            () => this.confirmDeleteEmployee(employeeId)
        );
    },

    // Show confirmation modal
    showConfirmationModal(title, message, confirmCallback) {
        document.getElementById('confirmationModalTitle').textContent = title;
        document.getElementById('confirmationMessage').textContent = title;
        document.getElementById('confirmationDetails').textContent = message;
        
        const confirmBtn = document.getElementById('confirmActionBtn');
        confirmBtn.onclick = confirmCallback;
        
        document.getElementById('confirmationModal').style.display = 'flex';
    },

    // Confirm delete team
    async confirmDeleteTeam(teamName) {
        try {
            const response = await fetch('/admin/api/delete-team', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    teamName: teamName
                })
            });
            
            if (response.ok) {
                document.getElementById('confirmationModal').style.display = 'none';
                this.loadTeamsAndEmployees();
                this.showSyncMessage('Team deleted successfully', 'success');
            } else {
                throw new Error('Failed to delete team');
            }
        } catch (error) {
            console.error('Error deleting team:', error);
            this.showSyncMessage('Error deleting team', 'error');
        }
    },

    // Confirm delete employee
    async confirmDeleteEmployee(employeeId) {
        try {
            const response = await fetch('/admin/api/delete-employee', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employeeId: employeeId
                })
            });
            
            if (response.ok) {
                document.getElementById('confirmationModal').style.display = 'none';
                this.loadTeamsAndEmployees();
                this.showSyncMessage('Employee deleted successfully', 'success');
            } else {
                throw new Error('Failed to delete employee');
            }
        } catch (error) {
            console.error('Error deleting employee:', error);
            this.showSyncMessage('Error deleting employee', 'error');
        }
    },

    // The rest of the existing functions (Google Data, Admin Data, CSV Import, etc.)
    initGoogleData() {
        const refreshBtn = document.getElementById('refreshGoogleData');
        const teamFilter = document.getElementById('googleTeamFilter');
        const employeeFilter = document.getElementById('googleEmployeeFilter');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadGoogleData());
        }
        
        if (teamFilter) {
            teamFilter.addEventListener('change', () => this.filterGoogleTable());
        }
        
        if (employeeFilter) {
            employeeFilter.addEventListener('change', () => this.filterGoogleTable());
        }
    },

    // Load Google data
    async loadGoogleData() {
        const loadingEl = document.getElementById('loadingGoogleData');
        const tableBody = document.querySelector('#googleRosterTable tbody');
        
        if (loadingEl) loadingEl.style.display = 'block';
        if (tableBody) tableBody.innerHTML = '';
        
        try {
            const response = await fetch('/admin/api/get-google-data');
            const data = await response.json();
            
            if (response.ok) {
                this.currentGoogleData = data;
                this.populateGoogleTable(data);
                this.populateGoogleFilters(data);
            } else {
                throw new Error(data.error || 'Failed to load Google data');
            }
        } catch (error) {
            console.error('Error loading Google data:', error);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="100" style="text-align: center; color: #c62828; padding: 20px;">
                            Error loading Google data: ${error.message}
                        </td>
                    </tr>
                `;
            }
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    },

    // Populate Google data table
    populateGoogleTable(data) {
        const tableHead = document.querySelector('#googleRosterTable thead tr');
        const tableBody = document.querySelector('#googleRosterTable tbody');
        
        if (!tableHead || !tableBody) return;
        
        tableHead.innerHTML = '<th>Employee</th><th>ID</th><th>Team</th>';
        tableBody.innerHTML = '';
        
        const monthDates = this.getCurrentMonthDates(data.headers);
        
        monthDates.forEach((header, index) => {
            const th = document.createElement('th');
            th.className = 'date-header';
            th.textContent = header;
            th.dataset.dateIndex = data.headers.indexOf(header);
            tableHead.appendChild(th);
        });
        
        Object.entries(data.teams).forEach(([teamName, employees]) => {
            employees.forEach(employee => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${employee.name}</td>
                    <td>${employee.id}</td>
                    <td>${teamName}</td>
                `;
                
                monthDates.forEach(header => {
                    const dateIndex = data.headers.indexOf(header);
                    const shift = employee.schedule[dateIndex] || '';
                    const cell = document.createElement('td');
                    cell.className = `shift-cell readonly shift-${shift}`;
                    cell.textContent = shift;
                    cell.title = `Google Sheets: ${shift} (${this.getShiftMeaning(shift)})`;
                    row.appendChild(cell);
                });
                
                tableBody.appendChild(row);
            });
        });
    },

    // Populate Google filters
    populateGoogleFilters(data) {
        const teamFilter = document.getElementById('googleTeamFilter');
        const employeeFilter = document.getElementById('googleEmployeeFilter');
        
        if (teamFilter) {
            teamFilter.innerHTML = '<option value="">All Teams</option>';
            Object.keys(data.teams || {}).forEach(team => {
                const option = document.createElement('option');
                option.value = team;
                option.textContent = team;
                teamFilter.appendChild(option);
            });
        }
        
        if (employeeFilter) {
            employeeFilter.innerHTML = '<option value="">All Employees</option>';
            const allEmployees = [];
            Object.values(data.teams || {}).forEach(employees => {
                employees.forEach(emp => {
                    if (!allEmployees.find(e => e.id === emp.id)) {
                        allEmployees.push(emp);
                    }
                });
            });
            
            allEmployees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = `${emp.name} (${emp.id})`;
                employeeFilter.appendChild(option);
            });
        }
    },

    // Filter Google table
    filterGoogleTable() {
        const teamFilter = document.getElementById('googleTeamFilter')?.value;
        const employeeFilter = document.getElementById('googleEmployeeFilter')?.value;
        const rows = document.querySelectorAll('#googleRosterTable tbody tr');
        
        rows.forEach(row => {
            const teamName = row.cells[2].textContent;
            const employeeId = row.cells[1].textContent;
            let showRow = true;
            
            if (teamFilter && teamName !== teamFilter) {
                showRow = false;
            }
            
            if (employeeFilter && employeeId !== employeeFilter) {
                showRow = false;
            }
            
            row.style.display = showRow ? '' : 'none';
        });
    },

    // Initialize Admin data management
    initAdminData() {
        const refreshBtn = document.getElementById('refreshAdminData');
        const teamFilter = document.getElementById('adminTeamFilter');
        const employeeFilter = document.getElementById('adminEmployeeFilter');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadAdminData());
        }
        
        if (teamFilter) {
            teamFilter.addEventListener('change', () => this.filterAdminTable());
        }
        
        if (employeeFilter) {
            employeeFilter.addEventListener('change', () => this.filterAdminTable());
        }
    },

    // Load Admin data
    async loadAdminData() {
        const loadingEl = document.getElementById('loadingAdminData');
        const tableBody = document.querySelector('#adminRosterTable tbody');
        
        if (loadingEl) loadingEl.style.display = 'block';
        if (tableBody) tableBody.innerHTML = '';
        
        try {
            const [adminResponse, googleResponse] = await Promise.all([
                fetch('/admin/api/get-admin-data'),
                fetch('/admin/api/get-google-data')
            ]);
            
            const adminData = await adminResponse.json();
            const googleData = await googleResponse.json();
            
            if (adminResponse.ok && googleResponse.ok) {
                this.populateAdminTable(adminData, googleData);
                this.populateAdminFilters(adminData);
            } else {
                throw new Error('Failed to load admin or Google data');
            }
        } catch (error) {
            console.error('Error loading admin data:', error);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="100" style="text-align: center; color: #c62828; padding: 20px;">
                            Error loading admin data: ${error.message}
                        </td>
                    </tr>
                `;
            }
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    },

    // Populate Admin data table
    populateAdminTable(adminData, googleData) {
        const tableHead = document.querySelector('#adminRosterTable thead tr');
        const tableBody = document.querySelector('#adminRosterTable tbody');
        
        if (!tableHead || !tableBody) return;
        
        tableHead.innerHTML = '<th>Employee</th><th>ID</th><th>Team</th>';
        tableBody.innerHTML = '';
        
        const monthDates = this.getCurrentMonthDates(adminData.headers);
        
        monthDates.forEach((header, index) => {
            const th = document.createElement('th');
            th.className = 'date-header';
            th.textContent = header;
            th.dataset.dateIndex = adminData.headers.indexOf(header);
            tableHead.appendChild(th);
        });
        
        Object.entries(adminData.teams).forEach(([teamName, employees]) => {
            employees.forEach(employee => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${employee.name}</td>
                    <td>${employee.id}</td>
                    <td>${teamName}</td>
                `;
                
                const googleEmployee = googleData.teams[teamName]?.find(emp => emp.id === employee.id);
                
                monthDates.forEach(header => {
                    const dateIndex = adminData.headers.indexOf(header);
                    const adminShift = employee.schedule[dateIndex] || '';
                    const googleShift = googleEmployee?.schedule[dateIndex] || '';
                    
                    const cell = document.createElement('td');
                    cell.className = `shift-cell editable shift-${adminShift}`;
                    cell.textContent = adminShift;
                    cell.dataset.employeeId = employee.id;
                    cell.dataset.dateIndex = dateIndex;
                    cell.dataset.googleShift = googleShift;
                    
                    if (adminShift !== googleShift && adminShift !== '') {
                        cell.classList.add('modified');
                        this.modifiedShifts.add(`${employee.id}-${dateIndex}`);
                    }
                    
                    const shiftMeaning = this.getShiftMeaning(adminShift);
                    const googleMeaning = this.getShiftMeaning(googleShift);
                    let tooltip = `Current: ${adminShift} (${shiftMeaning})`;
                    if (googleShift) {
                        tooltip += ` | Original: ${googleShift} (${googleMeaning})`;
                    }
                    cell.title = tooltip;
                    
                    cell.addEventListener('click', (e) => this.showShiftDropdown(e, employee.id, dateIndex, 'admin'));
                    row.appendChild(cell);
                });
                
                tableBody.appendChild(row);
            });
        });
        
        this.loadDataStats();
    },

    // Populate Admin filters
    populateAdminFilters(data) {
        const teamFilter = document.getElementById('adminTeamFilter');
        const employeeFilter = document.getElementById('adminEmployeeFilter');
        
        if (teamFilter) {
            teamFilter.innerHTML = '<option value="">All Teams</option>';
            Object.keys(data.teams || {}).forEach(team => {
                const option = document.createElement('option');
                option.value = team;
                option.textContent = team;
                teamFilter.appendChild(option);
            });
        }
        
        if (employeeFilter) {
            employeeFilter.innerHTML = '<option value="">All Employees</option>';
            const allEmployees = [];
            Object.values(data.teams || {}).forEach(employees => {
                employees.forEach(emp => {
                    if (!allEmployees.find(e => e.id === emp.id)) {
                        allEmployees.push(emp);
                    }
                });
            });
            
            allEmployees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = `${emp.name} (${emp.id})`;
                employeeFilter.appendChild(option);
            });
        }
    },

    // Filter Admin table
    filterAdminTable() {
        const teamFilter = document.getElementById('adminTeamFilter')?.value;
        const employeeFilter = document.getElementById('adminEmployeeFilter')?.value;
        const rows = document.querySelectorAll('#adminRosterTable tbody tr');
        
        rows.forEach(row => {
            const teamName = row.cells[2].textContent;
            const employeeId = row.cells[1].textContent;
            let showRow = true;
            
            if (teamFilter && teamName !== teamFilter) {
                showRow = false;
            }
            
            if (employeeFilter && employeeId !== employeeFilter) {
                showRow = false;
            }
            
            row.style.display = showRow ? '' : 'none';
        });
    },

    // Show shift dropdown for editing
    showShiftDropdown(event, employeeId, dateIndex, source) {
        if (this.activeShiftDropdown) {
            this.activeShiftDropdown.remove();
        }
        
        const shiftCodes = ['M2', 'M3', 'M4', 'D1', 'D2', 'DO', 'SL', 'CL', 'EL', ''];
        const dropdown = document.createElement('div');
        dropdown.className = 'shift-dropdown';
        
        const currentCell = event.target;
        const currentShift = currentCell.textContent;
        const googleShift = currentCell.dataset.googleShift || '';
        
        shiftCodes.forEach(shift => {
            const option = document.createElement('div');
            option.className = 'shift-option';
            option.textContent = shift || '(Clear)';
            
            if (shift) {
                option.title = this.getShiftMeaning(shift);
            }
            
            if (shift === currentShift) {
                option.style.backgroundColor = '#e3f2fd';
                option.style.fontWeight = 'bold';
            }
            
            option.addEventListener('click', () => {
                this.updateShift(employeeId, dateIndex, shift, source, googleShift);
                dropdown.remove();
                this.activeShiftDropdown = null;
                
                currentCell.textContent = shift;
                currentCell.className = `shift-cell editable shift-${shift}`;
                currentCell.dataset.googleShift = googleShift;
                
                const shiftMeaning = this.getShiftMeaning(shift);
                const googleMeaning = this.getShiftMeaning(googleShift);
                let tooltip = `Current: ${shift} (${shiftMeaning})`;
                if (googleShift) {
                    tooltip += ` | Original: ${googleShift} (${googleMeaning})`;
                }
                currentCell.title = tooltip;
                
                if (shift !== googleShift && shift !== '') {
                    currentCell.classList.add('modified');
                    this.modifiedShifts.add(`${employee.id}-${dateIndex}`);
                } else {
                    currentCell.classList.remove('modified');
                    this.modifiedShifts.delete(`${employee.id}-${dateIndex}`);
                }
                
                this.loadDataStats();
                this.loadModifiedShiftsStats();
            });
            
            dropdown.appendChild(option);
        });
        
        document.body.appendChild(dropdown);
        this.activeShiftDropdown = dropdown;
        
        const rect = event.target.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.top = `${rect.bottom + window.scrollY}px`;
        
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!dropdown.contains(e.target) && e.target !== event.target) {
                    dropdown.remove();
                    this.activeShiftDropdown = null;
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 0);
    },

    // Update shift
    async updateShift(employeeId, dateIndex, newShift, source, googleShift) {
        try {
            const response = await fetch('/admin/api/update-shift', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employeeId: employeeId,
                    dateIndex: dateIndex,
                    newShift: newShift,
                    source: source,
                    googleShift: googleShift
                })
            });
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showSyncMessage('Shift updated successfully', 'success');
            } else {
                this.showSyncMessage('Failed to update shift: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error updating shift:', error);
            this.showSyncMessage('Error updating shift. Please try again.', 'error');
        }
    },

    // Initialize CSV import
    initCSVImport() {
        const fileInput = document.getElementById('csvFile');
        const fileUploadArea = document.getElementById('fileUploadArea');
        const browseBtn = fileUploadArea?.querySelector('.browse-btn');
        const uploadForm = document.getElementById('csvUploadForm');
        
        if (browseBtn && fileInput) {
            browseBtn.addEventListener('click', () => fileInput.click());
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));
        }
        
        if (fileUploadArea) {
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadArea.classList.add('dragover');
            });
            
            fileUploadArea.addEventListener('dragleave', () => {
                fileUploadArea.classList.remove('dragover');
            });
            
            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            });
            
            fileUploadArea.addEventListener('click', () => fileInput.click());
        }
        
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this.handleCSVUpload(e));
        }
        
        const removeFileBtn = document.getElementById('removeFile');
        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearFileSelection();
            });
        }
    },

    // Handle file selection
    handleFileSelect(file) {
        if (!file || !file.name.endsWith('.csv')) {
            this.showUploadMessage('Please select a valid CSV file.', 'error');
            return;
        }
        
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const uploadBtn = document.querySelector('#csvUploadForm .upload-btn');
        const uploadPlaceholder = document.querySelector('.upload-placeholder');
        
        if (fileInfo && fileName && uploadBtn && uploadPlaceholder) {
            fileName.textContent = file.name;
            fileInfo.style.display = 'flex';
            uploadPlaceholder.style.display = 'none';
            uploadBtn.disabled = false;
        }
    },

    // Clear file selection
    clearFileSelection() {
        const fileInput = document.getElementById('csvFile');
        const fileInfo = document.getElementById('fileInfo');
        const uploadBtn = document.querySelector('#csvUploadForm .upload-btn');
        const uploadPlaceholder = document.querySelector('.upload-placeholder');
        
        if (fileInput && fileInfo && uploadBtn && uploadPlaceholder) {
            fileInput.value = '';
            fileInfo.style.display = 'none';
            uploadPlaceholder.style.display = 'block';
            uploadBtn.disabled = true;
        }
    },

    // Handle CSV upload
    async handleCSVUpload(event) {
        event.preventDefault();
        
        const fileInput = document.getElementById('csvFile');
        const uploadBtn = event.target.querySelector('.upload-btn');
        const originalText = uploadBtn.innerHTML;
        
        if (!fileInput.files.length) {
            this.showUploadMessage('Please select a CSV file first.', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('csv_file', fileInput.files[0]);
        
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span>⏳</span> Uploading...';
        
        try {
            const response = await fetch('/admin/api/upload-csv', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showUploadMessage(result.message || 'CSV uploaded successfully!', 'success');
                this.clearFileSelection();
                
                this.updateDataStatus();
                this.loadDataStats();
                this.loadModifiedShiftsStats();
                
                if (document.querySelector('#google-data').classList.contains('active')) {
                    setTimeout(() => this.loadGoogleData(), 1000);
                }
                if (document.querySelector('#admin-data').classList.contains('active')) {
                    setTimeout(() => this.loadAdminData(), 1000);
                }
            } else {
                this.showUploadMessage(result.error || 'Upload failed.', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showUploadMessage('Upload failed. Please try again.', 'error');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = originalText;
        }
    },

    // Show upload message
    showUploadMessage(message, type) {
        const messageEl = document.getElementById('uploadMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type}`;
        }
    },

    // Initialize modified shifts tracking
    initModifiedShifts() {
        const modifiedShiftsCard = document.getElementById('modifiedShiftsCard');
        const userModificationsCard = document.getElementById('userModificationsCard');
        
        if (modifiedShiftsCard) {
            modifiedShiftsCard.addEventListener('click', () => this.toggleModifiedShiftsDetails());
        }
        
        if (userModificationsCard) {
            userModificationsCard.addEventListener('click', () => this.toggleModifiedShiftsDetails());
        }
        
        this.loadModifiedShiftsStats();
    },

    // Load modified shifts statistics
    async loadModifiedShiftsStats() {
        try {
            const response = await fetch('/admin/api/get-modified-shifts');
            const data = await response.json();
            
            if (response.ok) {
                this.updateModifiedShiftsStats(data);
            }
        } catch (error) {
            console.error('Error loading modified shifts stats:', error);
        }
    },

    // Update modified shifts statistics display
    updateModifiedShiftsStats(data) {
        const monthlyStats = data.monthly_stats;
        const currentUser = sessionStorage.getItem('admin_username') || 'admin';
        
        document.getElementById('totalModifiedShifts').textContent = monthlyStats.total_modifications || 0;
        document.getElementById('modifiedEmployees').textContent = 
            `${monthlyStats.employees_modified?.length || 0} employees affected`;
        
        const userModifications = monthlyStats.modifications_by_user?.[currentUser] || 0;
        document.getElementById('userModifications').textContent = userModifications;
        
        const userCounts = monthlyStats.modifications_by_user ? Object.values(monthlyStats.modifications_by_user) : [];
        const sortedCounts = [...userCounts].sort((a, b) => b - a);
        const userRank = userModifications > 0 ? (sortedCounts.indexOf(userModifications) + 1) : 0;
        document.getElementById('userRank').textContent = `Rank: ${userRank}`;
        
        const currentMonth = data.current_month || new Date().toISOString().slice(0, 7);
        document.getElementById('currentMonthDisplay').textContent = 
            new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        this.updateModificationsList(data.recent_modifications || []);
    },

    // Update modifications list
    updateModificationsList(modifications) {
        const modificationsList = document.getElementById('modificationsList');
        if (!modificationsList) return;
        
        if (modifications.length === 0) {
            modificationsList.innerHTML = '<div class="no-modifications">No modifications this month</div>';
            return;
        }
        
        modificationsList.innerHTML = modifications.map(mod => `
            <div class="modification-item">
                <div class="modification-info">
                    <div class="modification-employee">${mod.employee_name} (${mod.employee_id})</div>
                    <div class="modification-details">
                        ${mod.team_name} • ${mod.date_header}
                    </div>
                </div>
                <div class="modification-shifts">
                    <div class="shift-change">
                        <span class="shift-from">${mod.old_shift}</span>
                        <span class="shift-arrow">→</span>
                        <span class="shift-to">${mod.new_shift}</span>
                    </div>
                </div>
                <div class="modification-meta">
                    <div class="modification-user">by ${mod.modified_by}</div>
                    <div>${new Date(mod.timestamp).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
    },

    // Toggle modified shifts details
    toggleModifiedShiftsDetails() {
        const details = document.getElementById('modifiedShiftsDetails');
        if (details) {
            details.style.display = details.style.display === 'none' ? 'block' : 'none';
        }
    }
};

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ADMIN.init();
});