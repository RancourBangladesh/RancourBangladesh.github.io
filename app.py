# app.py - Complete version with all features
from schedule_requests import SCHEDULE_REQUESTS
from flask import Flask, render_template, send_from_directory, request, jsonify, session, redirect, url_for
import os
import json
from datetime import datetime
import csv
import io
import copy
import calendar
import re

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change this in production

# Admin authentication
ADMIN_USERS = {
    'admin': 'password123',
    'tl': 'teamlead123'
}

# Data storage
GOOGLE_SYNCED_DATA = {}      # Original data from Google Sheets
ADMIN_MODIFIED_DATA = {}     # Admin-modified data
CURRENT_DISPLAY_DATA = {}    # Combined data for roster viewer
MODIFIED_SHIFTS_DATA = {}    # Track modified shifts history
GOOGLE_SHEETS_LINKS = {}     # Store Google Sheets links by month

# Data storage files
DATA_DIR = 'data'
GOOGLE_DATA_FILE = os.path.join(DATA_DIR, 'google_data.json')
ADMIN_DATA_FILE = os.path.join(DATA_DIR, 'admin_data.json')
MODIFIED_SHIFTS_FILE = os.path.join(DATA_DIR, 'modified_shifts.json')
GOOGLE_LINKS_FILE = os.path.join(DATA_DIR, 'google_links.json')

