# data_loader.py
import csv
import io
import requests
from datetime import datetime, timedelta
import json
import os

class DataLoader:
    def __init__(self):
        self.teamsData = {}
        self.dateHeaders = []
        self.allEmployees = []
        self.GOOGLE_SHEETS_URLS = []

    # Load Google Sheets URLs from Flask app storage
    def load_google_sheets_urls(self):
        try:
            # Load from the same file that Flask app uses
            storage_file = 'data/google_links.json'
            if os.path.exists(storage_file):
                with open(storage_file, 'r', encoding='utf-8') as f:
                    links_data = json.load(f)
                    # Extract all URLs from the stored links
                    urls = list(links_data.values())
                    print(f"Loaded {len(urls)} Google Sheets URLs from storage")
                    return urls
            
            print("No Google Sheets links found in storage, using empty list")
            return []
            
        except Exception as e:
            print(f"Error loading Google Sheets URLs: {e}")
            return []

    # Load CSV from Google Sheets
    def loadCSVFromGoogleSheets(self, url):
        try:
            print(f"Fetching data from: {url}")
            response = requests.get(url)
            if response.status_code == 200:
                print(f"Successfully fetched data from {url}")
                return response.text
            else:
                raise Exception(f"HTTP error! status: {response.status_code}")
        except Exception as error:
            print(f"Error loading CSV from {url}: {error}")
            raise error

    # Parse CSV data
    def parseCSV(self, csvText):
        lines = [line.strip() for line in csvText.split('\n') if line.strip()]
        result = {}
        
        if len(lines) < 3:
            raise Exception('CSV file does not contain enough data')
        
        # Extract date headers (second line)
        headerLine = lines[1].split(',')
        currentDateHeaders = headerLine[3:]  # Skip Team, Name, ID columns
        
        # Clean date headers
        cleanedHeaders = [header.replace('"', '').strip() for header in currentDateHeaders]
        
        currentTeam = ''
        
        # Process each data row (starting from third line)
        for i in range(2, len(lines)):
            columns = lines[i].split(',')
            if len(columns) < 4:  # Skip invalid rows
                continue
                
            # If first column has a value, it's a new team
            if columns[0].strip():
                currentTeam = columns[0].strip()
                if currentTeam not in result:
                    result[currentTeam] = []
            
            # Extract employee data
            employee = {
                'name': columns[1].strip(),
                'id': columns[2].strip(),
                'team': currentTeam,
                'schedule': [shift.strip() for shift in columns[3:]]
            }
            
            if employee['name'] and employee['id']:
                result[currentTeam].append(employee)
        
        # Create allEmployees list
        allEmployees = []
        for team, employees in result.items():
            for emp in employees:
                allEmployees.append(emp)
        
        return {
            'teams': result,
            'headers': cleanedHeaders,
            'allEmployees': allEmployees
        }

    # Load and merge all CSV data
    def loadAllCSVData(self):
        allTeamsData = {}
        allDateHeaders = []
        monthData = []
        
        # Reload URLs from storage each time to get the latest
        self.GOOGLE_SHEETS_URLS = self.load_google_sheets_urls()
        
        if not self.GOOGLE_SHEETS_URLS:
            print("No Google Sheets URLs configured. Please add links in the admin panel.")
            # Return empty data structure
            return {
                'teams': {},
                'headers': [],
                'allEmployees': []
            }
        
        print(f"Loading data from {len(self.GOOGLE_SHEETS_URLS)} Google Sheets URLs...")
        
        # First, load all data separately
        for url in self.GOOGLE_SHEETS_URLS:
            try:
                print(f"Loading from: {url}")
                csvText = self.loadCSVFromGoogleSheets(url)
                parsedData = self.parseCSV(csvText)
                monthData.append(parsedData)
                
                # Collect all unique date headers
                for header in parsedData['headers']:
                    if header not in allDateHeaders:
                        allDateHeaders.append(header)
                print(f"Successfully loaded data from {url}")
            except Exception as error:
                print(f"Error loading data from {url}: {error}")
        
        # If no data was loaded successfully, create sample data
        if not monthData:
            print("No data loaded from Google Sheets, creating sample data")
            sample_data = self.create_sample_data()
            monthData.append(sample_data)
            allDateHeaders.extend(sample_data['headers'])
        
        # Now merge the data properly
        for month in monthData:
            for team, employees in month['teams'].items():
                if team not in allTeamsData:
                    allTeamsData[team] = []
                
                for employee in employees:
                    # Find employee across ALL teams
                    existing_employee = None
                    
                    # Search through all teams to find this employee
                    for search_team, search_employees in allTeamsData.items():
                        for emp in search_employees:
                            if emp['id'] == employee['id']:
                                existing_employee = emp
                                break
                        if existing_employee:
                            break
                    
                    if existing_employee:
                        # Update existing employee's schedule
                        for i, header in enumerate(month['headers']):
                            if header in allDateHeaders:
                                global_index = allDateHeaders.index(header)
                                if employee['schedule'][i]:
                                    existing_employee['schedule'][global_index] = employee['schedule'][i]
                    else:
                        # Create new employee
                        new_employee = {
                            'name': employee['name'],
                            'id': employee['id'],
                            'currentTeam': employee['team'],
                            'allTeams': [employee['team']],
                            'schedule': [''] * len(allDateHeaders)
                        }
                        
                        # Fill schedule for this month's dates
                        for i, header in enumerate(month['headers']):
                            if header in allDateHeaders:
                                global_index = allDateHeaders.index(header)
                                new_employee['schedule'][global_index] = employee['schedule'][i]
                        
                        allTeamsData[team].append(new_employee)
        
        # Update global data
        self.teamsData = allTeamsData
        self.dateHeaders = allDateHeaders
        
        # Create flat list of all employees
        self.allEmployees = []
        for team, employees in self.teamsData.items():
            for emp in employees:
                emp['team'] = team
                self.allEmployees.append(emp)
        
        print('Data loaded successfully:', {
            'totalDates': len(self.dateHeaders),
            'totalTeams': len(self.teamsData),
            'totalEmployees': len(self.allEmployees)
        })
        
        return {
            'teams': self.teamsData,
            'headers': self.dateHeaders,
            'allEmployees': self.allEmployees
        }

    # Create sample data for demo
    def create_sample_data(self):
        teams = {
            'Team A': [
                {
                    'name': 'John Doe',
                    'id': 'EMP001',
                    'team': 'Team A',
                    'schedule': ['M2', 'M2', 'M2', 'M2', 'M2', 'DO', 'DO', 'M3', 'M3', 'M3', 'M3', 'M3', 'DO', 'DO']
                },
                {
                    'name': 'Jane Smith',
                    'id': 'EMP002', 
                    'team': 'Team A',
                    'schedule': ['M3', 'M3', 'M3', 'M3', 'M3', 'DO', 'DO', 'M2', 'M2', 'M2', 'M2', 'M2', 'DO', 'DO']
                }
            ],
            'Team B': [
                {
                    'name': 'Robert Brown',
                    'id': 'EMP003',
                    'team': 'Team B',
                    'schedule': ['D1', 'D1', 'D1', 'D1', 'D1', 'DO', 'DO', 'D2', 'D2', 'D2', 'D2', 'D2', 'DO', 'DO']
                }
            ]
        }
        
        # Create allEmployees list
        allEmployees = []
        for team, employees in teams.items():
            for emp in employees:
                allEmployees.append(emp)
        
        return {
            'teams': teams,
            'headers': ['1Jan', '2Jan', '3Jan', '4Jan', '5Jan', '6Jan', '7Jan', '8Jan', '9Jan', '10Jan', '11Jan', '12Jan', '13Jan', '14Jan'],
            'allEmployees': allEmployees
        }

    # Get today's and tomorrow's date labels
    def getDateLabels(self):
        now = datetime.now()
        today = now
        tomorrow = today + timedelta(days=1)
        
        def format_date_for_header(date):
            day = date.day
            month = date.strftime('%b')
            return f"{day}{month}"
        
        today_formatted = format_date_for_header(today)
        tomorrow_formatted = format_date_for_header(tomorrow)
        
        def find_matching_date(date_string, date_headers):
            # Try exact match first
            if date_string in date_headers:
                return date_string
            
            # Try case-insensitive match
            lower_date_string = date_string.lower()
            for header in date_headers:
                if header.lower() == lower_date_string:
                    return header
            
            # Try partial match
            for header in date_headers:
                if date_string in header or header in date_string:
                    return header
            
            print(f'No matching date found for: {date_string}')
            return date_string
        
        today_match = find_matching_date(today_formatted, self.dateHeaders)
        tomorrow_match = find_matching_date(tomorrow_formatted, self.dateHeaders)
        
        return {
            'today': today_match,
            'tomorrow': tomorrow_match
        }

    # Get shift for a specific date
    def getShiftForDate(self, employee, dateLabel):
        if dateLabel in self.dateHeaders:
            dateIndex = self.dateHeaders.index(dateLabel)
            if dateIndex != -1 and employee.get('schedule') and dateIndex < len(employee['schedule']):
                shift = employee['schedule'][dateIndex].strip()
                return shift if shift != "" else "N/A"
        
        return "N/A"

# Create global instance
DATA_LOADER = DataLoader()