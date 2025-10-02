// Authentication functionality for Roster Viewer
const AUTH = {
    currentUser: null,
    authPassword: 'cxpteam2024', // Default password for Customer Experience Team

    // Initialize authentication - called immediately
    init() {
        console.log('AUTH initialized');
        this.setInitialScreenState();
        this.attachAuthEvents();
        this.createParticleBackground();
        this.checkAuthentication();
    },

    // Set initial screen state to prevent flashing
    setInitialScreenState() {
        const authScreen = document.getElementById('authScreen');
        const appScreen = document.getElementById('appScreen');
        
        // Hide both screens initially
        if (authScreen) authScreen.style.display = 'none';
        if (appScreen) appScreen.style.display = 'none';
    },

    // Check if user is authenticated
    checkAuthentication() {
        const savedUser = localStorage.getItem('rosterViewerUser');
        const savedAuth = localStorage.getItem('rosterViewerAuth');
        
        if (savedUser && savedAuth) {
            this.currentUser = JSON.parse(savedUser);
            this.showAppScreen();
        } else {
            this.showAuthScreen();
        }
    },

    // Show authentication screen (full page)
    showAuthScreen() {
        const authScreen = document.getElementById('authScreen');
        const appScreen = document.getElementById('appScreen');
        
        if (authScreen) {
            authScreen.style.display = 'flex';
        }
        if (appScreen) {
            appScreen.style.display = 'none';
        }
    },

    // Show application screen (after successful auth)
    showAppScreen() {
        const authScreen = document.getElementById('authScreen');
        const appScreen = document.getElementById('appScreen');
        
        if (authScreen) {
            authScreen.style.display = 'none';
        }
        if (appScreen) {
            appScreen.style.display = 'block';
        }
        
        // Show user info
        const user = this.getCurrentUser();
        if (user) {
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = user.fullName;
            }
            
            // AUTO-LOAD EMPLOYEE DATA AFTER LOGIN
            this.loadEmployeeDataAfterLogin(user.employeeId);
        }
    },

    // Load employee data after user logs in
    async loadEmployeeDataAfterLogin(employeeId) {
        try {
            console.log('Loading data for employee:', employeeId);
            
            // First initialize the main app to load data
            if (typeof MAIN !== 'undefined') {
                await MAIN.initializeApp();
                
                // Find the employee in the loaded data
                if (typeof SEARCH !== 'undefined') {
                    const employee = SEARCH.findEmployeeById(employeeId);
                    if (employee) {
                        console.log('Employee found, displaying info:', employee.name);
                        MAIN.displayEmployeeInfo(employee);
                        
                        // INITIALIZE DASHBOARD WITH EMPLOYEE DATA
                        if (typeof DASHBOARD !== 'undefined') {
                            await DASHBOARD.init(employeeId);
                        }
                    } else {
                        console.warn('Employee not found in data:', employeeId);
                        this.showEmployeeNotFoundMessage(employeeId);
                    }
                }
                
                // Initialize shift modal - ensure this happens after calendar
                if (typeof MAIN.initShiftModal === 'function') {
                    MAIN.initShiftModal();
                }
            }
            
            // Start sync status updates
            if (typeof SYNC !== 'undefined') {
                setInterval(() => SYNC.updateSyncStatus(), 60000);
            }
        } catch (error) {
            console.error('Error loading employee data after login:', error);
        }
    },

    // Show message if employee not found
    showEmployeeNotFoundMessage(employeeId) {
        const shiftsPanel = document.getElementById('shiftsPanel');
        const calendarContainer = document.getElementById('calendarContainer');
        
        if (shiftsPanel) shiftsPanel.style.display = 'none';
        if (calendarContainer) calendarContainer.style.display = 'none';
        
        // Show error message
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h3>Employee Data Not Found</h3>
                    <p>No roster data found for ID: <strong>${employeeId}</strong></p>
                    <p>Please contact your manager to ensure your roster is properly configured.</p>
                    <button onclick="AUTH.logout()" style="margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Try Different Login
                    </button>
                </div>
            `;
            errorMessage.style.display = 'block';
        }
    },

    // Create particle background for auth screen
    createParticleBackground() {
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles';
        const authScreen = document.querySelector('.auth-screen');
        if (authScreen) {
            authScreen.appendChild(particlesContainer);
            
            // Create particles
            for (let i = 0; i < 15; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                
                // Random properties
                const size = Math.random() * 60 + 20;
                const left = Math.random() * 100;
                const top = Math.random() * 100;
                const delay = Math.random() * 5;
                const duration = Math.random() * 3 + 4;
                
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.left = `${left}%`;
                particle.style.top = `${top}%`;
                particle.style.animationDelay = `${delay}s`;
                particle.style.animationDuration = `${duration}s`;
                particle.style.opacity = Math.random() * 0.3 + 0.1;
                
                particlesContainer.appendChild(particle);
            }
        }
    },

    // Attach authentication events
    attachAuthEvents() {
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuthentication();
            });
        }

        // Auto-format employee ID
        const employeeIdInput = document.getElementById('userEmployeeId');
        if (employeeIdInput) {
            employeeIdInput.addEventListener('input', (e) => {
                let value = e.target.value.toUpperCase();
                if (!value.startsWith('SLL-')) {
                    value = 'SLL-' + value.replace('SLL-', '');
                }
                e.target.value = value;
            });
        }
    },

    // Handle authentication
    handleAuthentication() {
        const fullName = document.getElementById('userFullName').value.trim();
        const employeeId = document.getElementById('userEmployeeId').value.trim().toUpperCase();
        const password = document.getElementById('userPassword').value;

        // Validate inputs
        if (!fullName || !employeeId || !password) {
            this.showAuthMessage('Please fill all fields', 'error');
            return;
        }

        // Validate employee ID format
        if (!employeeId.match(/^SLL-\d+$/)) {
            this.showAuthMessage('Please enter a valid Employee ID (SLL-XXXXX)', 'error');
            return;
        }

        // Check password
        if (password !== this.authPassword) {
            this.showAuthMessage('Invalid password. Please contact your manager.', 'error');
            return;
        }

        // Save user session
        this.currentUser = {
            fullName: fullName,
            employeeId: employeeId,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem('rosterViewerUser', JSON.stringify(this.currentUser));
        localStorage.setItem('rosterViewerAuth', 'true');

        this.showAuthMessage('Access granted! Loading roster...', 'success');
        
        setTimeout(() => {
            this.showAppScreen();
        }, 1000);
    },

    // Show authentication message
    showAuthMessage(message, type) {
        const messageEl = document.getElementById('authMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `auth-message ${type}`;
            messageEl.style.display = 'block';
            
            // Auto-hide success messages
            if (type === 'success') {
                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 3000);
            }
        }
    },

    // Logout function
    logout() {
        localStorage.removeItem('rosterViewerUser');
        localStorage.removeItem('rosterViewerAuth');
        this.currentUser = null;
        
        // Clear form fields
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.reset();
        }
        
        // Clear any auth messages
        this.showAuthMessage('', '');
        
        this.showAuthScreen();
    },

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
};

// Make AUTH globally available
window.AUTH = AUTH;