def ensure_data_dir():
    """Ensure data directory exists"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def save_google_data():
    """Save Google data to file"""
    try:
        ensure_data_dir()
        with open(GOOGLE_DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(GOOGLE_SYNCED_DATA, f, indent=2, ensure_ascii=False)
        print("Google data saved successfully")
    except Exception as e:
        print(f"Error saving Google data: {e}")

def save_admin_data():
    """Save admin data to file"""
    try:
        ensure_data_dir()
        with open(ADMIN_DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(ADMIN_MODIFIED_DATA, f, indent=2, ensure_ascii=False)
        print("Admin data saved successfully")
    except Exception as e:
        print(f"Error saving admin data: {e}")

def save_modified_shifts():
    """Save modified shifts data to file"""
    try:
        ensure_data_dir()
        with open(MODIFIED_SHIFTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(MODIFIED_SHIFTS_DATA, f, indent=2, ensure_ascii=False)
        print("Modified shifts data saved successfully")
    except Exception as e:
        print(f"Error saving modified shifts data: {e}")

def save_google_links():
    """Save Google Sheets links to file"""
    try:
        ensure_data_dir()
        with open(GOOGLE_LINKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(GOOGLE_SHEETS_LINKS, f, indent=2, ensure_ascii=False)
        print("Google links saved successfully")
    except Exception as e:
        print(f"Error saving Google links: {e}")

def load_google_data():
    """Load Google data from file"""
    global GOOGLE_SYNCED_DATA
    try:
        if os.path.exists(GOOGLE_DATA_FILE):
            with open(GOOGLE_DATA_FILE, 'r', encoding='utf-8') as f:
                GOOGLE_SYNCED_DATA = json.load(f)
            print("Google data loaded successfully")
            return True
    except Exception as e:
        print(f"Error loading Google data: {e}")
    return False

def load_admin_data():
    """Load admin data from file"""
    global ADMIN_MODIFIED_DATA
    try:
        if os.path.exists(ADMIN_DATA_FILE):
            with open(ADMIN_DATA_FILE, 'r', encoding='utf-8') as f:
                ADMIN_MODIFIED_DATA = json.load(f)
            print("Admin data loaded successfully")
            return True
    except Exception as e:
        print(f"Error loading admin data: {e}")
    return False

def load_modified_shifts():
    """Load modified shifts data from file"""
    global MODIFIED_SHIFTS_DATA
    try:
        if os.path.exists(MODIFIED_SHIFTS_FILE):
            with open(MODIFIED_SHIFTS_FILE, 'r', encoding='utf-8') as f:
                MODIFIED_SHIFTS_DATA = json.load(f)
            print("Modified shifts data loaded successfully")
            return True
        else:
            MODIFIED_SHIFTS_DATA = {
                'modifications': [],
                'monthly_stats': {}
            }
            return True
    except Exception as e:
        print(f"Error loading modified shifts data: {e}")
        MODIFIED_SHIFTS_DATA = {
            'modifications': [],
            'monthly_stats': {}
        }
    return False

def load_google_links():
    """Load Google Sheets links from file"""
    global GOOGLE_SHEETS_LINKS
    try:
        if os.path.exists(GOOGLE_LINKS_FILE):
            with open(GOOGLE_LINKS_FILE, 'r', encoding='utf-8') as f:
                GOOGLE_SHEETS_LINKS = json.load(f)
            print("Google links loaded successfully")
            return True
        else:
            GOOGLE_SHEETS_LINKS = {}
            return True
    except Exception as e:
        print(f"Error loading Google links: {e}")
        GOOGLE_SHEETS_LINKS = {}
    return False

def update_data_loader_urls():
    """Update the data loader with current Google Sheets URLs"""
    try:
        from data_loader import DATA_LOADER
        
        # The DataLoader now reloads URLs automatically in loadAllCSVData()
        # So we don't need to manually set them
        urls = list(GOOGLE_SHEETS_LINKS.values())
        print(f"Google Sheets URLs available: {len(urls)} URLs")
        print(f"URLs: {urls}")
        
        return True
    except Exception as e:
        print(f"Error in update_data_loader_urls: {e}")
        return False

def deep_copy_data(data):
    """Create a deep copy of the data structure"""
    return copy.deepcopy(data)

def update_display_data():
    """Combine Google data and admin modifications for display - FIXED VERSION"""
    global CURRENT_DISPLAY_DATA
    
    if not GOOGLE_SYNCED_DATA:
        CURRENT_DISPLAY_DATA = deep_copy_data(ADMIN_MODIFIED_DATA)
        return
    
    # Start with Google data as base
    CURRENT_DISPLAY_DATA = deep_copy_data(GOOGLE_SYNCED_DATA)
    
    # Apply admin modifications where they exist
    if ADMIN_MODIFIED_DATA.get('teams'):
        for team_name, admin_team in ADMIN_MODIFIED_DATA['teams'].items():
            if team_name in CURRENT_DISPLAY_DATA['teams']:
                # Update team structure first
                CURRENT_DISPLAY_DATA['teams'][team_name] = deep_copy_data(admin_team)
            else:
                # Add new team if it doesn't exist in Google data
                CURRENT_DISPLAY_DATA['teams'][team_name] = deep_copy_data(admin_team)
        
        # Remove teams that were deleted in admin data
        teams_to_remove = []
        for team_name in CURRENT_DISPLAY_DATA['teams']:
            if team_name not in ADMIN_MODIFIED_DATA['teams']:
                teams_to_remove.append(team_name)
        
        for team_name in teams_to_remove:
            del CURRENT_DISPLAY_DATA['teams'][team_name]
    
    # Update allEmployees list
    all_employees = []
    for team_name, employees in CURRENT_DISPLAY_DATA['teams'].items():
        for emp in employees:
            emp['currentTeam'] = team_name
            all_employees.append(emp)
    CURRENT_DISPLAY_DATA['allEmployees'] = all_employees

def track_modified_shift(employee_id, date_index, old_shift, new_shift, employee_name, team_name, date_header, modified_by):
    """Track when a shift is modified"""
    modification = {
        'employee_id': employee_id,
        'employee_name': employee_name,
        'team_name': team_name,
        'date_index': date_index,
        'date_header': date_header,
        'old_shift': old_shift,
        'new_shift': new_shift,
        'modified_by': modified_by,
        'timestamp': datetime.now().isoformat(),
        'month_year': datetime.now().strftime('%Y-%m')
    }
    
    MODIFIED_SHIFTS_DATA['modifications'].append(modification)
    
    # Update monthly stats
    month_year = datetime.now().strftime('%Y-%m')
    if month_year not in MODIFIED_SHIFTS_DATA['monthly_stats']:
        MODIFIED_SHIFTS_DATA['monthly_stats'][month_year] = {
            'total_modifications': 0,
            'employees_modified': set(),
            'modifications_by_user': {}
        }
    
    stats = MODIFIED_SHIFTS_DATA['monthly_stats'][month_year]
    stats['total_modifications'] += 1
    
    if isinstance(stats['employees_modified'], set):
        stats['employees_modified'].add(employee_id)
    else:
        if isinstance(stats['employees_modified'], list):
            stats['employees_modified'] = set(stats['employees_modified'])
        stats['employees_modified'].add(employee_id)
    
    # Track modifications by user
    if modified_by not in stats['modifications_by_user']:
        stats['modifications_by_user'][modified_by] = 0
    stats['modifications_by_user'][modified_by] += 1
    
    # Convert set to list for JSON serialization
    stats['employees_modified'] = list(stats['employees_modified'])
    
    save_modified_shifts()

def get_shift_display(shift_code):
    """Get human-readable shift display"""
    shift_map = {
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
    }
    return shift_map.get(shift_code, shift_code)

def extract_month_from_headers(headers):
    """Extract month from date headers"""
    month_mapping = {
        'jan': 'Jan', 'january': 'Jan',
        'feb': 'Feb', 'february': 'Feb',
        'mar': 'Mar', 'march': 'Mar',
        'apr': 'Apr', 'april': 'Apr',
        'may': 'May',
        'jun': 'Jun', 'june': 'Jun',
        'jul': 'Jul', 'july': 'Jul',
        'aug': 'Aug', 'august': 'Aug',
        'sep': 'Sep', 'september': 'Sep',
        'oct': 'Oct', 'october': 'Oct',
        'nov': 'Nov', 'november': 'Nov',
        'dec': 'Dec', 'december': 'Dec'
    }
    
    month_counts = {}
    
    for header in headers:
        match = re.match(r'(\d{1,2})[-\.\s]*([a-zA-Z]+)', header)
        if match:
            month_part = match.group(2).lower()
            if month_part in month_mapping:
                month = month_mapping[month_part]
                month_counts[month] = month_counts.get(month, 0) + 1
        else:
            for month_key, month_name in month_mapping.items():
                if month_key in header.lower():
                    month_counts[month_name] = month_counts.get(month_name, 0) + 1
                    break
    
    if month_counts:
        return max(month_counts.items(), key=lambda x: x[1])[0]
    return None

def normalize_date_header(header):
    """Normalize date headers to standard format"""
    normalized = re.sub(r'[-\.\s]', '', header)
    
    month_mapping = {
        'jan': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'apr': 'Apr',
        'may': 'May', 'jun': 'Jun', 'jul': 'Jul', 'aug': 'Aug',
        'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dec': 'Dec'
    }
    
    match = re.match(r'(\d+)([a-zA-Z]+)', normalized, re.IGNORECASE)
    if match:
        day = match.group(1)
        month = match.group(2).lower()
        if month in month_mapping:
            return f"{day}{month_mapping[month]}"
    
    return normalized

def parse_csv_dates(headers):
    """Parse CSV date headers and return normalized headers and detected month"""
    normalized_headers = []
    for header in headers:
        normalized_headers.append(normalize_date_header(header))
    
    month = extract_month_from_headers(headers)
    return normalized_headers, month

def apply_shift_change(request_data):
    """Apply approved shift change to admin data"""
    employee_id = request_data['employee_id']
    date = request_data['date']
    new_shift = request_data['requested_shift']
    
    # Find employee in admin data
    for team_name, employees in ADMIN_MODIFIED_DATA.get('teams', {}).items():
        for employee in employees:
            if employee['id'] == employee_id:
                # Find date index
                if date in ADMIN_MODIFIED_DATA.get('headers', []):
                    date_index = ADMIN_MODIFIED_DATA['headers'].index(date)
                    if date_index < len(employee['schedule']):
                        # Update the shift
                        employee['schedule'][date_index] = new_shift
                        # Track the modification
                        track_modified_shift(
                            employee_id=employee_id,
                            date_index=date_index,
                            old_shift=request_data['current_shift'],
                            new_shift=new_shift,
                            employee_name=employee['name'],
                            team_name=team_name,
                            date_header=date,
                            modified_by=f"Schedule Request (Approved by {request_data.get('approved_by', 'admin')})"
                        )
                break

def apply_swap(request_data):
    """Apply approved swap to admin data"""
    requester_id = request_data['requester_id']
    target_id = request_data['target_employee_id']
    date = request_data['date']
    
    # Find both employees in admin data
    requester_employee = None
    target_employee = None
    requester_team = None
    target_team = None
    
    for team_name, employees in ADMIN_MODIFIED_DATA.get('teams', {}).items():
        for employee in employees:
            if employee['id'] == requester_id:
                requester_employee = employee
                requester_team = team_name
            if employee['id'] == target_id:
                target_employee = employee
                target_team = team_name
    
    if requester_employee and target_employee and date in ADMIN_MODIFIED_DATA.get('headers', []):
        date_index = ADMIN_MODIFIED_DATA['headers'].index(date)
        
        if date_index < len(requester_employee['schedule']) and date_index < len(target_employee['schedule']):
            # Swap the shifts
            requester_old_shift = requester_employee['schedule'][date_index]
            target_old_shift = target_employee['schedule'][date_index]
            
            requester_employee['schedule'][date_index] = target_old_shift
            target_employee['schedule'][date_index] = requester_old_shift
            
            # Track modifications for both employees
            track_modified_shift(
                employee_id=requester_id,
                date_index=date_index,
                old_shift=requester_old_shift,
                new_shift=target_old_shift,
                employee_name=request_data['requester_name'],
                team_name=requester_team,
                date_header=date,
                modified_by=f"Swap Request (Approved by {request_data.get('approved_by', 'admin')})"
            )
            
            track_modified_shift(
                employee_id=target_id,
                date_index=date_index,
                old_shift=target_old_shift,
                new_shift=requester_old_shift,
                employee_name=request_data['target_employee_name'],
                team_name=target_team,
                date_header=date,
                modified_by=f"Swap Request (Approved by {request_data.get('approved_by', 'admin')})"
            )

# Load data on startup
ensure_data_dir()
load_google_data()
load_admin_data()
load_modified_shifts()
load_google_links()
update_data_loader_urls()  # NEW: Update data loader with URLs
update_display_data()

@app.route('/')
def index():
    """Serve the main application page"""
    try:
        return render_template('index.html')
    except Exception as e:
        return f"Error loading template: {str(e)}", 500

@app.route('/admin')
def admin_login():
    """Admin login page"""
    if session.get('admin_logged_in'):
        return redirect(url_for('admin_dashboard'))
    return render_template('admin_login.html')

@app.route('/admin/login', methods=['POST'])
def admin_login_post():
    """Handle admin login"""
    try:
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username in ADMIN_USERS and ADMIN_USERS[username] == password:
            session['admin_logged_in'] = True
            session['admin_username'] = username
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Invalid credentials'})
    except Exception as e:
        return jsonify({'success': False, 'error': 'Login failed. Please try again.'})

@app.route('/admin/logout')
def admin_logout():
    """Handle admin logout"""
    session.pop('admin_logged_in', None)
    session.pop('admin_username', None)
    return redirect(url_for('admin_login'))

@app.route('/admin/dashboard')
def admin_dashboard():
    """Admin dashboard"""
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    return render_template('admin_dashboard.html')

# Data Management Endpoints
@app.route('/admin/api/sync-google-sheets', methods=['POST'])
def sync_google_sheets():
    """Sync data from Google Sheets to admin panel"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        from data_loader import DATA_LOADER
        
        # Update data loader with current URLs before syncing
        update_data_loader_urls()
        
        # Check if we have any Google Sheets URLs configured
        if not GOOGLE_SHEETS_LINKS:
            return jsonify({
                'success': False, 
                'error': 'No Google Sheets links configured. Please add links in "Google Sheets Links Management" first.'
            })
        
        print(f"Syncing from {len(GOOGLE_SHEETS_LINKS)} Google Sheets URLs...")
        
        # Load data from Google Sheets
        google_data = DATA_LOADER.loadAllCSVData()
        
        # Store in Google synced data
        global GOOGLE_SYNCED_DATA
        GOOGLE_SYNCED_DATA = deep_copy_data(google_data)
        
        # Save to file
        save_google_data()
        
        # Initialize admin modified data structure if empty
        global ADMIN_MODIFIED_DATA
        if not ADMIN_MODIFIED_DATA:
            ADMIN_MODIFIED_DATA = deep_copy_data(google_data)
            save_admin_data()
        else:
            # Merge new employees from Google data into admin modified data
            for team_name, google_team in google_data['teams'].items():
                if team_name not in ADMIN_MODIFIED_DATA['teams']:
                    ADMIN_MODIFIED_DATA['teams'][team_name] = []
                
                for google_employee in google_team:
                    employee_exists = False
                    for admin_employee in ADMIN_MODIFIED_DATA['teams'][team_name]:
                        if admin_employee['id'] == google_employee['id']:
                            employee_exists = True
                            break
                    
                    if not employee_exists:
                        ADMIN_MODIFIED_DATA['teams'][team_name].append(deep_copy_data(google_employee))
            
            save_admin_data()
        
        update_display_data()
        
        return jsonify({
            'success': True, 
            'message': f'Google Sheets synced successfully. Loaded {len(google_data.get("allEmployees", []))} employees from {len(GOOGLE_SHEETS_LINKS)} sheets.'
        })
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Google Sheets sync error: {error_details}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/api/get-google-data')
def get_google_data():
    """Get Google synced data for admin panel"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify({
        'teams': GOOGLE_SYNCED_DATA.get('teams', {}),
        'headers': GOOGLE_SYNCED_DATA.get('headers', []),
        'allEmployees': GOOGLE_SYNCED_DATA.get('allEmployees', [])
    })

@app.route('/admin/api/get-admin-data')
def get_admin_data():
    """Get admin modified data for admin panel"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify({
        'teams': ADMIN_MODIFIED_DATA.get('teams', {}),
        'headers': ADMIN_MODIFIED_DATA.get('headers', []),
        'allEmployees': ADMIN_MODIFIED_DATA.get('allEmployees', [])
    })

