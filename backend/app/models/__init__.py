from app.models.department import Department
from app.models.user import User
from app.models.lecturer import Lecturer
from app.models.student import Student
from app.models.course import Course
from app.models.enrolment import CourseEnrolment
from app.models.facial_enrolment import FacialEnrolment
from app.models.attendance_session import AttendanceSession
from app.models.attendance_log import AttendanceLog

__all__ = [
    "Department",
    "User",
    "Lecturer",
    "Student",
    "Course",
    "CourseEnrolment",
    "FacialEnrolment",
    "AttendanceSession",
    "AttendanceLog",
]
