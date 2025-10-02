// Main application logic - Updated for Admin Panel Data Source with Previous Schedule Display
const MAIN = {
    currentEmployee: null,
    calendarInitialized: false,

    // Initialize application
    async initializeApp() {
        try {
            this.showLoadingState();
            
            // Initial data load from admin panel
            await SYNC.syncData();
            
            // Initialize modules
            SEARCH.populateTeamDropdown();
            SEARCH.populateEmployeeDropdown();
            SEARCH.init();
            SYNC.init();
            
            // Update date labels
            this.updateDateLabels();
            
            // Hide loading and show app
            this.hideLoadingState();
            
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.error('Error initializing application:', error);
            this.showErrorState();
        }
    },

    // Initialize calendar AFTER authentication and employee data is loaded
    initializeCalendar() {
        if (this.calendarInitialized) return;
        
        try {
            CALENDAR.init();
            this.calendarInitialized = true;
            console.log('Calendar initialized successfully');
        } catch (error) {
            console.error('Error initializing calendar:', error);
        }
    },

    // Show loading state
    showLoadingState() {
        const loadingMessage = document.getElementById('loadingMessage');
        const errorMessage = document.getElementById('errorMessage');
        const appContent = document.getElementById('appContent');
        
        if (loadingMessage) loadingMessage.style.display = 'block';
        if (errorMessage) errorMessage.style.display = 'none';
        if (appContent) appContent.style.display = 'none';
    },

    // Hide loading state
    hideLoadingState() {
        const loadingMessage = document.getElementById('loadingMessage');
        const appContent = document.getElementById('appContent');
        
        if (loadingMessage) loadingMessage.style.display = 'none';
        if (appContent) appContent.style.display = 'block';
    },

    // Show error state
    showErrorState() {
        const loadingMessage = document.getElementById('loadingMessage');
        const errorMessage = document.getElementById('errorMessage');
        const appContent = document.getElementById('appContent');
        
        if (loadingMessage) loadingMessage.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'block';
        if (appContent) appContent.style.display = 'none';
    },

    // Update date labels
    updateDateLabels() {
        const dates = DATA_LOADER.getDateLabels();
        const todayLabel = document.getElementById('todayLabel');
        const tomorrowLabel = document.getElementById('tomorrowLabel');
        
        if (todayLabel) todayLabel.textContent = `Today (${dates.today}):`;
        if (tomorrowLabel) tomorrowLabel.textContent = `Tomorrow (${dates.tomorrow}):`;
    },

    // Display employee information
    async displayEmployeeInfo(employee) {
        if (!employee) return;
        
        this.currentEmployee = employee;
        

// Initialize schedule requests after employee is loaded
if (typeof SCHEDULE_REQUESTS !== 'undefined') {
    SCHEDULE_REQUESTS.init(employee);
}
        // Initialize calendar if not already done
        this.initializeCalendar();
        
        // Update display
        const empName = document.getElementById('empName');
        const empId = document.getElementById('empId');
        const empCategory = document.getElementById('empCategory');
        
        if (empName) empName.textContent = employee.name;
        if (empId) empId.textContent = employee.id;
        if (empCategory) empCategory.textContent = employee.currentTeam || 'Multiple Teams';
        
        // Get current date labels
        const dates = DATA_LOADER.getDateLabels();
        
        // Update date labels
        const todayLabel = document.getElementById('todayLabel');
        const tomorrowLabel = document.getElementById('tomorrowLabel');
        
        if (todayLabel) todayLabel.textContent = `Today (${dates.today}):`;
        if (tomorrowLabel) tomorrowLabel.textContent = `Tomorrow (${dates.tomorrow}):`;
        
        // Get shift details
        const todayShiftCode = DATA_LOADER.getShiftForDate(employee, dates.today);
        const tomorrowShiftCode = DATA_LOADER.getShiftForDate(employee, dates.tomorrow);
        
        const todayShiftText = UTILS.getShiftDisplay(todayShiftCode);
        const tomorrowShiftText = UTILS.getShiftDisplay(tomorrowShiftCode);
        
        // Update shift displays
        const todayShift = document.getElementById('todayShift');
        const tomorrowShift = document.getElementById('tomorrowShift');
        
        if (todayShift) todayShift.textContent = todayShiftText;
        if (tomorrowShift) tomorrowShift.textContent = tomorrowShiftText;
        
        // Check if shifts are modified and show previous schedule
        await this.displayPreviousSchedule(employee, dates);
        
        // Update shift classes
        if (todayShift) {
            todayShift.className = 'shift-code ' + (todayShiftText === 'OFF' || 
                                todayShiftText.includes('Leave') ? 'off' : 'work');
        }
        
        if (tomorrowShift) {
            tomorrowShift.className = 'shift-code ' + (tomorrowShiftText === 'OFF' || 
                                  tomorrowShiftText.includes('Leave') ? 'off' : 'work');
        }
        
        // Show panel and calendar container
        const shiftsPanel = document.getElementById('shiftsPanel');
        const calendarContainer = document.getElementById('calendarContainer');
        
        if (shiftsPanel) shiftsPanel.style.display = 'block';
        if (calendarContainer) calendarContainer.style.display = 'block';
        
        // Reset calendar state
        CALENDAR.reset();
    },

    // Display previous schedule information
    async displayPreviousSchedule(employee, dates) {
        try {
            const response = await fetch('/admin/api/get-employee-shift-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employeeId: employee.id
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateScheduleComparison(data, dates);
            }
        } catch (error) {
            console.error('Error loading shift history:', error);
        }
    },

    // Update schedule comparison display
    updateScheduleComparison(data, dates) {
        const todayIndex = data.headers.indexOf(dates.today);
        const tomorrowIndex = data.headers.indexOf(dates.tomorrow);
        
        // Reset previous displays
        const todayOriginal = document.getElementById('todayOriginal');
        const tomorrowOriginal = document.getElementById('tomorrowOriginal');
        const todayShift = document.getElementById('todayShift');
        const tomorrowShift = document.getElementById('tomorrowShift');
        
        if (todayOriginal) todayOriginal.style.display = 'none';
        if (tomorrowOriginal) tomorrowOriginal.style.display = 'none';
        if (todayShift) todayShift.classList.remove('modified-shift');
        if (tomorrowShift) tomorrowShift.classList.remove('modified-shift');
        
        // Today's shift comparison
        if (todayIndex !== -1) {
            const googleShiftToday = data.google_schedule[todayIndex] || '';
            const adminShiftToday = data.admin_schedule[todayIndex] || '';
            
            if (googleShiftToday && adminShiftToday && googleShiftToday !== adminShiftToday) {
                if (todayOriginal && todayShift) {
                    const originalText = UTILS.getShiftDisplay(googleShiftToday);
                    const currentText = UTILS.getShiftDisplay(adminShiftToday);
                    todayOriginal.innerHTML = `
                        <div class="schedule-comparison">
                            <div class="previous-schedule">
                                <span class="schedule-label">Previous Schedule:</span>
                                <span class="schedule-time">${originalText}</span>
                            </div>
                            <div class="updated-schedule">
                                <span class="schedule-label">Updated Schedule:</span>
                                <span class="schedule-time">${currentText}</span>
                            </div>
                        </div>
                    `;
                    todayOriginal.style.display = 'block';
                    todayShift.classList.add('modified-shift');
                }
            }
        }
        
        // Tomorrow's shift comparison
        if (tomorrowIndex !== -1) {
            const googleShiftTomorrow = data.google_schedule[tomorrowIndex] || '';
            const adminShiftTomorrow = data.admin_schedule[tomorrowIndex] || '';
            
            if (googleShiftTomorrow && adminShiftTomorrow && googleShiftTomorrow !== adminShiftTomorrow) {
                if (tomorrowOriginal && tomorrowShift) {
                    const originalText = UTILS.getShiftDisplay(googleShiftTomorrow);
                    const currentText = UTILS.getShiftDisplay(adminShiftTomorrow);
                    tomorrowOriginal.innerHTML = `
                        <div class="schedule-comparison">
                            <div class="previous-schedule">
                                <span class="schedule-label">Previous Schedule:</span>
                                <span class="schedule-time">${originalText}</span>
                            </div>
                            <div class="updated-schedule">
                                <span class="schedule-label">Updated Schedule:</span>
                                <span class="schedule-time">${currentText}</span>
                            </div>
                        </div>
                    `;
                    tomorrowOriginal.style.display = 'block';
                    tomorrowShift.classList.add('modified-shift');
                }
            }
        }
    },

    // Hide shifts panel
    hideShiftsPanel() {
        const shiftsPanel = document.getElementById('shiftsPanel');
        const calendarContainer = document.getElementById('calendarContainer');
        
        if (shiftsPanel) shiftsPanel.style.display = 'none';
        if (calendarContainer) calendarContainer.style.display = 'none';
        
        // Reset previous schedule displays
        const todayOriginal = document.getElementById('todayOriginal');
        const tomorrowOriginal = document.getElementById('tomorrowOriginal');
        const todayShift = document.getElementById('todayShift');
        const tomorrowShift = document.getElementById('tomorrowShift');
        
        if (todayOriginal) todayOriginal.style.display = 'none';
        if (tomorrowOriginal) tomorrowOriginal.style.display = 'none';
        if (todayShift) todayShift.classList.remove('modified-shift');
        if (tomorrowShift) tomorrowShift.classList.remove('modified-shift');
    },

    // Initialize shift selection modal
    initShiftModal() {
        const shiftSelectBtn = document.getElementById('shiftSelectBtn');
        const shiftModal = document.getElementById('shiftModal');
        const shiftModalClose = document.getElementById('shiftModalClose');
        
        if (shiftSelectBtn) {
            shiftSelectBtn.addEventListener('click', () => {
                if (shiftModal) {
                    shiftModal.style.display = 'flex';
                    this.populateShiftOptions();
                }
            });
        }
        
        if (shiftModalClose) {
            shiftModalClose.addEventListener('click', () => {
                if (shiftModal) shiftModal.style.display = 'none';
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (shiftModal && e.target === shiftModal) {
                shiftModal.style.display = 'none';
            }
        });
    },

    // Populate shift options in modal
    populateShiftOptions() {
        const shiftOptions = document.getElementById('shiftOptions');
        if (!shiftOptions) return;
        
        shiftOptions.innerHTML = '';
        
        // Create shift options from SHIFT_MAP
        const uniqueShifts = new Set();
        
        for (const [code, label] of Object.entries(UTILS.SHIFT_MAP)) {
            if (code && !uniqueShifts.has(label)) {
                uniqueShifts.add(label);
                
                const option = document.createElement('div');
                option.className = 'shift-option';
                option.textContent = label;
                option.dataset.code = code;
                
                option.addEventListener('click', function() {
                    // Remove selected class from all options
                    document.querySelectorAll('.shift-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    
                    // Add selected class to clicked option
                    this.classList.add('selected');
                    
                    // Get employees for this shift
                    MAIN.showEmployeesForShift(code);
                });
                
                shiftOptions.appendChild(option);
            }
        }
        
        // Add Evening Shift option
        const eveningOption = document.createElement('div');
        eveningOption.className = 'shift-option';
        eveningOption.textContent = "Evening Shift (12 PM – 10 PM)";
        eveningOption.dataset.code = "EVENING";
        
        eveningOption.addEventListener('click', function() {
            document.querySelectorAll('.shift-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            this.classList.add('selected');
            MAIN.showEmployeesForEveningShift();
        });
        
        shiftOptions.appendChild(eveningOption);
    },

    // Show employees for selected shift
    showEmployeesForShift(shiftCode) {
        const dates = DATA_LOADER.getDateLabels();
        const employees = this.getEmployeesForShift(shiftCode, dates.today);
        this.displayShiftEmployees(employees);
    },

    // Show employees for evening shift
    showEmployeesForEveningShift() {
        const dates = DATA_LOADER.getDateLabels();
        const employees = this.getEmployeesForEveningShift(dates.today);
        this.displayShiftEmployees(employees, true);
    },

    // Get employees for specific shift
    getEmployeesForShift(shiftCode, dateLabel) {
        const employees = [];
        
        for (const team in DATA_LOADER.teamsData) {
            DATA_LOADER.teamsData[team].forEach(emp => {
                const empShift = DATA_LOADER.getShiftForDate(emp, dateLabel);
                if (empShift === shiftCode) {
                    employees.push({
                        name: emp.name,
                        id: emp.id,
                        team: emp.currentTeam || team
                    });
                }
            });
        }
        
        return employees;
    },

    // Get employees for evening shift
    getEmployeesForEveningShift(dateLabel) {
        const employees = [];
        
        for (const team in DATA_LOADER.teamsData) {
            DATA_LOADER.teamsData[team].forEach(emp => {
                const empShift = DATA_LOADER.getShiftForDate(emp, dateLabel);
                if (empShift === "D1" || empShift === "D2") {
                    employees.push({
                        name: emp.name,
                        id: emp.id,
                        team: emp.currentTeam || team,
                        shift: empShift
                    });
                }
            });
        }
        
        return employees;
    },

    // Display employees in modal
    displayShiftEmployees(employees, isEveningShift = false) {
        const shiftEmployeesList = document.getElementById('shiftEmployeesList');
        const noEmployeesMessage = document.getElementById('noEmployeesMessage');
        
        if (!shiftEmployeesList || !noEmployeesMessage) return;
        
        shiftEmployeesList.innerHTML = '';
        
        if (employees.length === 0) {
            noEmployeesMessage.style.display = 'block';
            shiftEmployeesList.style.display = 'none';
            return;
        }
        
        noEmployeesMessage.style.display = 'none';
        shiftEmployeesList.style.display = 'block';
        
        employees.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'shift-employee-item';
            
            let shiftInfo = '';
            if (isEveningShift && emp.shift) {
                const shiftLabel = UTILS.getShiftDisplay(emp.shift);
                shiftInfo = `<div class="employee-id">${emp.id} (${shiftLabel})</div>`;
            } else {
                shiftInfo = `<div class="employee-id">${emp.id}</div>`;
            }
            
            item.innerHTML = `
                <div>
                    <div class="shift-employee-name">${emp.name}</div>
                    <div class="shift-employee-team">${emp.team}</div>
                </div>
                ${shiftInfo}
            `;
            
            shiftEmployeesList.appendChild(item);
        });
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // AUTH will handle the main initialization after login
    AUTH.init();
});