@app.route('/admin/api/get-display-data')
def get_display_data():
    """Get combined data for roster viewer"""
    return jsonify(CURRENT_DISPLAY_DATA)

@app.route('/admin/api/get-employee-shift-history', methods=['POST'])
def get_employee_shift_history():
    """Get shift history for an employee including original Google data"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    employee_id = data.get('employeeId')
    
    employee_google = None
    employee_admin = None
    
    for team in GOOGLE_SYNCED_DATA.get('teams', {}).values():
        for employee in team:
            if employee['id'] == employee_id:
                employee_google = employee
                break
        if employee_google:
            break
    
    for team in ADMIN_MODIFIED_DATA.get('teams', {}).values():
        for employee in team:
            if employee['id'] == employee_id:
                employee_admin = employee
                break
        if employee_admin:
            break
    
    if not employee_google and not employee_admin:
        return jsonify({'error': 'Employee not found'}), 404
    
    employee_modifications = []
    for modification in MODIFIED_SHIFTS_DATA.get('modifications', []):
        if modification['employee_id'] == employee_id:
            employee_modifications.append(modification)
    
    return jsonify({
        'employee': employee_admin or employee_google,
        'google_schedule': employee_google['schedule'] if employee_google else [],
        'admin_schedule': employee_admin['schedule'] if employee_admin else [],
        'modifications': employee_modifications,
        'headers': GOOGLE_SYNCED_DATA.get('headers', [])
    })

@app.route('/admin/api/get-modified-shifts')
def get_modified_shifts():
    """Get modified shifts statistics"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    current_month = datetime.now().strftime('%Y-%m')
    monthly_stats = MODIFIED_SHIFTS_DATA.get('monthly_stats', {}).get(current_month, {
        'total_modifications': 0,
        'employees_modified': [],
        'modifications_by_user': {}
    })
    
    recent_modifications = []
    for modification in MODIFIED_SHIFTS_DATA.get('modifications', []):
        if modification['month_year'] == current_month:
            recent_modifications.append(modification)
    
    recent_modifications.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return jsonify({
        'monthly_stats': monthly_stats,
        'recent_modifications': recent_modifications[:50],
        'current_month': current_month
    })

