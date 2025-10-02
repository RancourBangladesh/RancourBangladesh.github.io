// schedule-requests.js - Employee schedule change and swap requests
const SCHEDULE_REQUESTS = {
    currentEmployee: null,
    selectedDate: null,
    selectedShift: null,

    // Initialize schedule requests module
    init(employee) {
        this.currentEmployee = employee;
        this.attachEventListeners();
        this.createScheduleRequestModal();
        this.createSwapRequestModal();
    },

    // Attach event listeners
    attachEventListeners() {
        // Add request buttons to calendar date selection
        this.addRequestButtonsToCalendar();
        
        // Listen for calendar date selection
        document.addEventListener('calendarDateSelected', (e) => {
            this.handleDateSelection(e.detail);
        });
    },

    // Add request buttons to calendar UI
    addRequestButtonsToCalendar() {
        const calendarContainer = document.getElementById('calendarContainer');
        if (!calendarContainer) return;

        // Add request buttons section
        const requestSection = document.createElement('div');
        requestSection.className = 'request-buttons-section';
        requestSection.innerHTML = `
            <div class="request-buttons">
                <button class="request-btn shift-change-btn" id="shiftChangeBtn">
                    <span>🔄</span> Request Shift Change
                </button>
                <button class="request-btn swap-btn" id="swapRequestBtn">
                    <span>🔄</span> Request Swap
                </button>
            </div>
            <div class="request-info" id="requestInfo">
                Select a date first to make requests
            </div>
        `;

        // Insert after calendar
        const calendar = document.getElementById('calendar');
        if (calendar) {
            calendar.parentNode.insertBefore(requestSection, calendar.nextSibling);
        } else {
            calendarContainer.appendChild(requestSection);
        }

        // Attach button events
        document.getElementById('shiftChangeBtn').addEventListener('click', () => {
            this.showShiftChangeModal();
        });

        document.getElementById('swapRequestBtn').addEventListener('click', () => {
            this.showSwapRequestModal();
        });
    },

    // Handle date selection from calendar
    handleDateSelection(dateInfo) {
        this.selectedDate = dateInfo.date;
        this.selectedShift = dateInfo.shift;
        
        const requestInfo = document.getElementById('requestInfo');
        if (requestInfo) {
            requestInfo.innerHTML = `
                <strong>Selected Date:</strong> ${dateInfo.formattedDate}<br>
                <strong>Your Shift:</strong> ${dateInfo.shiftDisplay}
            `;
        }

        // Enable request buttons
        document.getElementById('shiftChangeBtn').disabled = false;
        document.getElementById('swapRequestBtn').disabled = false;
    },

    // Create shift change request modal
    createScheduleRequestModal() {
        const modal = document.createElement('div');
        modal.className = 'schedule-modal';
        modal.id = 'shiftChangeModal';
        modal.innerHTML = `
            <div class="schedule-modal-content">
                <div class="schedule-modal-header">
                    <h3>📅 Request Shift Change</h3>
                    <button class="schedule-modal-close">&times;</button>
                </div>
                <div class="schedule-modal-body">
                    <div class="request-details">
                        <div class="detail-item">
                            <label>Date:</label>
                            <span id="selectedDateDisplay">-</span>
                        </div>
                        <div class="detail-item">
                            <label>Current Shift:</label>
                            <span id="currentShiftDisplay">-</span>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="requestedShift">Requested Shift:</label>
                        <select id="requestedShift" required>
                            <option value="">Select new shift</option>
                            <option value="M2">8 AM – 5 PM (M2)</option>
                            <option value="M3">9 AM – 6 PM (M3)</option>
                            <option value="M4">10 AM – 7 PM (M4)</option>
                            <option value="D1">12 PM – 9 PM (D1)</option>
                            <option value="D2">1 PM – 10 PM (D2)</option>
                            <option value="DO">OFF (DO)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="shiftChangeReason">Reason for Change:</label>
                        <select id="shiftChangeReason" required>
                            <option value="">Select reason</option>
                            <option value="emergency">Emergency</option>
                            <option value="personal">Personal Reasons</option>
                            <option value="family">Family Issues</option>
                            <option value="health">Health Reasons</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="shiftChangeDetails">Additional Details (Optional):</label>
                        <textarea id="shiftChangeDetails" placeholder="Provide any additional information..." rows="3"></textarea>
                    </div>
                    
                    <div class="schedule-modal-actions">
                        <button type="button" class="btn-secondary" id="cancelShiftChange">Cancel</button>
                        <button type="button" class="btn-primary" id="submitShiftChange">Submit Request</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.attachShiftChangeModalEvents();
    },

    // Create swap request modal
    createSwapRequestModal() {
        const modal = document.createElement('div');
        modal.className = 'schedule-modal';
        modal.id = 'swapRequestModal';
        modal.innerHTML = `
            <div class="schedule-modal-content">
                <div class="schedule-modal-header">
                    <h3>🔄 Request Schedule Swap</h3>
                    <button class="schedule-modal-close">&times;</button>
                </div>
                <div class="schedule-modal-body">
                    <div class="request-details">
                        <div class="detail-item">
                            <label>Date:</label>
                            <span id="swapDateDisplay">-</span>
                        </div>
                        <div class="detail-item">
                            <label>Your Shift:</label>
                            <span id="yourShiftDisplay">-</span>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="teamMemberSelect">Swap With Teammate:</label>
                        <select id="teamMemberSelect" required>
                            <option value="">Select teammate</option>
                        </select>
                    </div>
                    
                    <div class="teammate-info" id="teammateInfo" style="display: none;">
                        <div class="teammate-shift">
                            <strong>Teammate's Shift:</strong> <span id="teammateShiftDisplay">-</span>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="swapReason">Reason for Swap:</label>
                        <select id="swapReason" required>
                            <option value="">Select reason</option>
                            <option value="emergency">Emergency</option>
                            <option value="personal">Personal Reasons</option>
                            <option value="family">Family Issues</option>
                            <option value="health">Health Reasons</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="swapDetails">Additional Details (Optional):</label>
                        <textarea id="swapDetails" placeholder="Provide any additional information..." rows="3"></textarea>
                    </div>
                    
                    <div class="schedule-modal-actions">
                        <button type="button" class="btn-secondary" id="cancelSwap">Cancel</button>
                        <button type="button" class="btn-primary" id="submitSwap">Submit Request</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.attachSwapModalEvents();
    },

    // Attach shift change modal events
    attachShiftChangeModalEvents() {
        const modal = document.getElementById('shiftChangeModal');
        const closeBtn = modal.querySelector('.schedule-modal-close');
        const cancelBtn = document.getElementById('cancelShiftChange');
        const submitBtn = document.getElementById('submitShiftChange');

        const closeModal = () => {
            modal.style.display = 'none';
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        submitBtn.addEventListener('click', () => {
            this.submitShiftChangeRequest();
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    },

    // Attach swap modal events
    attachSwapModalEvents() {
        const modal = document.getElementById('swapRequestModal');
        const closeBtn = modal.querySelector('.schedule-modal-close');
        const cancelBtn = document.getElementById('cancelSwap');
        const submitBtn = document.getElementById('submitSwap');
        const teamMemberSelect = document.getElementById('teamMemberSelect');

        const closeModal = () => {
            modal.style.display = 'none';
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        teamMemberSelect.addEventListener('change', (e) => {
            this.handleTeammateSelection(e.target.value);
        });

        submitBtn.addEventListener('click', () => {
            this.submitSwapRequest();
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    },

    // Show shift change modal
    showShiftChangeModal() {
        if (!this.selectedDate || !this.currentEmployee) {
            alert('Please select a date first');
            return;
        }

        const modal = document.getElementById('shiftChangeModal');
        document.getElementById('selectedDateDisplay').textContent = this.selectedDate;
        document.getElementById('currentShiftDisplay').textContent = UTILS.getShiftDisplay(this.selectedShift);
        
        modal.style.display = 'flex';
    },

    // Show swap request modal
    async showSwapRequestModal() {
        if (!this.selectedDate || !this.currentEmployee) {
            alert('Please select a date first');
            return;
        }

        const modal = document.getElementById('swapRequestModal');
        document.getElementById('swapDateDisplay').textContent = this.selectedDate;
        document.getElementById('yourShiftDisplay').textContent = UTILS.getShiftDisplay(this.selectedShift);

        // Load team members
        await this.loadTeamMembers();

        modal.style.display = 'flex';
    },

    // Load team members for swap
    async loadTeamMembers() {
        try {
            const response = await fetch('/api/schedule-requests/get-team-members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    teamName: this.currentEmployee.currentTeam,
                    currentEmployeeId: this.currentEmployee.id,
                    date: this.selectedDate
                })
            });

            const data = await response.json();

            if (data.success) {
                this.populateTeamMembers(data.teamMembers);
            } else {
                console.error('Error loading team members:', data.error);
            }
        } catch (error) {
            console.error('Error loading team members:', error);
        }
    },

    // Populate team members dropdown
    populateTeamMembers(teamMembers) {
        const select = document.getElementById('teamMemberSelect');
        select.innerHTML = '<option value="">Select teammate</option>';

        teamMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = `${member.name} (${member.shift_display})`;
            option.dataset.shift = member.shift;
            option.dataset.name = member.name;
            select.appendChild(option);
        });
    },

    // Handle teammate selection
    handleTeammateSelection(teammateId) {
        const select = document.getElementById('teamMemberSelect');
        const selectedOption = select.options[select.selectedIndex];
        const teammateInfo = document.getElementById('teammateInfo');
        const teammateShiftDisplay = document.getElementById('teammateShiftDisplay');

        if (teammateId && selectedOption.dataset.shift) {
            teammateShiftDisplay.textContent = UTILS.getShiftDisplay(selectedOption.dataset.shift);
            teammateInfo.style.display = 'block';
        } else {
            teammateInfo.style.display = 'none';
        }
    },

    // Submit shift change request
    async submitShiftChangeRequest() {
        const requestedShift = document.getElementById('requestedShift').value;
        const reason = document.getElementById('shiftChangeReason').value;
        const details = document.getElementById('shiftChangeDetails').value;

        if (!requestedShift || !reason) {
            alert('Please select a new shift and provide a reason');
            return;
        }

        if (requestedShift === this.selectedShift) {
            alert('Requested shift is the same as current shift');
            return;
        }

        const fullReason = reason + (details ? `: ${details}` : '');

        try {
            const response = await fetch('/api/schedule-requests/submit-shift-change', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employeeId: this.currentEmployee.id,
                    employeeName: this.currentEmployee.name,
                    team: this.currentEmployee.currentTeam,
                    date: this.selectedDate,
                    currentShift: this.selectedShift,
                    requestedShift: requestedShift,
                    reason: fullReason
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Shift change request submitted successfully!');
                document.getElementById('shiftChangeModal').style.display = 'none';
                this.resetForms();
            } else {
                alert('Error submitting request: ' + data.error);
            }
        } catch (error) {
            console.error('Error submitting shift change request:', error);
            alert('Error submitting request. Please try again.');
        }
    },

    // Submit swap request
    async submitSwapRequest() {
        const teammateSelect = document.getElementById('teamMemberSelect');
        const selectedTeammateId = teammateSelect.value;
        const selectedOption = teammateSelect.options[teammateSelect.selectedIndex];
        const reason = document.getElementById('swapReason').value;
        const details = document.getElementById('swapDetails').value;

        if (!selectedTeammateId || !reason) {
            alert('Please select a teammate and provide a reason');
            return;
        }

        const fullReason = reason + (details ? `: ${details}` : '');

        try {
            const response = await fetch('/api/schedule-requests/submit-swap-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requesterId: this.currentEmployee.id,
                    requesterName: this.currentEmployee.name,
                    targetEmployeeId: selectedTeammateId,
                    targetEmployeeName: selectedOption.dataset.name,
                    team: this.currentEmployee.currentTeam,
                    date: this.selectedDate,
                    requesterShift: this.selectedShift,
                    targetShift: selectedOption.dataset.shift,
                    reason: fullReason
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Swap request submitted successfully!');
                document.getElementById('swapRequestModal').style.display = 'none';
                this.resetForms();
            } else {
                alert('Error submitting request: ' + data.error);
            }
        } catch (error) {
            console.error('Error submitting swap request:', error);
            alert('Error submitting request. Please try again.');
        }
    },

    // Reset forms
    resetForms() {
        document.getElementById('requestedShift').value = '';
        document.getElementById('shiftChangeReason').value = '';
        document.getElementById('shiftChangeDetails').value = '';
        document.getElementById('teamMemberSelect').value = '';
        document.getElementById('swapReason').value = '';
        document.getElementById('swapDetails').value = '';
        document.getElementById('teammateInfo').style.display = 'none';
    }
};

// Make globally available
window.SCHEDULE_REQUESTS = SCHEDULE_REQUESTS;