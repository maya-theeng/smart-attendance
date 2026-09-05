from django.urls import path
from . import views
from . import admin_views

urlpatterns = [
    # Auth
    path('auth/login/', views.login_view),
    path('auth/change-password/', views.change_password),

    # Student
    path('student/profile/', views.student_profile),
    path('students/', views.student_list),

    # Teacher
    path('teacher/profile/', views.teacher_profile),
    path('teacher/subjects/', views.teacher_subjects),
    path('teacher/stats/', views.teacher_stats),

    # Dashboard
    path('dashboard/stats/', views.dashboard_stats),
    path('dashboard/subjects/', views.subject_attendance),

    # Attendance
    path('attendance/records/', views.attendance_records),

    # Emails
    path('emails/', views.email_list),
    path('emails/<int:pk>/read/', views.mark_email_read),
    
    # Contact
    path('contact/', views.contact_us),
    
    # -----------------------------------------------------------------
    # ADMIN API ROUTES
    # -----------------------------------------------------------------
    path('admin/dashboard/stats/', admin_views.admin_dashboard_stats),
    path('admin/dashboard/monthly-report/', admin_views.admin_monthly_report),
    path('admin/students/', admin_views.admin_students_list),
    path('admin/students/<int:user_id>/', admin_views.admin_student_detail),
    path('admin/students/<int:user_id>/upload-face/', admin_views.admin_student_face_upload),
    path('admin/attendance/records/', admin_views.admin_attendance_records),
    path('admin/attendance/mark/', admin_views.admin_mark_attendance),
    path('admin/attendance/recognize/', admin_views.admin_recognize_faces),
    path('admin/subjects/', admin_views.admin_subjects),
    path('admin/subjects/<int:subject_id>/', admin_views.admin_subject_detail),
    path('admin/courses/', admin_views.admin_courses),
    path('admin/courses/<int:course_id>/', admin_views.admin_course_detail),
    path('admin/teachers/', admin_views.admin_teachers),
    path('admin/teachers/<int:teacher_id>/', admin_views.admin_teacher_detail),
    path('admin/teachers/<int:teacher_id>/upload-face/', admin_views.admin_teacher_face_upload),
    path('admin/attendance/recognize-staff/', admin_views.admin_recognize_staff_faces),
    path('admin/notifications/send-absent-warnings/', admin_views.admin_send_absent_warnings),
    path('admin/notifications/send-low-attendance-warnings/', admin_views.admin_send_low_attendance_warnings),
]