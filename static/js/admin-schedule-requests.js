// admin-schedule-requests.js - Admin schedule requests management
const ADMIN_SCHEDULE_REQUESTS = {
    pendingRequests: [],
    stats: {},
    
    // Shift mapping for admin side
    SHIFT_MAP: {
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

    // Initialize admin schedule requests
    init() {
        console.log('Initializing admin schedule requests...');
        this.attachEventListeners();
        console.log('Admin schedule requests initialized');
    },

    // Attach event listeners
    attachEventListeners() {
        console.log('Attaching event listeners...');
        
        // Use event delegation for dynamic elements
        document.addEventListener('click', (e) => {
            // Refresh button
            if (e.target.id === 'refreshRequests') {
                console.log('Refresh button clicked');
                this.loadPendingRequests();
            }
            
            // Approve buttons
            if (e.target.classList.contains('approve-btn')) {
                const requestId = e.target.dataset.requestId;
                console.log('Approve button clicked for:', requestId);
                this.updateRequestStatus(requestId, 'approved');
            }
            
            // Reject buttons
            if (e.target.classList.contains('reject-btn')) {
                const requestId = e.target.dataset.requestId;
                console.log('Reject button clicked for:', requestId);
                this.updateRequestStatus(requestId, 'rejected');
            }
        });

        // Filter change
        document.addEventListener('change', (e) => {
            if (e.target.id === 'requestsFilter') {
                console.log('Filter changed to:', e.target.value);
                this.filterRequests(e.target.value);
            }
        });
    },

    // Load pending requests
    async loadPendingRequests() {
        console.log('Loading pending requests...');
        
        // Show loading state
        const requestsList = document.getElementById('requestsList');
        if (requestsList) {
            requestsList.innerHTML = '<div class="loading-message">Loading requests...</div>';
        }

        try {
            const response = await fetch('/admin/api/schedule-requests/get-pending');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Requests data received:', data);

            if (data.success) {
                this.pendingRequests = data.pending_requests || [];
                this.stats = data.stats || {};
                console.log(`Loaded ${this.pendingRequests.length} pending requests`);
                this.updateStatsDisplay();
                this.renderRequestsList();
            } else {
                console.error('Error loading requests:', data.error);
                this.showError('Failed to load requests: ' + data.error);
            }
        } catch (error) {
            console.error('Error loading requests:', error);
            this.showError('Error loading requests. Please check console for details.');
        }
    },

    // Update statistics display
    updateStatsDisplay() {
        console.log('Updating stats display:', this.stats);
        
        const pendingEl = document.getElementById('pendingRequestsCount');
        const approvedEl = document.getElementById('approvedRequestsCount');
        const shiftChangesEl = document.getElementById('totalShiftChanges');
        const swapsEl = document.getElementById('totalSwaps');
        
        if (pendingEl) pendingEl.textContent = this.stats.pending_count || 0;
        if (approvedEl) approvedEl.textContent = this.stats.approved_count || 0;
        if (shiftChangesEl) shiftChangesEl.textContent = this.stats.total_shift_change || 0;
        if (swapsEl) swapsEl.textContent = this.stats.total_swap || 0;
    },

    // Render requests list
    renderRequestsList(filter = 'all') {
        const requestsList = document.getElementById('requestsList');
        if (!requestsList) {
            console.error('Requests list element not found');
            return;
        }

        let filteredRequests = this.pendingRequests;

        if (filter === 'shift_change') {
            filteredRequests = this.pendingRequests.filter(req => req.type === 'shift_change');
        } else if (filter === 'swap') {
            filteredRequests = this.pendingRequests.filter(req => req.type === 'swap');
        } else if (filter === 'pending') {
            filteredRequests = this.pendingRequests.filter(req => req.status === 'pending');
        }

        console.log(`Rendering ${filteredRequests.length} requests with filter: ${filter}`);

        if (filteredRequests.length === 0) {
            requestsList.innerHTML = `
                <div class="no-requests">
                    <p>No requests found</p>
                    <p>All schedule change requests will appear here</p>
                </div>
            `;
            return;
        }

        requestsList.innerHTML = filteredRequests.map(request => this.renderRequestItem(request)).join('');
        
        console.log('Requests list rendered successfully');
    },

    // Render single request item
    renderRequestItem(request) {
        const isShiftChange = request.type === 'shift_change';
        const createdDate = new Date(request.created_at).toLocaleDateString();
        
        return `
            <div class="request-item" data-request-id="${request.id}">
                <div class="request-header">
                    <div class="request-type ${request.type}">
                        ${isShiftChange ? '📅 Shift Change' : '🔄 Swap Request'}
                    </div>
                    <div class="request-date">Submitted: ${createdDate}</div>
                </div>
                
                <div class="request-details">
                    ${isShiftChange ? this.renderShiftChangeDetails(request) : this.renderSwapDetails(request)}
                </div>
                
                <div class="request-reason">
                    <strong>Reason:</strong> ${request.reason}
                </div>
                
                <div class="request-actions">
                    <button class="action-btn success approve-btn" data-request-id="${request.id}">
                        ✅ Approve
                    </button>
                    <button class="action-btn danger reject-btn" data-request-id="${request.id}">
                        ❌ Reject
                    </button>
                </div>
            </div>
        `;
    },

    // Render shift change details
    renderShiftChangeDetails(request) {
        return `
            <div class="employee-info">
                <strong>Employee:</strong> ${request.employee_name} (${request.employee_id})
            </div>
            <div class="shift-change-details">
                <div class="shift-from-to">
                    <span class="shift-from">${this.getShiftDisplay(request.current_shift)}</span>
                    <span class="shift-arrow">→</span>
                    <span class="shift-to">${this.getShiftDisplay(request.requested_shift)}</span>
                </div>
                <div class="request-date-info">
                    <strong>Date:</strong> ${request.date}
                </div>
                <div class="request-team">
                    <strong>Team:</strong> ${request.team}
                </div>
            </div>
        `;
    },

    // Render swap details
    renderSwapDetails(request) {
        return `
            <div class="swap-parties">
                <div class="swap-party">
                    <strong>Requester:</strong> ${request.requester_name} (${request.requester_id})
                    <div class="party-shift">${this.getShiftDisplay(request.requester_shift)}</div>
                </div>
                <div class="swap-arrow">⇄</div>
                <div class="swap-party">
                    <strong>Target:</strong> ${request.target_employee_name} (${request.target_employee_id})
                    <div class="party-shift">${this.getShiftDisplay(request.target_shift)}</div>
                </div>
            </div>
            <div class="request-date-info">
                <strong>Date:</strong> ${request.date}
            </div>
            <div class="request-team">
                <strong>Team:</strong> ${request.team}
            </div>
        `;
    },

    // Get shift display text
    getShiftDisplay(shiftCode) {
        return this.SHIFT_MAP[shiftCode] || shiftCode;
    },

    // Update request status
    async updateRequestStatus(requestId, status) {
        if (!confirm(`Are you sure you want to ${status} this request?`)) {
            return;
        }

        try {
            const response = await fetch('/admin/api/schedule-requests/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requestId: requestId,
                    status: status
                })
            });

            const data = await response.json();

            if (data.success) {
                alert(`Request ${status} successfully!`);
                this.loadPendingRequests(); // Reload requests
                
                // Update main dashboard stats if needed
                if (typeof ADMIN !== 'undefined' && ADMIN.loadDataStats) {
                    ADMIN.loadDataStats();
                }
            } else {
                alert('Error updating request: ' + data.error);
            }
        } catch (error) {
            console.error('Error updating request:', error);
            alert('Error updating request. Please try again.');
        }
    },

    // Filter requests
    filterRequests(filter) {
        this.renderRequestsList(filter);
    },

    // Show error message
    showError(message) {
        const requestsList = document.getElementById('requestsList');
        if (requestsList) {
            requestsList.innerHTML = `
                <div class="error-message">
                    <p>${message}</p>
                    <button onclick="ADMIN_SCHEDULE_REQUESTS.loadPendingRequests()" class="refresh-btn">Try Again</button>
                </div>
            `;
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing admin schedule requests...');
    ADMIN_SCHEDULE_REQUESTS.init();
});