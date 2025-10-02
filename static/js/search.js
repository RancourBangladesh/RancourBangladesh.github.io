// Search functionality
const SEARCH = {
    // Initialize search
    init() {
        this.attachEventListeners();
    },

    // Populate team dropdown
    populateTeamDropdown() {
        const teamSelect = document.getElementById('teamSelect');
        if (!teamSelect) return;
        
        teamSelect.innerHTML = '<option value="">-- All Categories --</option>';
        
        for (const team in DATA_LOADER.teamsData) {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            teamSelect.appendChild(option);
        }
    },

    // Populate employee dropdown
    populateEmployeeDropdown(team = '') {
        const empSelect = document.getElementById('empSelect');
        if (!empSelect) return;
        
        empSelect.innerHTML = '<option value="">-- All Employees --</option>';
        
        if (team) {
            // Show employees from specific team
            if (DATA_LOADER.teamsData[team]) {
                DATA_LOADER.teamsData[team].forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id;
                    option.textContent = `${emp.name} (${emp.id})`;
                    empSelect.appendChild(option);
                });
            }
        } else {
            // Show all employees from all teams
            const allEmployeesList = [];
            for (const team in DATA_LOADER.teamsData) {
                DATA_LOADER.teamsData[team].forEach(emp => {
                    if (!allEmployeesList.find(e => e.id === emp.id)) {
                        allEmployeesList.push(emp);
                    }
                });
            }
            
            allEmployeesList.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = `${emp.name} (${emp.id}) - ${emp.currentTeam || 'Multiple Teams'}`;
                empSelect.appendChild(option);
            });
        }
    },

    // Find employee by ID across all teams
    findEmployeeById(employeeId) {
        for (const team in DATA_LOADER.teamsData) {
            const employee = DATA_LOADER.teamsData[team].find(emp => emp.id === employeeId);
            if (employee) {
                return employee;
            }
        }
        return null;
    },

    // Handle search input
    handleSearchInput(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        const searchResults = document.getElementById('searchResults');
        
        if (!searchResults) return;
        
        searchResults.innerHTML = '';
        
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        // Filter employees by name or ID across ALL teams
        const matches = [];
        for (const team in DATA_LOADER.teamsData) {
            DATA_LOADER.teamsData[team].forEach(emp => {
                if ((emp.name.toLowerCase().includes(searchTerm) || 
                     emp.id.toLowerCase().includes(searchTerm)) &&
                    !matches.find(m => m.id === emp.id)) {
                    matches.push(emp);
                }
            });
        }
        
        if (matches.length > 0) {
            matches.forEach(emp => {
                const result = document.createElement('div');
                result.className = 'search-result';
                result.textContent = `${emp.name} (${emp.id}) - ${emp.currentTeam || 'Multiple Teams'}`;
                result.addEventListener('click', () => {
                    this.selectEmployeeFromSearch(emp);
                });
                searchResults.appendChild(result);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.style.display = 'none';
        }
    },

    // Select employee from search results
    selectEmployeeFromSearch(employee) {
        MAIN.displayEmployeeInfo(employee);
        
        // Clear search and hide results
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.style.display = 'none';
        
        // Update dropdowns to reflect selection
        const teamSelect = document.getElementById('teamSelect');
        const empSelect = document.getElementById('empSelect');
        
        if (teamSelect) teamSelect.value = employee.currentTeam || '';
        this.populateEmployeeDropdown(employee.currentTeam || '');
        if (empSelect) empSelect.value = employee.id;
    },

    // Attach event listeners
    attachEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const teamSelect = document.getElementById('teamSelect');
        const empSelect = document.getElementById('empSelect');
        
        // Search input with debouncing
        if (searchInput) {
            const debouncedSearch = UTILS.debounce((e) => this.handleSearchInput(e), 300);
            searchInput.addEventListener('input', debouncedSearch);
        }
        
        // Team selection
        if (teamSelect) {
            teamSelect.addEventListener('change', (e) => {
                this.populateEmployeeDropdown(e.target.value);
            });
        }
        
        // Employee selection
        if (empSelect) {
            empSelect.addEventListener('change', (e) => {
                const selectedEmployeeId = e.target.value;
                if (selectedEmployeeId) {
                    const employee = this.findEmployeeById(selectedEmployeeId);
                    if (employee) {
                        MAIN.displayEmployeeInfo(employee);
                    }
                } else {
                    MAIN.hideShiftsPanel();
                }
            });
        }
        
        // Hide search results when clicking outside
        document.addEventListener('click', (e) => {
            const searchInput = document.getElementById('searchInput');
            const searchResults = document.getElementById('searchResults');
            
            if (searchInput && searchResults && 
                !searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }
};