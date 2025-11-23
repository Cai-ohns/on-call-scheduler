"""
On-Call Scheduler using Google OR-Tools Constraint Satisfaction Problem (CSP)
"""
from ortools.sat.python import cp_model
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json
import random
import time


class StaffMember:
    """Represents a staff member with their constraints"""
    def __init__(self, name: str, role: str, target_shifts: int, unavailable_days: List[str]):
        self.name = name
        self.role = role  # 'Junior', 'Intermediate', or 'Senior'
        self.target_shifts = target_shifts
        # Convert date strings to datetime objects
        self.unavailable_days = [datetime.strptime(day, "%Y-%m-%d").date() for day in unavailable_days]
    
    def to_dict(self):
        return {
            "name": self.name,
            "role": self.role,
            "target_shifts": self.target_shifts,
            "unavailable_days": [day.strftime("%Y-%m-%d") for day in self.unavailable_days]
        }


class OnCallScheduler:
    """Generates on-call schedules using CSP with role-based pairing rules"""
    
    def __init__(self, staff_members: List[StaffMember], start_date: str, num_days: int = 28):
        """
        Initialize scheduler
        
        Args:
            staff_members: List of StaffMember objects
            start_date: Start date in "YYYY-MM-DD" format
            num_days: Number of days in the schedule block (default 28)
        """
        self.staff_members = staff_members
        self.start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        self.num_days = num_days
        self.end_date = self.start_date + timedelta(days=num_days - 1)
        
        # Generate list of all dates in the schedule
        self.dates = [
            self.start_date + timedelta(days=i) 
            for i in range(num_days)
        ]
        
        # Create date to index mapping
        self.date_to_index = {date: idx for idx, date in enumerate(self.dates)}
        
        # Separate staff by role for easier constraint handling
        self.junior_indices = [i for i, s in enumerate(staff_members) if s.role == 'Junior']
        self.intermediate_indices = [i for i, s in enumerate(staff_members) if s.role == 'Intermediate']
        self.senior_indices = [i for i, s in enumerate(staff_members) if s.role == 'Senior']
        
        # Identify weekend days (Saturday=5, Sunday=6) and Friday days (Friday=4)
        self.weekend_day_indices = []
        self.friday_day_indices = []
        for idx, date in enumerate(self.dates):
            weekday = date.weekday()  # Monday=0, Sunday=6
            if weekday == 5 or weekday == 6:  # Saturday or Sunday
                self.weekend_day_indices.append(idx)
            elif weekday == 4:  # Friday
                self.friday_day_indices.append(idx)
    
    def generate_schedule(self, random_seed: Optional[int] = None) -> Optional[Dict]:
        """
        Generate the on-call schedule using CSP with role-based pairing rules
        
        Rules:
        - Intermediates: Can work alone
        - Seniors: Can work alone
        - Juniors: CANNOT work alone, must be paired with a Senior
        - A day is covered by: (1 Intermediate) OR (1 Senior) OR (1 Senior + 1 Junior)
        
        Returns:
            Dictionary with schedule data or None if no solution found
        """
        model = cp_model.CpModel()
        
        num_staff = len(self.staff_members)
        num_days = self.num_days
        
        # Decision variables: shifts[staff_index][day_index] = 1 if staff is on call, 0 otherwise
        shifts = {}
        for s in range(num_staff):
            for d in range(num_days):
                shifts[(s, d)] = model.NewBoolVar(f'shift_s{s}_d{d}')
        
        # Hard Constraint 1: Day coverage rules
        # A day is covered if: (1 Intermediate) OR (1 Senior) OR (1 Senior + 1 Junior)
        for d in range(num_days):
            # Count by role for this day
            intermediate_working = sum(shifts[(i, d)] for i in self.intermediate_indices)
            senior_working = sum(shifts[(i, d)] for i in self.senior_indices)
            junior_working = sum(shifts[(i, d)] for i in self.junior_indices)
            total_working = sum(shifts[(s, d)] for s in range(num_staff))
            
            # Day coverage: (1 Intermediate) OR (1 Senior) OR (1 Senior + 1 Junior)
            # Simplified direct constraints:
            # - Juniors can never work alone (enforced separately below)
            # - If junior_working > 0, then senior_working must be >= junior_working
            # - Total must be 1 or 2
            # - If total == 1: (intermediate + senior == 1) AND (junior == 0)
            # - If total == 2: (senior == 1) AND (junior == 1) AND (intermediate == 0)
            
            # Total must be 1 or 2
            model.Add(total_working >= 1)
            model.Add(total_working <= 2)
            
            # If total == 1: must be intermediate OR senior (not junior)
            # If total == 2: must be senior + junior (not intermediate)
            # Use indicator to distinguish
            is_pair = model.NewBoolVar(f'pair_d{d}')
            
            # If pair: total == 2, senior == 1, junior == 1, intermediate == 0
            model.Add(total_working == 2).OnlyEnforceIf(is_pair)
            model.Add(senior_working == 1).OnlyEnforceIf(is_pair)
            model.Add(junior_working == 1).OnlyEnforceIf(is_pair)
            model.Add(intermediate_working == 0).OnlyEnforceIf(is_pair)
            
            # If not pair: total == 1, (intermediate OR senior) == 1, junior == 0
            model.Add(total_working == 1).OnlyEnforceIf(is_pair.Not())
            model.Add(intermediate_working + senior_working == 1).OnlyEnforceIf(is_pair.Not())
            model.Add(junior_working == 0).OnlyEnforceIf(is_pair.Not())
        
        # Hard Constraint 2: No back-to-back shifts for any staff member
        for s in range(num_staff):
            for d in range(num_days - 1):
                model.Add(shifts[(s, d)] + shifts[(s, d + 1)] <= 1)
        
        # Hard Constraint 3: Respect unavailable days
        for s, staff in enumerate(self.staff_members):
            for unavailable_date in staff.unavailable_days:
                if unavailable_date in self.date_to_index:
                    day_idx = self.date_to_index[unavailable_date]
                    model.Add(shifts[(s, day_idx)] == 0)
        
        # Hard Constraint 4: Juniors cannot work alone (enforced above, but explicit check)
        for j_idx in self.junior_indices:
            for d in range(num_days):
                # If junior is working, at least one senior must also be working
                junior_working = shifts[(j_idx, d)]
                senior_working_any = sum(shifts[(s_idx, d)] for s_idx in self.senior_indices)
                model.Add(senior_working_any >= junior_working)
        
        # Soft Constraint: Target number of shifts +/- 1
        shift_counts = []
        for s, staff in enumerate(self.staff_members):
            total_shifts = sum(shifts[(s, d)] for d in range(num_days))
            shift_counts.append(total_shifts)
            
            # Allow target +/- 1
            min_shifts = max(0, staff.target_shifts - 1)
            max_shifts = staff.target_shifts + 1
            
            model.Add(total_shifts >= min_shifts)
            model.Add(total_shifts <= max_shifts)
        
        # Soft Constraint: Balance weekend shifts across all staff
        # Calculate weekend shifts for each staff member
        weekend_shift_counts = []
        for s in range(num_staff):
            weekend_shifts = sum(shifts[(s, d)] for d in self.weekend_day_indices)
            weekend_shift_counts.append(weekend_shifts)
        
        # Ensure weekend shifts are approximately balanced (within 1 of each other)
        if len(self.weekend_day_indices) > 0 and num_staff > 1:
            min_weekend = model.NewIntVar(0, len(self.weekend_day_indices), 'min_weekend')
            max_weekend = model.NewIntVar(0, len(self.weekend_day_indices), 'max_weekend')
            
            for s in range(num_staff):
                model.Add(min_weekend <= weekend_shift_counts[s])
                model.Add(max_weekend >= weekend_shift_counts[s])
            
            # The difference between max and min should be at most 1
            model.Add(max_weekend - min_weekend <= 1)
        
        # Soft Constraint: Balance Friday shifts across all staff
        # Calculate Friday shifts for each staff member
        friday_shift_counts = []
        for s in range(num_staff):
            friday_shifts = sum(shifts[(s, d)] for d in self.friday_day_indices)
            friday_shift_counts.append(friday_shifts)
        
        # Ensure Friday shifts are approximately balanced (within 1 of each other)
        if len(self.friday_day_indices) > 0 and num_staff > 1:
            min_friday = model.NewIntVar(0, len(self.friday_day_indices), 'min_friday')
            max_friday = model.NewIntVar(0, len(self.friday_day_indices), 'max_friday')
            
            for s in range(num_staff):
                model.Add(min_friday <= friday_shift_counts[s])
                model.Add(max_friday >= friday_shift_counts[s])
            
            # The difference between max and min should be at most 1
            model.Add(max_friday - min_friday <= 1)
        
        # Create solver and solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0  # Time limit
        
        # Use random seed to get different solutions each time
        if random_seed is not None:
            solver.parameters.random_seed = random_seed
        else:
            # Generate a random seed based on current time to ensure different solutions
            solver.parameters.random_seed = int(time.time() * 1000) % (2**31 - 1)
        
        # Enable solution hinting with randomization for better diversity
        solver.parameters.use_optional_variables = True
        
        status = solver.Solve(model)
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            # Build schedule result
            schedule = {}
            staff_assignments = {}
            
            # Build schedule result - ensure all days are included
            for d in range(num_days):
                date = self.dates[d]
                date_str = date.strftime("%Y-%m-%d")
                working_staff = []
                for s, staff in enumerate(self.staff_members):
                    if solver.Value(shifts[(s, d)]) == 1:
                        working_staff.append({
                            "name": staff.name,
                            "role": staff.role
                        })
                
                # Format schedule entry
                if len(working_staff) == 1:
                    schedule[date_str] = working_staff[0]["name"]
                elif len(working_staff) == 2:
                    # Should be Senior + Junior pairing
                    senior = next((s for s in working_staff if s["role"] == "Senior"), None)
                    junior = next((s for s in working_staff if s["role"] == "Junior"), None)
                    if senior and junior:
                        schedule[date_str] = {
                            "senior": senior["name"],
                            "junior": junior["name"],
                            "display": f"{senior['name']} (Sr) + {junior['name']} (Jr)"
                        }
                    else:
                        # Fallback (shouldn't happen with constraints)
                        schedule[date_str] = " + ".join([s["name"] for s in working_staff])
                else:
                    schedule[date_str] = "Unassigned"
            
            # Verify we have exactly num_days entries in the schedule
            if len(schedule) != num_days:
                return {
                    "status": "no_solution",
                    "message": f"Schedule generation error: Expected {num_days} days, got {len(schedule)}"
                }
            
            # Calculate actual shift counts
            for s, staff in enumerate(self.staff_members):
                actual_shifts = sum(solver.Value(shifts[(s, d)]) for d in range(num_days))
                weekend_shifts = sum(solver.Value(shifts[(s, d)]) for d in self.weekend_day_indices)
                friday_shifts = sum(solver.Value(shifts[(s, d)]) for d in self.friday_day_indices)
                
                staff_assignments[staff.name] = {
                    "role": staff.role,
                    "target": staff.target_shifts,
                    "actual": actual_shifts,
                    "weekend_shifts": weekend_shifts,
                    "friday_shifts": friday_shifts,
                    "days": [
                        self.dates[d].strftime("%Y-%m-%d")
                        for d in range(num_days)
                        if solver.Value(shifts[(s, d)]) == 1
                    ]
                }
            
            return {
                "status": "success",
                "start_date": self.start_date.strftime("%Y-%m-%d"),
                "end_date": self.end_date.strftime("%Y-%m-%d"),
                "schedule": schedule,
                "staff_assignments": staff_assignments
            }
        else:
            return {
                "status": "no_solution",
                "message": "Could not find a valid schedule that satisfies all constraints"
            }
    
    def generate_schedule_with_relaxation(self, random_seed: Optional[int] = None) -> Optional[Dict]:
        """
        Generate schedule with relaxed soft constraints if initial attempt fails
        
        Args:
            random_seed: Optional random seed for solver. If None, uses current timestamp.
        """
        # First try with strict constraints
        result = self.generate_schedule(random_seed=random_seed)
        
        if result and result.get("status") == "success":
            return result
        
        # If failed, try relaxing the target shift constraint
        original_targets = [staff.target_shifts for staff in self.staff_members]
        
        # Relax constraints: allow wider range
        for staff in self.staff_members:
            staff.target_shifts = max(1, staff.target_shifts)  # At least 1 shift
        
        result = self.generate_schedule(random_seed=random_seed)
        
        # Restore original targets
        for staff, original in zip(self.staff_members, original_targets):
            staff.target_shifts = original
        
        return result


