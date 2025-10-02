// Dashboard functionality for statistics and insights
const DASHBOARD = {
    currentEmployeeId: null,
    holidays: [],
    shiftChanges: [],
    upcomingShifts: [],
    timeOff: [],

    async init(employeeId) {
        this.currentEmployeeId = employeeId;
        this.attachCardEvents();
        await this.loadDashboardData();
        this.updateDashboardDisplay();
    },

    attachCardEvents() {
        // Toggle card details on click
        const cards = document.querySelectorAll('.stat-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't toggle if clicking on details area
                if (e.target.closest('.stat-details')) return;
                
                // Close other cards
                cards.forEach(c => {
                    if (c !== card) c.classList.remove('active');
                });
                
                // Toggle current card
                card.classList.toggle('active');
            });
        });
    },

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadHolidays(),
                this.loadShiftChanges(),
                this.loadUpcomingShifts(),
                this.loadTimeOff()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    },

    async loadHolidays() {
        try {
            // Sample holiday data - in real app, this would come from your API
            this.holidays = [
                { date: '2024-12-25', name: 'Christmas Day' },
                { date: '2024-12-26', name: 'Boxing Day' },
                { date: '2025-01-01', name: 'New Year\'s Day' },
                { date: '2025-01-26', name: 'Republic Day' },
                { date: '2025-03-08', name: 'Holi' },
                { date: '2025-04-14', name: 'Ambedkar Jayanti' }
            ].filter(holiday => {
                const holidayDate = new Date(holiday.date);
                const today = new Date();
                const ninetyDaysLater = new Date();
                ninetyDaysLater.setDate(today.getDate() + 90);
                return holidayDate >= today && holidayDate <= ninetyDaysLater;
            });
        } catch (error) {
            console.error('Error loading holidays:', error);
            this.holidays = [];
        }
    },

    async loadShiftChanges() {
        try {
            if (!this.currentEmployeeId) return;

            // Get employee shift history from backend
            const response = await fetch('/admin/api/get-employee-shift-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employeeId: this.currentEmployeeId
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.shiftChanges = this.analyzeShiftChanges(data);
            }
        } catch (error) {
            console.error('Error loading shift changes:', error);
            this.shiftChanges = [];
        }
    },

    analyzeShiftChanges(data) {
        const changes = [];
        const today = new Date();
        
        // Check next 30 days for shift changes
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            const dateStr = this.formatDateForHeader(date);
            
            const dateIndex = data.headers.indexOf(dateStr);
            if (dateIndex !== -1) {
                const googleShift = data.google_schedule[dateIndex] || '';
                const adminShift = data.admin_schedule[dateIndex] || '';
                
                if (googleShift && adminShift && googleShift !== adminShift) {
                    changes.push({
                        date: dateStr,
                        original: UTILS.getShiftDisplay(googleShift),
                        current: UTILS.getShiftDisplay(adminShift),
                        dateObj: new Date(date)
                    });
                }
            }
        }
        
        return changes;
    },

    async loadUpcomingShifts() {
        try {
            if (!this.currentEmployeeId) return;

            const employee = SEARCH.findEmployeeById(this.currentEmployeeId);
            if (!employee) return;

            this.upcomingShifts = [];
            const today = new Date();
            const headers = DATA_LOADER.dateHeaders || [];
            
            // Get next 30 days of work shifts
            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(today.getDate() + i);
                const dateStr = this.formatDateForHeader(date);
                
                if (headers.includes(dateStr)) {
                    const dateIndex = headers.indexOf(dateStr);
                    const shiftCode = employee.schedule[dateIndex];
                    
                    if (shiftCode && shiftCode !== 'DO' && shiftCode !== '') {
                        this.upcomingShifts.push({
                            date: dateStr,
                            shift: UTILS.getShiftDisplay(shiftCode),
                            dateObj: new Date(date)
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error loading upcoming shifts:', error);
            this.upcomingShifts = [];
        }
    },

    async loadTimeOff() {
        try {
            if (!this.currentEmployeeId) return;

            const employee = SEARCH.findEmployeeById(this.currentEmployeeId);
            if (!employee) return;

            this.timeOff = [];
            const today = new Date();
            const headers = DATA_LOADER.dateHeaders || [];
            
            // Find OFF days in the next 90 days
            for (let i = 0; i < 90; i++) {
                const date = new Date();
                date.setDate(today.getDate() + i);
                const dateStr = this.formatDateForHeader(date);
                
                if (headers.includes(dateStr)) {
                    const dateIndex = headers.indexOf(dateStr);
                    const shiftCode = employee.schedule[dateIndex];
                    
                    if (shiftCode === 'DO' || shiftCode === '') {
                        // Check if it's a weekend
                        const dayOfWeek = date.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        
                        if (!isWeekend) {
                            this.timeOff.push({
                                date: dateStr,
                                type: 'Time Off',
                                dateObj: new Date(date)
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error loading time off:', error);
            this.timeOff = [];
        }
    },

    updateDashboardDisplay() {
        this.updateHolidaysDisplay();
        this.updateShiftChangesDisplay();
        this.updateUpcomingShiftsDisplay();
        this.updateTimeOffDisplay();
    },

    updateHolidaysDisplay() {
        const countElement = document.getElementById('holidaysCount');
        const listElement = document.getElementById('holidaysList');
        
        if (countElement) countElement.textContent = this.holidays.length;
        
        if (listElement) {
            if (this.holidays.length > 0) {
                listElement.innerHTML = this.holidays.map(holiday => `
                    <div class="holiday-item">
                        <div class="holiday-date">${this.formatDisplayDate(holiday.date)}</div>
                        <div class="holiday-name">${holiday.name}</div>
                    </div>
                `).join('');
            } else {
                listElement.innerHTML = '<div class="empty-state">No upcoming holidays in next 90 days</div>';
            }
        }
    },

    updateShiftChangesDisplay() {
        const countElement = document.getElementById('shiftChangesCount');
        const listElement = document.getElementById('shiftChangesList');
        
        if (countElement) countElement.textContent = this.shiftChanges.length;
        
        if (listElement) {
            if (this.shiftChanges.length > 0) {
                listElement.innerHTML = this.shiftChanges.slice(0, 5).map(change => `
                    <div class="shift-change-item">
                        <div class="shift-change-date">${this.formatDisplayDate(change.dateObj)}</div>
                        <div class="shift-change-info">
                            ${change.original} → ${change.current}
                        </div>
                    </div>
                `).join('');
            } else {
                listElement.innerHTML = '<div class="empty-state">No shift changes detected in next 30 days</div>';
            }
        }
    },

    updateUpcomingShiftsDisplay() {
        const countElement = document.getElementById('upcomingShiftsCount');
        const listElement = document.getElementById('upcomingShiftsList');
        
        if (countElement) countElement.textContent = this.upcomingShifts.length;
        
        if (listElement) {
            if (this.upcomingShifts.length > 0) {
                listElement.innerHTML = this.upcomingShifts.slice(0, 5).map(shift => `
                    <div class="detail-item">
                        <div class="detail-date">${this.formatDisplayDate(shift.dateObj)}</div>
                        <div class="detail-shift work">${shift.shift}</div>
                    </div>
                `).join('');
            } else {
                listElement.innerHTML = '<div class="empty-state">No upcoming work days in next 30 days</div>';
            }
        }
    },

    updateTimeOffDisplay() {
        const countElement = document.getElementById('timeOffCount');
        const listElement = document.getElementById('timeOffList');
        
        if (countElement) countElement.textContent = this.timeOff.length;
        
        if (listElement) {
            if (this.timeOff.length > 0) {
                listElement.innerHTML = this.timeOff.slice(0, 5).map(day => `
                    <div class="timeoff-item">
                        <div class="timeoff-date">${this.formatDisplayDate(day.dateObj)}</div>
                        <div class="timeoff-type">${day.type}</div>
                    </div>
                `).join('');
            } else {
                listElement.innerHTML = '<div class="empty-state">No planned time off in next 90 days</div>';
            }
        }
    },

    formatDateForHeader(date) {
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        return `${day}${month}`;
    },

    formatDisplayDate(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    }
};

// Make dashboard globally available
window.DASHBOARD = DASHBOARD;