@app.route('/admin/api/update-shift', methods=['POST'])
def update_shift():
    """Update shift in admin modified data"""
    try:
        if not session.get('admin_logged_in'):
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data provided'}), 400
            
        employee_id = data.get('employeeId')
        date_index = data.get('dateIndex')
        new_shift = data.get('newShift')
        data_source = data.get('source', 'admin')
        google_shift = data.get('googleShift', '')
        
        if not employee_id or date_index is None:
            return jsonify({'success': False, 'error': 'Missing required fields: employeeId and dateIndex are required'}), 400
        
        target_data = ADMIN_MODIFIED_DATA if data_source == 'admin' else GOOGLE_SYNCED_DATA
        
        employee_found = False
        for team_name, team in target_data.get('teams', {}).items():
            for employee in team:
                if employee['id'] == employee_id:
                    employee_found = True
                    if 0 <= date_index < len(employee['schedule']):
                        old_shift = employee['schedule'][date_index]
                        employee['schedule'][date_index] = new_shift
                        
                        if data_source == 'admin' and new_shift != google_shift:
                            date_header = ADMIN_MODIFIED_DATA.get('headers', [])[date_index] if date_index < len(ADMIN_MODIFIED_DATA.get('headers', [])) else f"Date_{date_index}"
                            track_modified_shift(
                                employee_id=employee_id,
                                date_index=date_index,
                                old_shift=google_shift,
                                new_shift=new_shift,
                                employee_name=employee['name'],
                                team_name=team_name,
                                date_header=date_header,
                                modified_by=session.get('admin_username', 'unknown')
                            )
                        
                        if data_source == 'admin':
                            save_admin_data()
                        else:
                            save_google_data()
                        
                        if data_source == 'admin':
                            update_display_data()
                        
                        return jsonify({'success': True})
                    else:
                        return jsonify({'success': False, 'error': f'Date index {date_index} out of range. Schedule length: {len(employee["schedule"])}'}), 400
        
        if not employee_found:
            return jsonify({'success': False, 'error': f'Employee {employee_id} not found'}), 404
            
    except Exception as e:
        print(f"Error in update_shift: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Server error: {str(e)}'}), 500
    
    return jsonify({'success': False, 'error': 'Employee or date not found'})

@app.route('/admin/api/reset-to-google', methods=['POST'])
def reset_to_google():
    """Reset admin modifications to Google data"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    global ADMIN_MODIFIED_DATA
    ADMIN_MODIFIED_DATA = deep_copy_data(GOOGLE_SYNCED_DATA)
    
    save_admin_data()
    update_display_data()
    
    return jsonify({'success': True, 'message': 'Reset to Google Sheets data'})

@app.route('/admin/api/save-team', methods=['POST'])
def save_team():
    """Save team data (add or edit)"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        team_name = data.get('teamName')
        action = data.get('action')
        
        if not team_name:
            return jsonify({'success': False, 'error': 'Team name is required'})
        
        global ADMIN_MODIFIED_DATA
        
        if action == 'add':
            if team_name not in ADMIN_MODIFIED_DATA['teams']:
                ADMIN_MODIFIED_DATA['teams'][team_name] = []
        elif action == 'edit':
            old_name = data.get('oldName')
            if old_name and old_name in ADMIN_MODIFIED_DATA['teams']:
                ADMIN_MODIFIED_DATA['teams'][team_name] = ADMIN_MODIFIED_DATA['teams'].pop(old_name)
        
        save_admin_data()
        update_display_data()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/api/save-employee', methods=['POST'])
def save_employee():
    """Save employee data (add or edit) - FIXED VERSION"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        name = data.get('name')
        emp_id = data.get('id')
        team = data.get('team')
        action = data.get('action')
        
        if not all([name, emp_id, team]):
            return jsonify({'success': False, 'error': 'All fields are required'})
        
        global ADMIN_MODIFIED_DATA
        
        if action == 'add':
            new_employee = {
                'name': name,
                'id': emp_id,
                'schedule': [''] * len(ADMIN_MODIFIED_DATA.get('headers', []))
            }
            
            if team not in ADMIN_MODIFIED_DATA['teams']:
                ADMIN_MODIFIED_DATA['teams'][team] = []
            
            ADMIN_MODIFIED_DATA['teams'][team].append(new_employee)
            
        elif action == 'edit':
            old_id = data.get('oldId', emp_id)
            old_team = data.get('oldTeam', team)
            
            employee_found = False
            
            # Remove from old team if team changed
            if old_team in ADMIN_MODIFIED_DATA['teams']:
                for i, emp in enumerate(ADMIN_MODIFIED_DATA['teams'][old_team]):
                    if emp['id'] == old_id:
                        # Remove from old team
                        removed_employee = ADMIN_MODIFIED_DATA['teams'][old_team].pop(i)
                        
                        # Update employee data
                        removed_employee['name'] = name
                        removed_employee['id'] = emp_id
                        
                        # Add to new team
                        if team not in ADMIN_MODIFIED_DATA['teams']:
                            ADMIN_MODIFIED_DATA['teams'][team] = []
                        ADMIN_MODIFIED_DATA['teams'][team].append(removed_employee)
                        
                        employee_found = True
                        break
            
            # If not found by old data, search all teams
            if not employee_found:
                for team_name, employees in ADMIN_MODIFIED_DATA['teams'].items():
                    for i, emp in enumerate(employees):
                        if emp['id'] == emp_id:
                            # Update in place
                            emp['name'] = name
                            # If team changed, move the employee
                            if team_name != team:
                                moved_employee = ADMIN_MODIFIED_DATA['teams'][team_name].pop(i)
                                if team not in ADMIN_MODIFIED_DATA['teams']:
                                    ADMIN_MODIFIED_DATA['teams'][team] = []
                                ADMIN_MODIFIED_DATA['teams'][team].append(moved_employee)
                            employee_found = True
                            break
                    if employee_found:
                        break
        
        save_admin_data()
        update_display_data()  # Ensure display data is updated immediately
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/api/delete-team', methods=['POST'])
def delete_team():
    """Delete a team"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        team_name = data.get('teamName')
        
        global ADMIN_MODIFIED_DATA
        
        if team_name in ADMIN_MODIFIED_DATA['teams']:
            del ADMIN_MODIFIED_DATA['teams'][team_name]
            
        save_admin_data()
        update_display_data()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/api/delete-employee', methods=['POST'])
def delete_employee():
    """Delete an employee - FIXED VERSION"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        employee_id = data.get('employeeId')
        
        global ADMIN_MODIFIED_DATA
        
        employee_found = False
        for team_name, employees in ADMIN_MODIFIED_DATA['teams'].items():
            for i, emp in enumerate(employees):
                if emp['id'] == employee_id:
                    ADMIN_MODIFIED_DATA['teams'][team_name].pop(i)
                    employee_found = True
                    break
            if employee_found:
                break
        
        save_admin_data()
        update_display_data()  # Ensure display data is updated immediately
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/api/save-google-link', methods=['POST'])
def save_google_link():
    """Save Google Sheets link for a month"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        month_year = data.get('monthYear')
        google_link = data.get('googleLink')
        
        if not month_year or not google_link:
            return jsonify({'success': False, 'error': 'Month year and Google link are required'})
        
        global GOOGLE_SHEETS_LINKS
        GOOGLE_SHEETS_LINKS[month_year] = google_link
        
        save_google_links()
        
        # Update data loader with new URLs
        update_data_loader_urls()
        
        return jsonify({'success': True, 'message': 'Google Sheets link saved successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/api/get-google-links')
def get_google_links():
    """Get all Google Sheets links"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify(GOOGLE_SHEETS_LINKS)

@app.route('/admin/api/delete-google-link', methods=['POST'])
def delete_google_link():
    """Delete Google Sheets link for a month"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        month_year = data.get('monthYear')
        
        if not month_year:
            return jsonify({'success': False, 'error': 'Month year is required'})
        
        global GOOGLE_SHEETS_LINKS
        if month_year in GOOGLE_SHEETS_LINKS:
            del GOOGLE_SHEETS_LINKS[month_year]
            save_google_links()
            
            # Update data loader with new URLs
            update_data_loader_urls()
            
            return jsonify({'success': True, 'message': 'Google Sheets link deleted successfully'})
        else:
            return jsonify({'success': False, 'error': 'Link not found'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/api/upload-csv', methods=['POST'])
def upload_csv():
    """Handle CSV file upload"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    if 'csv_file' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'})
    
    file = request.files['csv_file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'})
    
    if file and file.filename.endswith('.csv'):
        try:
            stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
            csv_input = csv.reader(stream)
            rows = list(csv_input)
            
            if len(rows) < 3:
                return jsonify({'success': False, 'error': 'CSV file must have at least 3 rows'})
            
            raw_headers = []
            if len(rows) > 0:
                raw_headers = [header.strip() for header in rows[0][3:] if header.strip()]
            
            normalized_headers, detected_month = parse_csv_dates(raw_headers)
            
            if not detected_month:
                return jsonify({'success': False, 'error': f'Could not detect month from date headers. Headers: {raw_headers}'})
            
            imported_teams = {}
            for i in range(1, len(rows)):
                row = rows[i]
                if len(row) < 4:
                    continue
                
                if i == 1 and (not row[0].strip() and not row[1].strip() and not row[2].strip()):
                    continue
                
                team = row[0].strip()
                name = row[1].strip()
                emp_id = row[2].strip()
                
                if not team or not name or not emp_id:
                    continue
                
                shifts = [shift.strip() for shift in row[3:3+len(normalized_headers)]]
                
                if team not in imported_teams:
                    imported_teams[team] = []
                
                employee_data = {
                    'name': name,
                    'id': emp_id,
                    'team': team,
                    'schedule': shifts
                }
                
                imported_teams[team].append(employee_data)
            
            global GOOGLE_SYNCED_DATA
            
            if not GOOGLE_SYNCED_DATA:
                GOOGLE_SYNCED_DATA = {
                    'teams': {},
                    'headers': [],
                    'allEmployees': []
                }
            
            existing_headers = GOOGLE_SYNCED_DATA.get('headers', [])
            month_headers = [h for h in existing_headers if detected_month.lower() in h.lower()]
            
            if month_headers:
                new_headers = [h for h in existing_headers if detected_month.lower() not in h.lower()]
                new_headers.extend(normalized_headers)
            else:
                new_headers = existing_headers + normalized_headers
            
            GOOGLE_SYNCED_DATA['headers'] = new_headers
            
            for team_name, imported_employees in imported_teams.items():
                if team_name not in GOOGLE_SYNCED_DATA['teams']:
                    GOOGLE_SYNCED_DATA['teams'][team_name] = []
                
                for imported_emp in imported_employees:
                    existing_emp = None
                    for emp in GOOGLE_SYNCED_DATA['teams'][team_name]:
                        if emp['id'] == imported_emp['id']:
                            existing_emp = emp
                            break
                    
                    if existing_emp:
                        while len(existing_emp['schedule']) < len(new_headers):
                            existing_emp['schedule'].append('')
                        
                        for i, header in enumerate(normalized_headers):
                            header_index = new_headers.index(header)
                            if i < len(imported_emp['schedule']):
                                existing_emp['schedule'][header_index] = imported_emp['schedule'][i]
                    else:
                        new_emp = {
                            'name': imported_emp['name'],
                            'id': imported_emp['id'],
                            'team': team_name,
                            'schedule': [''] * len(new_headers)
                        }
                        
                        for i, header in enumerate(normalized_headers):
                            header_index = new_headers.index(header)
                            if i < len(imported_emp['schedule']):
                                new_emp['schedule'][header_index] = imported_emp['schedule'][i]
                        
                        GOOGLE_SYNCED_DATA['teams'][team_name].append(new_emp)
            
            all_employees = []
            for team_name, employees in GOOGLE_SYNCED_DATA['teams'].items():
                for emp in employees:
                    emp['currentTeam'] = team_name
                    all_employees.append(emp)
            GOOGLE_SYNCED_DATA['allEmployees'] = all_employees
            
            save_google_data()
            
            global ADMIN_MODIFIED_DATA
            if not ADMIN_MODIFIED_DATA:
                ADMIN_MODIFIED_DATA = deep_copy_data(GOOGLE_SYNCED_DATA)
                save_admin_data()
            
            update_display_data()
            
            return jsonify({
                'success': True, 
                'message': f'CSV imported successfully for {detected_month}! Merged {len(imported_teams)} teams.'
            })
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"CSV import error: {error_details}")
            return jsonify({'success': False, 'error': f'Error processing CSV: {str(e)}'})
    
    return jsonify({'success': False, 'error': 'Invalid file format'})

@app.route('/admin/api/download-template')
def download_template():
    """Download CSV template for current month"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    current_date = datetime.now()
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    current_month = month_names[current_date.month - 1]
    
    import calendar
    year = current_date.year
    month = current_date.month
    num_days = calendar.monthrange(year, month)[1]
    
    date_headers = []
    for day in range(1, num_days + 1):
        date_headers.append(f"{day}{current_month}")
    
    header_row = "Team,Name,ID," + ",".join(date_headers)
    date_row = ",,Date," + ",".join([""] * len(date_headers))
    example_row1 = f"Team A,John Doe,EMP001,{','.join(['M2'] * len(date_headers))}"
    example_row2 = f"Team B,Jane Smith,EMP002,{','.join(['M3'] * len(date_headers))}"
    
    template = "\n".join([header_row, date_row, example_row1, example_row2])
    
    response = app.response_class(
        template,
        mimetype='text/csv',
        headers={'Content-disposition': f'attachment; filename=roster_template_{current_month}.csv'}
    )
    
    return response

@app.route('/api/schedule-requests/submit-shift-change', methods=['POST'])
def submit_shift_change_request():
    """Submit a shift change request"""
    try:
        data = request.get_json()
        employee_id = data.get('employeeId')
        employee_name = data.get('employeeName')
        team = data.get('team')
        date = data.get('date')
        current_shift = data.get('currentShift')
        requested_shift = data.get('requestedShift')
        reason = data.get('reason')
        
        if not all([employee_id, employee_name, team, date, current_shift, requested_shift, reason]):
            return jsonify({'success': False, 'error': 'All fields are required'})
        
        request_data = SCHEDULE_REQUESTS.add_shift_change_request(
            employee_id, employee_name, team, date, current_shift, requested_shift, reason
        )
        
        return jsonify({'success': True, 'request': request_data})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/schedule-requests/submit-swap-request', methods=['POST'])
def submit_swap_request():
    """Submit a swap request"""
    try:
        data = request.get_json()
        requester_id = data.get('requesterId')
        requester_name = data.get('requesterName')
        target_employee_id = data.get('targetEmployeeId')
        target_employee_name = data.get('targetEmployeeName')
        team = data.get('team')
        date = data.get('date')
        requester_shift = data.get('requesterShift')
        target_shift = data.get('targetShift')
        reason = data.get('reason')
        
        if not all([requester_id, requester_name, target_employee_id, target_employee_name, team, date, requester_shift, target_shift, reason]):
            return jsonify({'success': False, 'error': 'All fields are required'})
        
        request_data = SCHEDULE_REQUESTS.add_swap_request(
            requester_id, requester_name, target_employee_id, target_employee_name, 
            team, date, requester_shift, target_shift, reason
        )
        
        return jsonify({'success': True, 'request': request_data})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/schedule-requests/get-team-members', methods=['POST'])
def get_team_members():
    """Get team members for swap requests"""
    try:
        data = request.get_json()
        team_name = data.get('teamName')
        current_employee_id = data.get('currentEmployeeId')
        date = data.get('date')
        
        if not all([team_name, current_employee_id, date]):
            return jsonify({'success': False, 'error': 'All fields are required'})
        
        team_members = SCHEDULE_REQUESTS.get_team_members(team_name, current_employee_id, date, ADMIN_MODIFIED_DATA)
        
        return jsonify({'success': True, 'teamMembers': team_members})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/schedule-requests/get-employee-requests', methods=['POST'])
def get_employee_requests():
    """Get requests for a specific employee"""
    try:
        data = request.get_json()
        employee_id = data.get('employeeId')
        
        if not employee_id:
            return jsonify({'success': False, 'error': 'Employee ID is required'})
        
        requests = SCHEDULE_REQUESTS.get_employee_requests(employee_id)
        
        return jsonify({'success': True, 'requests': requests})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# Admin routes for schedule requests management
@app.route('/admin/api/schedule-requests/get-pending')
def get_pending_schedule_requests():
    """Get all pending schedule requests for admin"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    pending_requests = SCHEDULE_REQUESTS.get_pending_requests()
    stats = {
        'pending_count': SCHEDULE_REQUESTS.requests['pending_count'],
        'approved_count': SCHEDULE_REQUESTS.requests['approved_count'],
        'total_shift_change': len(SCHEDULE_REQUESTS.requests['shift_change_requests']),
        'total_swap': len(SCHEDULE_REQUESTS.requests['swap_requests'])
    }
    
    return jsonify({
        'success': True,
        'pending_requests': pending_requests,
        'stats': stats
    })

@app.route('/admin/api/schedule-requests/update-status', methods=['POST'])
def update_schedule_request_status():
    """Update schedule request status (approve/reject)"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        request_id = data.get('requestId')
        status = data.get('status')  # 'approved' or 'rejected'
        
        if not request_id or status not in ['approved', 'rejected']:
            return jsonify({'success': False, 'error': 'Invalid request'})
        
        # Update the request status
        updated_request = SCHEDULE_REQUESTS.update_request_status(
            request_id, status, session.get('admin_username', 'admin')
        )
        
        if not updated_request:
            return jsonify({'success': False, 'error': 'Request not found'})
        
        # If approved, update the admin modified data
        if status == 'approved':
            if updated_request['type'] == 'shift_change':
                # Update single employee's shift
                apply_shift_change(updated_request)
            elif updated_request['type'] == 'swap':
                # Swap shifts between two employees
                apply_swap(updated_request)
            
            save_admin_data()
            update_display_data()
        
        return jsonify({'success': True, 'request': updated_request})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('static', path)

@app.route('/favicon.ico')
def favicon():
    """Serve favicon"""
    try:
        return send_from_directory(os.path.join('static', 'images'), 'favicon.ico')
    except:
        return "Favicon not found", 404

@app.errorhandler(404)
def not_found(error):
    return "Page not found", 404

@app.errorhandler(500)
def internal_error(error):
    return "Internal server error", 500

if __name__ == '__main__':
    required_files = [
        'templates/index.html',
        'templates/admin_login.html',
        'templates/admin_dashboard.html',
        'static/css/main.css',
        'static/css/calendar.css',
        'static/css/modal.css',
        'static/css/admin.css',
        'static/js/main.js',
        'static/js/admin.js',
        'static/js/auth.js'
    ]
    
    missing_files = []
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print("⚠️  Warning: Missing files:")
        for file in missing_files:
            print(f"   - {file}")
        print("\nPlease ensure all files are in the correct locations.")
    
    print("\n🚀 Cartup CxP Roster Viewer Server Starting...")
    print("📍 Local URL: http://localhost:5000")
    print("👑 Admin Panel: http://localhost:5000/admin")
    print("📁 File structure confirmed")
    print("💾 Data persistence: ENABLED")
    print(f"📂 Data directory: {DATA_DIR}")
    print(f"🔗 Google Sheets links: {len(GOOGLE_SHEETS_LINKS)} configured")
    print("\nPress Ctrl+C to stop the server")
    
    app.run(host='0.0.0.0', port=5000, debug=True)