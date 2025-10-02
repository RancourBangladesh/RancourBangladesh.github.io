// Data loading and parsing functionality
const DATA_LOADER = {
    // Global data storage
    teamsData: {},
    dateHeaders: [],
    allEmployees: [],

    // Load CSV from Google Sheets
    async loadCSVFromGoogleSheets(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            return csvText;
        } catch (error) {
            console.error('Error loading CSV from Google Sheets:', error);
            throw error;
        }
    },

    // Parse CSV data
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        const result = {};
        
        if (lines.length < 3) {
            throw new Error('CSV file does not contain enough data');
        }
        
        // Extract date headers
        const headerLine = lines[1].split(',');
        const currentDateHeaders = headerLine.slice(3);
        
        // Clean date headers
        const cleanedHeaders = currentDateHeaders.map(header => header.replace(/"/g, '').trim());
        
        let currentTeam = '';
        
        // Process each data row
        for (let i = 2; i < lines.length; i++) {
            const columns = lines[i].split(',');
            
            // If first column has a value, it's a new team
            if (columns[0].trim() !== '') {
                currentTeam = columns[0].trim();
                if (!result[currentTeam]) {
                    result[currentTeam] = [];
                }
            }
            
            // Extract employee data
            const employee = {
                name: columns[1].trim(),
                id: columns[2].trim(),
                team: currentTeam,
                schedule: columns.slice(3).map(shift => shift.trim())
            };
            
            if (employee.name && employee.id) {
                result[currentTeam].push(employee);
            }
        }
        
        return {
            teams: result,
            headers: cleanedHeaders
        };
    },

    // Load and merge all CSV data
    async loadAllCSVData() {
        let allTeamsData = {};
        let allDateHeaders = [];
        let monthData = [];
        
        // First, load all data separately
        for (const url of UTILS.GOOGLE_SHEETS_URLS) {
            try {
                const csvText = await this.loadCSVFromGoogleSheets(url);
                const parsedData = this.parseCSV(csvText);
                monthData.push(parsedData);
                
                // Collect all unique date headers
                parsedData.headers.forEach(header => {
                    if (!allDateHeaders.includes(header)) {
                        allDateHeaders.push(header);
                    }
                });
            } catch (error) {
                console.error(`Error loading data from ${url}:`, error);
            }
        }
        
        // Now merge the data properly
        monthData.forEach(month => {
            for (const team in month.teams) {
                if (!allTeamsData[team]) {
                    allTeamsData[team] = [];
                }
                
                month.teams[team].forEach(employee => {
                    // Find employee across ALL teams
                    let existingEmployee = null;
                    let existingTeam = null;
                    
                    // Search through all teams to find this employee
                    for (const searchTeam in allTeamsData) {
                        const found = allTeamsData[searchTeam].find(emp => emp.id === employee.id);
                        if (found) {
                            existingEmployee = found;
                            existingTeam = searchTeam;
                            break;
                        }
                    }
                    
                    if (existingEmployee) {
                        // Update existing employee's schedule
                        month.headers.forEach((header, index) => {
                            const globalIndex = allDateHeaders.indexOf(header);
                            if (globalIndex !== -1 && employee.schedule[index]) {
                                existingEmployee.schedule[globalIndex] = employee.schedule[index];
                            }
                        });
                        
                        // Update current team
                        existingEmployee.currentTeam = employee.team;
                    } else {
                        // Create new employee
                        const newEmployee = {
                            name: employee.name,
                            id: employee.id,
                            currentTeam: employee.team,
                            allTeams: [employee.team],
                            schedule: new Array(allDateHeaders.length).fill("")
                        };
                        
                        // Fill schedule for this month's dates
                        month.headers.forEach((header, index) => {
                            const globalIndex = allDateHeaders.indexOf(header);
                            if (globalIndex !== -1) {
                                newEmployee.schedule[globalIndex] = employee.schedule[index];
                            }
                        });
                        
                        allTeamsData[employee.team].push(newEmployee);
                    }
                });
            }
        });
        
        // Update global data
        this.teamsData = allTeamsData;
        this.dateHeaders = allDateHeaders;
        
        // Create flat list of all employees
        this.allEmployees = [];
        for (const team in this.teamsData) {
            this.teamsData[team].forEach(emp => {
                emp.team = team;
                this.allEmployees.push(emp);
            });
        }
        
        console.log('Data loaded successfully:', {
            totalDates: this.dateHeaders.length,
            totalTeams: Object.keys(this.teamsData).length,
            totalEmployees: this.allEmployees.length
        });
        
        return {
            teams: this.teamsData,
            headers: this.dateHeaders,
            allEmployees: this.allEmployees
        };
    },

    // Get today's and tomorrow's date labels
    getDateLabels() {
        const now = new Date();
        const today = new Date(now);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayFormatted = UTILS.formatDateForHeader(today);
        const tomorrowFormatted = UTILS.formatDateForHeader(tomorrow);
        
        const todayMatch = UTILS.findMatchingDate(todayFormatted, this.dateHeaders);
        const tomorrowMatch = UTILS.findMatchingDate(tomorrowFormatted, this.dateHeaders);
        
        return {
            today: todayMatch,
            tomorrow: tomorrowMatch
        };
    },

    // Get shift for a specific date
    getShiftForDate(employee, dateLabel) {
        const dateIndex = this.dateHeaders.indexOf(dateLabel);
        
        if (dateIndex !== -1 && employee.schedule && employee.schedule[dateIndex] !== undefined) {
            const shift = employee.schedule[dateIndex].trim();
            return shift !== "" ? shift : "N/A";
        }
        
        return "N/A";
    }
};