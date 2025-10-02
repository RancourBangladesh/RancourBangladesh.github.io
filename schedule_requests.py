# schedule_requests.py - Schedule swap and change requests management
import json
import os
from datetime import datetime

SCHEDULE_REQUESTS_FILE = 'data/schedule_requests.json'

class ScheduleRequests:
    def __init__(self):
        self.requests = {}
        self.load_requests()
    
    def load_requests(self):
        """Load schedule requests from file"""
        try:
            if os.path.exists(SCHEDULE_REQUESTS_FILE):
                with open(SCHEDULE_REQUESTS_FILE, 'r', encoding='utf-8') as f:
                    self.requests = json.load(f)
            else:
                self.requests = {
                    'shift_change_requests': [],
                    'swap_requests': [],
                    'approved_count': 0,
                    'pending_count': 0
                }
                self.save_requests()
        except Exception as e:
            print(f"Error loading schedule requests: {e}")
            self.requests = {
                'shift_change_requests': [],
                'swap_requests': [],
                'approved_count': 0,
                'pending_count': 0
            }
    
    def save_requests(self):
        """Save schedule requests to file"""
        try:
            # Ensure data directory exists
            os.makedirs('data', exist_ok=True)
            with open(SCHEDULE_REQUESTS_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.requests, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error saving schedule requests: {e}")
            return False
    
    def add_shift_change_request(self, employee_id, employee_name, team, date, current_shift, requested_shift, reason):
        """Add a new shift change request"""
        request = {
            'id': f"shift_change_{len(self.requests['shift_change_requests']) + 1}",
            'employee_id': employee_id,
            'employee_name': employee_name,
            'team': team,
            'date': date,
            'current_shift': current_shift,
            'requested_shift': requested_shift,
            'reason': reason,
            'status': 'pending',  # pending, approved, rejected
            'type': 'shift_change',
            'created_at': datetime.now().isoformat(),
            'approved_at': None,
            'approved_by': None
        }
        
        self.requests['shift_change_requests'].append(request)
        self.update_counts()
        self.save_requests()
        return request
    
    def add_swap_request(self, requester_id, requester_name, target_employee_id, target_employee_name, team, date, requester_shift, target_shift, reason):
        """Add a new swap request"""
        request = {
            'id': f"swap_{len(self.requests['swap_requests']) + 1}",
            'requester_id': requester_id,
            'requester_name': requester_name,
            'target_employee_id': target_employee_id,
            'target_employee_name': target_employee_name,
            'team': team,
            'date': date,
            'requester_shift': requester_shift,
            'target_shift': target_shift,
            'reason': reason,
            'status': 'pending',  # pending, approved, rejected
            'type': 'swap',
            'created_at': datetime.now().isoformat(),
            'approved_at': None,
            'approved_by': None
        }
        
        self.requests['swap_requests'].append(request)
        self.update_counts()
        self.save_requests()
        return request
    
    def update_request_status(self, request_id, status, approved_by=None):
        """Update request status (approve/reject)"""
        # Search in shift change requests
        for request in self.requests['shift_change_requests']:
            if request['id'] == request_id:
                request['status'] = status
                if status == 'approved':
                    request['approved_at'] = datetime.now().isoformat()
                    request['approved_by'] = approved_by
                    self.requests['approved_count'] += 1
                self.update_counts()
                self.save_requests()
                return request
        
        # Search in swap requests
        for request in self.requests['swap_requests']:
            if request['id'] == request_id:
                request['status'] = status
                if status == 'approved':
                    request['approved_at'] = datetime.now().isoformat()
                    request['approved_by'] = approved_by
                    self.requests['approved_count'] += 1
                self.update_counts()
                self.save_requests()
                return request
        
        return None
    
    def update_counts(self):
        """Update pending and approved counts"""
        pending_count = 0
        # Count pending shift change requests
        pending_count += len([r for r in self.requests['shift_change_requests'] if r['status'] == 'pending'])
        # Count pending swap requests
        pending_count += len([r for r in self.requests['swap_requests'] if r['status'] == 'pending'])
        
        self.requests['pending_count'] = pending_count
    
    def get_pending_requests(self):
        """Get all pending requests"""
        pending_requests = []
        pending_requests.extend([r for r in self.requests['shift_change_requests'] if r['status'] == 'pending'])
        pending_requests.extend([r for r in self.requests['swap_requests'] if r['status'] == 'pending'])
        return pending_requests
    
    def get_employee_requests(self, employee_id):
        """Get all requests for a specific employee"""
        employee_requests = []
        # Get shift change requests for this employee
        employee_requests.extend([r for r in self.requests['shift_change_requests'] if r['employee_id'] == employee_id])
        # Get swap requests where this employee is requester or target
        employee_requests.extend([r for r in self.requests['swap_requests'] if r['requester_id'] == employee_id or r['target_employee_id'] == employee_id])
        return employee_requests
    
    def get_team_members(self, team_name, current_employee_id, date, admin_data):
        """Get team members for swap requests"""
        team_members = []
        if team_name in admin_data.get('teams', {}):
            for employee in admin_data['teams'][team_name]:
                if employee['id'] != current_employee_id:  # Exclude self
                    # Get shift for the specific date
                    date_index = admin_data['headers'].index(date) if date in admin_data['headers'] else -1
                    shift = employee['schedule'][date_index] if date_index != -1 and date_index < len(employee['schedule']) else ''
                    
                    team_members.append({
                        'id': employee['id'],
                        'name': employee['name'],
                        'shift': shift,
                        'shift_display': self.get_shift_display(shift)
                    })
        return team_members
    
    def get_shift_display(self, shift_code):
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

# Global instance
SCHEDULE_REQUESTS = ScheduleRequests()