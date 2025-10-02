// Calendar functionality
const CALENDAR = {
    currentDate: new Date(),
    selectedDate: null,
    initialized: false,

    // Initialize calendar
    init() {
        if (this.initialized) {
            console.log('Calendar already initialized');
            return;
        }
        
        try {
            console.log('Initializing calendar...');
            this.renderCalendar();
            this.attachEventListeners();
            this.initialized = true;
            console.log('Calendar module initialized successfully');
        } catch (error) {
            console.error('Error initializing calendar:', error);
        }
    },

    // Render calendar
    renderCalendar() {
        const calendarDates = document.getElementById('calendar-dates');
        if (!calendarDates) {
            console.warn('Calendar dates element not found');
            return;
        }
        
        calendarDates.innerHTML = '';
        
        // Days of the week headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            calendarDates.appendChild(dayElement);
        });
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Update month display
        const currentMonthElement = document.getElementById('current-month');
        if (currentMonthElement) {
            currentMonthElement.textContent = this.currentDate.toLocaleString('default', { 
                month: 'long', 
                year: 'numeric' 
            });
        }
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-date other-month';
            calendarDates.appendChild(emptyCell);
        }
        
        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateCell = document.createElement('div');
            dateCell.className = 'calendar-date';
            dateCell.textContent = day;
            
            // Check if this is today
            const today = new Date();
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dateCell.classList.add('current-day');
            }
            
            // Check if this is the selected date
            if (this.selectedDate && 
                year === this.selectedDate.getFullYear() && 
                month === this.selectedDate.getMonth() && 
                day === this.selectedDate.getDate()) {
                dateCell.classList.add('selected-date');
            }
            
            // Add click event
            dateCell.addEventListener('click', () => {
                this.selectDate(new Date(year, month, day));
            });
            
            calendarDates.appendChild(dateCell);
        }
        
        // Fill remaining cells
        const totalCells = 42;
        const filledCells = startingDay + daysInMonth;
        const remainingCells = totalCells - filledCells;
        
        for (let i = 0; i < remainingCells; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-date other-month';
            calendarDates.appendChild(emptyCell);
        }
    },

    // Select date
    async selectDate(date) {
        this.selectedDate = date;
        
        // Format date to match CSV headers
        const day = date.getDate();
        const month = date.toLocaleString('en-US', { month: 'short' });
        const dateString = `${day}${month}`;
        
        // Find matching date in headers
        const dateLabel = UTILS.findMatchingDate(dateString, DATA_LOADER.dateHeaders);
        
        // Get shift for selected date
        if (MAIN.currentEmployee) {
            const shiftCode = DATA_LOADER.getShiftForDate(MAIN.currentEmployee, dateLabel);
            const shiftText = UTILS.getShiftDisplay(shiftCode);
            
            // Display shift result
            const shiftDisplay = document.getElementById('shiftDisplay');
            const shiftResult = document.getElementById('shiftResult');
            const shiftOriginal = document.getElementById('shiftOriginal');
		const event = new CustomEvent('calendarDateSelected', {
        detail: {
            date: dateLabel,
            formattedDate: date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            shift: DATA_LOADER.getShiftForDate(MAIN.currentEmployee, dateLabel),
            shiftDisplay: UTILS.getShiftDisplay(DATA_LOADER.getShiftForDate(MAIN.currentEmployee, dateLabel))
        }
    });
    document.dispatchEvent(event);
            
            if (shiftDisplay && shiftResult && shiftOriginal) {
                shiftDisplay.textContent = shiftText;
                shiftDisplay.className = 'shift-time ' + (shiftText === 'OFF' || 
                                  shiftText.includes('Leave') ? 'no-shift' : '');
                
                // Show the selected date
                const formattedDate = date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                document.querySelector('#shiftResult h3').textContent = `Shift for ${formattedDate}`;
                
                // Check if shift is modified and show comparison
                await this.showScheduleComparison(MAIN.currentEmployee.id, dateLabel, shiftOriginal, shiftDisplay);
                
                shiftResult.style.display = 'block';
            }
        }
        
        // Re-render calendar
        this.renderCalendar();
    },

    // Show schedule comparison for selected date
    async showScheduleComparison(employeeId, dateLabel, shiftOriginalElement, shiftDisplayElement) {
        try {
            const response = await fetch('/admin/api/get-employee-shift-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employeeId: employeeId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const dateIndex = data.headers.indexOf(dateLabel);
                
                if (dateIndex !== -1) {
                    const googleShift = data.google_schedule[dateIndex] || '';
                    const adminShift = data.admin_schedule[dateIndex] || '';
                    
                    if (googleShift && adminShift && googleShift !== adminShift) {
                        const originalText = UTILS.getShiftDisplay(googleShift);
                        const currentText = UTILS.getShiftDisplay(adminShift);
                        
                        shiftOriginalElement.innerHTML = `
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
                        shiftOriginalElement.style.display = 'block';
                        shiftDisplayElement.classList.add('modified-shift');
                    } else {
                        shiftOriginalElement.style.display = 'none';
                        shiftDisplayElement.classList.remove('modified-shift');
                    }
                } else {
                    shiftOriginalElement.style.display = 'none';
                    shiftDisplayElement.classList.remove('modified-shift');
                }
            }
        } catch (error) {
            console.error('Error loading shift history for calendar:', error);
            shiftOriginalElement.style.display = 'none';
            shiftDisplayElement.classList.remove('modified-shift');
        }
    },

    // Reset calendar
    reset() {
        this.currentDate = new Date();
        this.selectedDate = null;
        const shiftResult = document.getElementById('shiftResult');
        const calendar = document.getElementById('calendar');
        
        if (shiftResult) shiftResult.style.display = 'none';
        if (calendar) calendar.style.display = 'none';
        
        this.renderCalendar();
    },

    // Attach event listeners
    attachEventListeners() {
        const prevMonthButton = document.getElementById('prev-month');
        const nextMonthButton = document.getElementById('next-month');
        const calendarToggleBtn = document.getElementById('calendarToggleBtn');
        
        if (prevMonthButton) {
            prevMonthButton.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderCalendar();
            });
        } else {
            console.warn('Previous month button not found');
        }
        
        if (nextMonthButton) {
            nextMonthButton.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderCalendar();
            });
        } else {
            console.warn('Next month button not found');
        }
        
        if (calendarToggleBtn) {
            calendarToggleBtn.addEventListener('click', () => {
                const calendar = document.getElementById('calendar');
                if (calendar) {
                    if (calendar.style.display === 'none' || !calendar.style.display) {
                        calendar.style.display = 'block';
                        calendarToggleBtn.innerHTML = '<span>📅</span> Hide Calendar';
                    } else {
                        calendar.style.display = 'none';
                        calendarToggleBtn.innerHTML = '<span>📅</span> Check Shift for Specific Date';
                    }
                }
            });
            console.log('Calendar toggle button event listener attached');
        } else {
            console.warn('Calendar toggle button not found');
        }
    }
};