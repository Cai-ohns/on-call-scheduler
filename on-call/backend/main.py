"""
FastAPI backend for On-Call Scheduler
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from scheduler import StaffMember, OnCallScheduler
from database import init_db, get_db, Staff, StaffRole

app = FastAPI(title="On-Call Scheduler API", version="1.0.0")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# CORS middleware to allow frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StaffInput(BaseModel):
    name: str = Field(..., description="Staff member name")
    role: str = Field(..., description="Staff role: Junior, Intermediate, or Senior")
    target_shifts: int = Field(..., ge=1, description="Target number of shifts")
    unavailable_days: List[str] = Field(default_factory=list, description="List of unavailable dates (YYYY-MM-DD)")


class ScheduleRequest(BaseModel):
    staff: List[StaffInput] = Field(..., description="List of staff members")
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    num_days: int = Field(default=28, ge=7, le=90, description="Number of days in schedule block (default: 28 days - standard 4-week block)")
    random_seed: Optional[int] = Field(default=None, description="Optional random seed for generating different schedules")


class ScheduleResponse(BaseModel):
    status: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    schedule: Optional[dict] = None
    staff_assignments: Optional[dict] = None
    message: Optional[str] = None


# Staff Roster Models
class StaffCreate(BaseModel):
    name: str = Field(..., description="Staff member name")
    role: str = Field(..., description="Staff role: Junior, Intermediate, or Senior")
    default_target_shifts: int = Field(..., ge=1, description="Default target number of shifts")


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    default_target_shifts: Optional[int] = Field(None, ge=1)


class StaffResponse(BaseModel):
    id: int
    name: str
    role: str
    default_target_shifts: int


@app.get("/")
async def root():
    return {"message": "On-Call Scheduler API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Staff Roster CRUD Endpoints
@app.get("/api/staff", response_model=List[StaffResponse])
async def get_staff(db: Session = Depends(get_db)):
    """Get all staff members"""
    staff = db.query(Staff).all()
    return [StaffResponse(**s.to_dict()) for s in staff]


@app.post("/api/staff", response_model=StaffResponse)
async def create_staff(staff_data: StaffCreate, db: Session = Depends(get_db)):
    """Create a new staff member"""
    valid_roles = ['Junior', 'Intermediate', 'Senior']
    if staff_data.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{staff_data.role}'. Must be one of: {', '.join(valid_roles)}"
        )
    
    # Check if staff with same name already exists
    existing = db.query(Staff).filter(Staff.name == staff_data.name).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Staff member with name '{staff_data.name}' already exists"
        )
    
    # Map string role to enum
    role_enum = StaffRole[staff_data.role.upper()]
    
    staff = Staff(
        name=staff_data.name,
        role=role_enum,
        default_target_shifts=staff_data.default_target_shifts
    )
    
    db.add(staff)
    db.commit()
    db.refresh(staff)
    
    return StaffResponse(**staff.to_dict())


@app.put("/api/staff/{staff_id}", response_model=StaffResponse)
async def update_staff(staff_id: int, staff_data: StaffUpdate, db: Session = Depends(get_db)):
    """Update a staff member"""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    if staff_data.name is not None:
        # Check if new name conflicts with existing staff
        existing = db.query(Staff).filter(Staff.name == staff_data.name, Staff.id != staff_id).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Staff member with name '{staff_data.name}' already exists"
            )
        staff.name = staff_data.name
    
    if staff_data.role is not None:
        valid_roles = ['Junior', 'Intermediate', 'Senior']
        if staff_data.role not in valid_roles:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role '{staff_data.role}'. Must be one of: {', '.join(valid_roles)}"
            )
        staff.role = StaffRole[staff_data.role.upper()]
    
    if staff_data.default_target_shifts is not None:
        staff.default_target_shifts = staff_data.default_target_shifts
    
    db.commit()
    db.refresh(staff)
    
    return StaffResponse(**staff.to_dict())


@app.delete("/api/staff/{staff_id}")
async def delete_staff(staff_id: int, db: Session = Depends(get_db)):
    """Delete a staff member"""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    db.delete(staff)
    db.commit()
    
    return {"message": "Staff member deleted successfully"}


@app.post("/api/schedule/generate", response_model=ScheduleResponse)
async def generate_schedule(request: ScheduleRequest):
    """
    Generate an on-call schedule based on staff constraints
    """
    try:
        # Validate start date
        try:
            datetime.strptime(request.start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
        
        # Validate staff data
        valid_roles = ['Junior', 'Intermediate', 'Senior']
        for staff_input in request.staff:
            if staff_input.role not in valid_roles:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid role '{staff_input.role}' for {staff_input.name}. Must be one of: {', '.join(valid_roles)}"
                )
            
            for day in staff_input.unavailable_days:
                try:
                    datetime.strptime(day, "%Y-%m-%d")
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid date format in unavailable_days for {staff_input.name}. Use YYYY-MM-DD"
                    )
        
        # Validate we have at least one Senior (required for Junior pairing)
        has_senior = any(s.role == 'Senior' for s in request.staff)
        has_junior = any(s.role == 'Junior' for s in request.staff)
        
        if has_junior and not has_senior:
            raise HTTPException(
                status_code=400,
                detail="At least one Senior staff member is required when Junior staff are present"
            )
        
        # Validate we have at least 2 staff members
        if len(request.staff) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least 2 staff members are required to generate a schedule"
            )
        
        # Convert to StaffMember objects
        staff_members = [
            StaffMember(
                name=staff.name,
                role=staff.role,
                target_shifts=staff.target_shifts,
                unavailable_days=staff.unavailable_days
            )
            for staff in request.staff
        ]
        
        # Create scheduler and generate schedule
        scheduler = OnCallScheduler(
            staff_members=staff_members,
            start_date=request.start_date,
            num_days=request.num_days
        )
        
        # Use provided random seed or generate one based on timestamp for variety
        import time
        random_seed = request.random_seed
        if random_seed is None:
            random_seed = int(time.time() * 1000) % (2**31 - 1)
        
        result = scheduler.generate_schedule_with_relaxation(random_seed=random_seed)
        
        if not result or result.get("status") != "success":
            return ScheduleResponse(
                status="error",
                message=result.get("message", "Failed to generate schedule") if result else "Unknown error"
            )
        
        return ScheduleResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/api/schedule/validate")
async def validate_schedule_request(request: ScheduleRequest):
    """
    Validate schedule request without generating schedule
    """
    try:
        # Validate start date
        datetime.strptime(request.start_date, "%Y-%m-%d")
        
        # Validate staff data
        if len(request.staff) < 2:
            return {"valid": False, "message": "At least 2 staff members are required"}
        
        valid_roles = ['Junior', 'Intermediate', 'Senior']
        has_senior = False
        has_junior = False
        
        for staff_input in request.staff:
            if not staff_input.name.strip():
                return {"valid": False, "message": "Staff name cannot be empty"}
            
            if staff_input.role not in valid_roles:
                return {"valid": False, "message": f"Invalid role '{staff_input.role}' for {staff_input.name}. Must be one of: {', '.join(valid_roles)}"}
            
            if staff_input.role == 'Senior':
                has_senior = True
            if staff_input.role == 'Junior':
                has_junior = True
            
            if staff_input.target_shifts < 1:
                return {"valid": False, "message": f"Target shifts must be at least 1 for {staff_input.name}"}
            
            for day in staff_input.unavailable_days:
                try:
                    datetime.strptime(day, "%Y-%m-%d")
                except ValueError:
                    return {"valid": False, "message": f"Invalid date format: {day}"}
        
        if has_junior and not has_senior:
            return {"valid": False, "message": "At least one Senior staff member is required when Junior staff are present"}
        
        return {"valid": True, "message": "Request is valid"}
    
    except ValueError:
        return {"valid": False, "message": "Invalid start_date format. Use YYYY-MM-DD"}
    except Exception as e:
        return {"valid": False, "message": f"Validation error: {str(e)}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