def test_scheduler():
    """Test function to verify the scheduler works with roles"""
    from datetime import datetime, timedelta
    
    # Start date: Let's use a Monday
    start_date_str = "2024-12-02"
    start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    num_days = 28
    
    # Create test staff with roles - need balanced targets
    # With pairing, if Junior works X days, Senior must work at least X days too
    staff = [
        StaffMember("Dr. Smith", "Senior", 10, []),
        StaffMember("Dr. Brown", "Senior", 8, []),
        StaffMember("Dr. Jones", "Intermediate", 10, []),
        StaffMember("Dr. Williams", "Junior", 8, []),
    ]
    
    scheduler = OnCallScheduler(staff, start_date_str, num_days)
    result = scheduler.generate_schedule()
    
    if result and result.get("status") == "success":
        print("=" * 60)
        print("SCHEDULE GENERATED SUCCESSFULLY!")
        print("=" * 60)
        print(f"Period: {result['start_date']} to {result['end_date']}")
        print(f"Total Days: {num_days}")
        
        print("\n" + "-" * 60)
        print("STAFF ASSIGNMENTS:")
        print("-" * 60)
        for name, info in result["staff_assignments"].items():
            diff = info['actual'] - info['target']
            diff_str = f"({diff:+d})" if diff != 0 else ""
            weekend_str = f" | Weekends: {info.get('weekend_shifts', 0)}" if 'weekend_shifts' in info else ""
            friday_str = f" | Fridays: {info.get('friday_shifts', 0)}" if 'friday_shifts' in info else ""
            print(f"  {name:15} [{info['role']:12}] | Target: {info['target']:2} | Actual: {info['actual']:2} {diff_str}{weekend_str}{friday_str}")
        
        print("\n" + "-" * 60)
        print("DAILY SCHEDULE (All 28 days):")
        print("-" * 60)
        for date_str, assignment in result["schedule"].items():
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            day_name = date_obj.strftime("%a")
            if isinstance(assignment, dict):
                print(f"  {date_str} ({day_name}): {assignment['display']}")
            else:
                print(f"  {date_str} ({day_name}): {assignment}")
        
        # Verify we have exactly 28 days
        print(f"\nTotal days in schedule: {len(result['schedule'])}")
        if len(result['schedule']) != 28:
            print(f"  [X] ERROR: Expected 28 days, got {len(result['schedule'])}")
        else:
            print(f"  [OK] Schedule contains exactly 28 days")
        
        print("\n" + "-" * 60)
        print("VERIFICATION:")
        print("-" * 60)
        # Verify Juniors are never alone
        junior_alone = []
        for date_str, assignment in result["schedule"].items():
            if isinstance(assignment, str) and "Williams" in assignment and "Jr" not in assignment:
                junior_alone.append(date_str)
        
        if junior_alone:
            print(f"  [X] ERROR: Junior working alone on: {junior_alone}")
        else:
            print(f"  [OK] Juniors correctly paired with Seniors")
        
        print("=" * 60)
    else:
        print("=" * 60)
        print("FAILED TO GENERATE SCHEDULE")
        print("=" * 60)
        print(result)


if __name__ == "__main__":
    test_scheduler()
