from django.contrib.auth import authenticate
from django.contrib.auth.models import User

# pyrefly: ignore [missing-import]
from rest_framework import status
# pyrefly: ignore [missing-import]
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
# pyrefly: ignore [missing-import]
from rest_framework.response import Response

from .models import AttendanceRecord, EmailNotification, StudentProfile, Subject, Teacher
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.mail import send_mail
from django.conf import settings


#Auth 
@api_view(['POST'])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response(
            {'detail': 'Email and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Look up user(s) by email or username
    users = User.objects.filter(email=email)
    if not users.exists():
        users = User.objects.filter(username=email)

    if not users.exists():
        return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

    # Authenticate the matching users to find the correct one
    authenticated_user = None
    for u in users:
        auth_user = authenticate(request, username=u.username, password=password)
        if auth_user is not None:
            authenticated_user = auth_user
            break

    if not authenticated_user:
        return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

    user = authenticated_user

    # Check if user is admin (staff member)
    if user.is_staff:
        # Allow admin login without StudentProfile or Teacher check
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'is_admin': user.is_staff,
            'is_teacher': False,
            'is_student': False,
            'name': user.get_full_name() or user.username,
            'username': user.username,
            'email': user.email
        })

    is_student = False
    is_teacher = False
    name = user.get_full_name() or user.username

    try:
        student_profile = StudentProfile.objects.get(user=user)
        is_student = True
    except StudentProfile.DoesNotExist:
        try:
            teacher_profile = Teacher.objects.get(user=user)
            is_teacher = True
        except Teacher.DoesNotExist:
            return Response(
                {'detail': 'Your profile has not been created yet. Please contact the administrator.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'is_admin': user.is_staff,
        'is_teacher': is_teacher,
        'is_student': is_student,
        'name': name
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Allow logged-in users to change their password."""
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if not old_password or not new_password:
        return Response({'detail': 'Both old and new passwords are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = request.user
    if not user.check_password(old_password):
        return Response({'detail': 'Incorrect old password.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user.set_password(new_password)
    user.save()
    
    return Response({'detail': 'Password updated successfully.'}, status=status.HTTP_200_OK)


#Student Profile
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_profile(request):
    """Return logged-in student's profile info."""
    user = request.user
    try:
        profile = user.profile
        data = {
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'student_id': profile.student_id,
            'department': profile.department,
            'semester': profile.semester,
        }
    except StudentProfile.DoesNotExist:
        data = {
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'student_id': 'N/A',
            'department': 'N/A',
            'semester': 'N/A',
        }
    return Response(data)


#Dashboard Stats
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Overall attendance statistics for the logged-in student."""
    records = AttendanceRecord.objects.filter(student=request.user)
    total = records.count()
    present = records.filter(status=AttendanceRecord.STATUS_PRESENT).count()
    absent = records.filter(status=AttendanceRecord.STATUS_ABSENT).count()
    percentage = round((present / total) * 100) if total > 0 else 0

    # Calculate daily trend: cumulative attendance percentage over time
    student_records = AttendanceRecord.objects.filter(student=request.user).order_by('date')
    trend = []
    running_total = 0
    running_present = 0
    
    #Group by date to handle multiple classes in a single day
    date_groups = {}
    for r in student_records:
        date_str = r.date.isoformat()
        if date_str not in date_groups:
            date_groups[date_str] = {"total": 0, "present": 0}
        date_groups[date_str]["total"] += 1
        if r.status == AttendanceRecord.STATUS_PRESENT:
            date_groups[date_str]["present"] += 1
            
    # Now compute running average
    sorted_dates = sorted(date_groups.keys())
    for d_str in sorted_dates:
        running_total += date_groups[d_str]["total"]
        running_present += date_groups[d_str]["present"]
        pct = round((running_present / running_total) * 100)
        trend.append({
            "date": d_str,
            "percentage": pct,
            "present_today": date_groups[d_str]["present"],
            "total_today": date_groups[d_str]["total"]
        })

    return Response({
        'total_classes': total,
        'present': present,
        'absent': absent,
        'percentage': percentage,
        'trend': trend
    })


# Subject-wise Attendance
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subject_attendance(request):
    """Per-subject attendance breakdown for the logged-in student."""
    try:
        profile = request.user.profile
        # Fetch subjects matching student's department and semester
        if profile.department and profile.semester:
            enrolled_subjects = Subject.objects.filter(
                department__iexact=profile.department, 
                semester__iexact=profile.semester
            )
        else:
            enrolled_subjects = profile.subjects.all()
    except StudentProfile.DoesNotExist:
        enrolled_subjects = Subject.objects.none()

    result = []
    for subject in enrolled_subjects:
        records = AttendanceRecord.objects.filter(
            student=request.user, subject=subject
        )
        total = records.count()
        present = records.filter(status=AttendanceRecord.STATUS_PRESENT).count()
        absent = records.filter(status=AttendanceRecord.STATUS_ABSENT).count()
        percentage = round((present / total) * 100) if total > 0 else 0

        result.append({
            'name': subject.name,
            'code': subject.code,
            'total': total,
            'present': present,
            'absent': absent,
            'percentage': percentage,
            'syllabus_classes': subject.total_classes,
        })

    return Response(result)


# Attendance Records 
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_records(request):
    """Recent attendance records for the logged-in student."""
    records = AttendanceRecord.objects.filter(student=request.user).select_related('subject')[:50]

    data = [
        {
            'date': record.date.isoformat(),
            'subject': record.subject.name,
            'status': record.status,
            'time': record.time.strftime('%I:%M %p') if record.time else 'N/A',
        }
        for record in records
    ]
    return Response(data)


#Email Notifications
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def email_list(request):
    """All email notifications for the logged-in student."""
    emails = EmailNotification.objects.filter(student=request.user)
    data = [
        {
            'id': email.id,
            'subject': email.subject_line,
            'preview': email.preview,
            'date': email.sent_at.date().isoformat(),
            'read': email.is_read,
            'type': email.email_type,
        }
        for email in emails
    ]
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_email_read(request, pk):
    """Mark a specific email as read."""
    try:
        email = EmailNotification.objects.get(pk=pk, student=request.user)
    except EmailNotification.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    email.is_read = True
    email.save()
    return Response({'status': 'marked as read'})


#Legacy student list (keep for compatibility)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_list(request):
    students = User.objects.filter(profile__isnull=False).select_related('profile')
    data = [
        {
            'id': u.id,
            'name': u.get_full_name() or u.username,
            'email': u.email,
            'student_id': u.profile.student_id,
        }
        for u in students
    ]
    return Response(data)


#Teacher Endpoints

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_profile(request):
    """Return logged-in teacher's profile info."""
    try:
        profile = request.user.teacher_profile
        data = {
            'name': profile.full_name,
            'email': profile.email,
            'employee_id': profile.employee_id,
            'department': profile.department,
            'specialty': profile.specialty,
        }
    except Exception:
        data = {
            'name': request.user.get_full_name() or request.user.username,
            'email': request.user.email,
            'employee_id': 'N/A',
            'department': 'N/A',
            'specialty': 'N/A',
        }
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_subjects(request):
    """Return list of subjects assigned to the logged-in teacher."""
    try:
        profile = request.user.teacher_profile
        # Return subjects explicitly assigned subjects
        subjects = profile.subjects.all()
    except Exception:
        subjects = Subject.objects.none()

    data = [{
        'id': s.id,
        'name': s.name,
        'code': s.code,
        'department': s.department,
        'semester': s.semester,
    } for s in subjects]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_stats(request):
    """Return statistics for the logged-in teacher."""
    try:
        profile = request.user.teacher_profile
        subjects = profile.subjects.all()
    except Exception:
        return Response({'detail': 'Teacher profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    total_subjects = subjects.count()
    records = AttendanceRecord.objects.filter(subject__in=subjects)
    total_records = records.count()
    present_count = records.filter(status=AttendanceRecord.STATUS_PRESENT).count()
    absent_count = records.filter(status=AttendanceRecord.STATUS_ABSENT).count()

    # Get recent attendance sessions
    recent_sessions = []
    # Group records by date & subject
    grouped = records.values('date', 'subject__name', 'subject__code').distinct().order_by('-date')[:10]
    for g in grouped:
        date_records = records.filter(date=g['date'], subject__code=g['subject__code'])
        tot = date_records.count()
        pres = date_records.filter(status=AttendanceRecord.STATUS_PRESENT).count()
        recent_sessions.append({
            'date': g['date'].isoformat(),
            'subject_name': g['subject__name'],
            'subject_code': g['subject__code'],
            'total_students': tot,
            'present_count': pres,
            'percentage': round((pres / tot) * 100) if tot > 0 else 0
        })

    return Response({
        'total_subjects': total_subjects,
        'total_records': total_records,
        'present_count': present_count,
        'absent_count': absent_count,
        'recent_sessions': recent_sessions
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def contact_us(request):
    """Handle contact form submissions from the landing page."""
    name = request.data.get('name')
    email = request.data.get('email')
    message = request.data.get('message')

    if not name or not email or not message:
        return Response(
            {'detail': 'Name, email, and message are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    admin_email = getattr(settings, 'ADMIN_EMAIL', 'mayatamang0811@gmail.com')
    subject = f"New Contact Inquiry from {name}"
    body = f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"
    
    import threading
    
    def send_email_task():
        try:
            send_mail(
                subject,
                body,
                email,
                [admin_email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send email: {e}")

    # Start the email sending in a background thread so the UI doesn't freeze
    email_thread = threading.Thread(target=send_email_task)
    email_thread.start()
        
    return Response({'detail': 'Message sent successfully.'}, status=status.HTTP_200_OK)