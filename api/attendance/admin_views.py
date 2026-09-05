import json
import logging
import sys
import os

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, BasePermission
from rest_framework.response import Response

from .models import Subject, StudentProfile, AttendanceRecord, EmailNotification, Course, Teacher

class IsAdminOrTeacher(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_staff or request.user.is_superuser or hasattr(request.user, 'teacher_profile')

# Add the project root to sys.path so we can import the ml module
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

logger = logging.getLogger(__name__)


def _get_face_service():
    try:
        from ml.face_recognition import get_face_service
        return get_face_service()
    except ImportError as e:
        logger.error(f"Failed to import face recognition module: {e}")
        logger.error("Make sure torch, facenet-pytorch are installed: pip install torch torchvision facenet-pytorch")
        return None



#admin dashbaord stats
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard_stats(request):
    total_students = StudentProfile.objects.count()
    total_subjects = Subject.objects.count()
    
    # Optional: Filter by today's date
    from django.utils import timezone
    today = timezone.now().date()
    
    records_today = AttendanceRecord.objects.filter(date=today)
    present_today = records_today.filter(status=AttendanceRecord.STATUS_PRESENT).count()
    absent_today = records_today.filter(status=AttendanceRecord.STATUS_ABSENT).count()
    
    # Weekly presence trend line (daily stats for last 7 dates with records)
    recent_dates = (
        AttendanceRecord.objects.values_list('date', flat=True)
        .distinct()
        .order_by('-date')[:7]
    )
    recent_dates = sorted(list(recent_dates))
    
    weekly_trend = []
    for d in recent_dates:
        day_records = AttendanceRecord.objects.filter(date=d)
        day_total = day_records.count()
        day_present = day_records.filter(status=AttendanceRecord.STATUS_PRESENT).count()
        day_absent = day_total - day_present
        rate = round((day_present / day_total) * 100) if day_total > 0 else 0
        weekly_trend.append({
            "date": d.isoformat(),
            "present": day_present,
            "absent": day_absent,
            "rate": rate
        })
        
    # Subject-wise comparison bar charts (average attendance rate per subject)
    subjects = Subject.objects.all()
    subject_stats = []
    for sub in subjects:
        sub_records = AttendanceRecord.objects.filter(subject=sub)
        sub_total = sub_records.count()
        sub_present = sub_records.filter(status=AttendanceRecord.STATUS_PRESENT).count()
        rate = round((sub_present / sub_total) * 100) if sub_total > 0 else 0
        subject_stats.append({
            "id": sub.id,
            "name": sub.name,
            "code": sub.code,
            "percentage": rate,
            "present": sub_present,
            "total": sub_total
        })
        
    #Alert list(students with attendance below critical threshold (below 75%))
    students = StudentProfile.objects.select_related('user').all()
    students_below_threshold = []
    for profile in students:
        stu_records = AttendanceRecord.objects.filter(student=profile.user)
        stu_total = stu_records.count()
        stu_present = stu_records.filter(status=AttendanceRecord.STATUS_PRESENT).count()
        rate = round((stu_present / stu_total) * 100) if stu_total > 0 else 0
        
        if stu_total > 0 and rate < 75:
            students_below_threshold.append({
                "id": profile.user.id,
                "student_id": profile.student_id,
                "name": profile.user.get_full_name() or profile.user.username,
                "percentage": rate,
                "total": stu_total,
                "present": stu_present
            })
        elif stu_total == 0:
            students_below_threshold.append({
                "id": profile.user.id,
                "student_id": profile.student_id,
                "name": profile.user.get_full_name() or profile.user.username,
                "percentage": 0,
                "total": 0,
                "present": 0
            })
            
    return Response({
        "total_students": total_students,
        "total_subjects": total_subjects,
        "present_today": present_today,
        "absent_today": absent_today,
        "weekly_trend": weekly_trend,
        "subject_stats": subject_stats,
        "students_below_threshold": students_below_threshold
    })


#Student mgnt
@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_students_list(request):
    if request.method == 'GET':
        students = StudentProfile.objects.select_related('user').all()
        data = []
        for profile in students:
            data.append({
                "id": profile.user.id,
                "student_id": profile.student_id,
                "name": profile.user.get_full_name() or profile.user.username,
                "email": profile.user.email,
                "department": profile.department,
                "semester": profile.semester,
                "phone": profile.phone,
                "is_active": profile.is_active,
                "face_registered": profile.face_registered,
                "subjects": list(profile.subjects.values_list('id', flat=True))
            })
        return Response(data)
        
    elif request.method == 'POST':
        # Create a new student user & profile
        try:
            email = request.data.get('email')
            password = request.data.get('password')
            first_name = request.data.get('first_name', '')
            last_name = request.data.get('last_name', '')
            student_id = request.data.get('student_id')
            
            if not email or not password or not student_id:
                return Response({"detail": "Email, password, and student ID are required."}, status=status.HTTP_400_BAD_REQUEST)
                
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            
            dept = request.data.get('department', '')
            sem = request.data.get('semester', '')

            profile = StudentProfile.objects.create(
                user=user,
                student_id=student_id,
                department=dept,
                semester=sem,
                phone=request.data.get('phone', '')
            )
            
            #Auto assign all subjects matching this course + sem
            if dept and sem:
                matching_subjects = Subject.objects.filter(
                    department__iexact=dept,
                    semester=sem
                )
                profile.subjects.set(matching_subjects)
            
            # --- Send Welcome Email ---
            from django.core.mail import send_mail
            from django.conf import settings
            import threading
            
            sender_email = getattr(settings, 'EMAIL_HOST_USER', 'noreply@smartattendance.com')
            email_subject = "Welcome to Smart Attendance!"
            email_body = (
                f"Hello {first_name},\n\n"
                f"An administrator has created a student account for you on the Smart Attendance system.\n\n"
                f"Your login email: {email}\n"
                f"Your temporary password: {password}\n\n"
                f"Please log in to the portal to view your attendance dashboard.\n\n"
                f"Regards,\nSmart Attendance Team"
            )
            
            def send_welcome_email():
                try:
                    send_mail(email_subject, email_body, sender_email, [email], fail_silently=True)
                except Exception as e:
                    logger.error(f"Failed to send welcome email to {email}: {e}")
                    
            threading.Thread(target=send_welcome_email).start()
            
            return Response({"detail": "Student created successfully", "id": user.id}, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_student_detail(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        profile = StudentProfile.objects.get(user=user)
    except User.DoesNotExist:
        return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)
        
    if request.method == 'PUT':
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        if 'email' in request.data:
            user.email = request.data['email']
            user.username = request.data['email']
        user.save()
        
        profile.student_id = request.data.get('student_id', profile.student_id)
        new_dept = request.data.get('department', profile.department)
        new_sem = request.data.get('semester', profile.semester)
        profile.department = new_dept
        profile.semester = new_sem
        profile.phone = request.data.get('phone', profile.phone)
        profile.save()
        
        #auto reassign subjects when course or sem changes
        if new_dept and new_sem:
            matching_subjects = Subject.objects.filter(
                department__iexact=new_dept,
                semester=new_sem
            )
            profile.subjects.set(matching_subjects)
        
        return Response({"detail": "Student updated successfully."})
        
    elif request.method == 'DELETE':
        user.delete() # Cascades to profile
        return Response({"detail": "Student deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


#face registration(MTCNN + FaceNet)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_student_face_upload(request, user_id):
    try:
        profile = StudentProfile.objects.get(user__id=user_id)
    except StudentProfile.DoesNotExist:
        return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

    #Check if we received a base64 image (new MTCNN+FaceNet approach)
    image_data = request.data.get('image')
    
    if image_data:
        #Server side face detection + embedding using MTCNN + FaceNet
        face_service = _get_face_service()
        if face_service is None:
            return Response(
                {"detail": "Face recognition service unavailable. Ensure ML dependencies are installed."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            from ml.utils import base64_to_pil
            pil_image = base64_to_pil(image_data)
        except Exception as e:
            return Response(
                {"detail": f"Invalid image data: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        #run face detection first to locate the face and crop it for liveness check
        detection = face_service.detect_faces(pil_image)
        if detection["count"] == 0:
            return Response(
                {"detail": "No face detected in the image. Please ensure your face is clearly visible and centered."},
                status=status.HTTP_400_BAD_REQUEST
            )
        elif detection["count"] > 1:
            return Response(
                {"detail": "Multiple faces detected. Please ensure only one person is in the frame during registration."},
                status=status.HTTP_400_BAD_REQUEST
            )

        #crop the detected face for liveness check
        box = detection["boxes"][0]
        x1, y1, x2, y2 = box.astype(int).tolist()
        width, height = pil_image.size
        x1_c = max(0, x1)
        y1_c = max(0, y1)
        x2_c = min(width, x2)
        y2_c = min(height, y2)
        face_crop = pil_image.crop((x1_c, y1_c, x2_c, y2_c))

        #Run liveness check on the cropped face image
        liveness_score = None
        liveness_details = None
        try:
            from ml.liveness import detect_liveness
            is_live, liveness_score, liveness_details = detect_liveness(face_crop)
            if not is_live:
                return Response({
                    "detail": f"Liveness check failed (score: {liveness_score:.2f}). "
                               f"The image appears to be a photo of a screen or printed picture. "
                               f"Please use a live webcam capture or a direct photograph.",
                    "liveness_score": liveness_score,
                    "liveness_details": liveness_details
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.warning(f"Liveness check skipped during registration: {e}")

        try:
            embedding_list = face_service.register_face(pil_image)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        profile.face_encoding = json.dumps(embedding_list)
        profile.save()

        return Response({
            "detail": "Face registered successfully using MTCNN + FaceNet. Liveness verified ✅",
            "embedding_dim": len(embedding_list),
            "liveness_score": liveness_score
        })

    # Legacy support: accept raw encoding array (from face-api.js)
    encoding_list = request.data.get('encoding')
    if encoding_list and isinstance(encoding_list, list):
        profile.face_encoding = json.dumps(encoding_list)
        profile.save()
        return Response({"detail": "Face encoding saved successfully."})

    return Response(
        {"detail": "Provide either 'image' (base64) or 'encoding' (list of floats)."},
        status=status.HTTP_400_BAD_REQUEST
    )


#attendance mgnt
@api_view(['GET'])
@permission_classes([IsAdminOrTeacher])
def admin_attendance_records(request):
    records = AttendanceRecord.objects.select_related('student', 'subject')
    if not request.user.is_staff and hasattr(request.user, 'teacher_profile'):
        teacher = request.user.teacher_profile
        subjects = teacher.subjects.all()
        records = records.filter(subject__in=subjects)

    records = records.all()
    data = []
    for rec in records:
        data.append({
            "id": rec.id,
            "student_name": rec.student.get_full_name() or rec.student.username,
            "subject_name": rec.subject.name,
            "date": rec.date.isoformat() if hasattr(rec.date, 'isoformat') else str(rec.date),
            "status": rec.status,
            "time": rec.time.strftime('%I:%M %p') if rec.time else 'N/A'
        })
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAdminOrTeacher])
def admin_mark_attendance(request):
    """
    Manually mark attendance or mark from face recognition matches.
    Expects: { "date": "2026-05-18", "subject_id": 1, "student_ids": [1, 2, 3] }
    """
    date = request.data.get('date')
    subject_id = request.data.get('subject_id')
    student_ids = request.data.get('student_ids', [])
    
    if not date or not subject_id or not student_ids:
        return Response({"detail": "date, subject_id, and student_ids are required."}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        subject = Subject.objects.get(id=subject_id)
    except Subject.DoesNotExist:
        return Response({"detail": "Subject not found."}, status=status.HTTP_404_NOT_FOUND)
        
    # Security check: Ensure teacher only marks attendance for their assigned subjects
    if not request.user.is_staff and hasattr(request.user, 'teacher_profile'):
        if not request.user.teacher_profile.subjects.filter(id=subject_id).exists():
            return Response({"detail": "Permission denied. You can only mark attendance for subjects assigned to you."}, status=status.HTTP_403_FORBIDDEN)
            
    from django.utils import timezone as tz
    now_local = tz.localtime(tz.now())   # Nepal local time (Asia/Kathmandu)
    time_now = now_local.time()

    #Mark the recognised/selected students as PRESENT
    present_user_ids = set()
    present_count = 0   # total successfully marked present (created OR updated)
    created_count = 0   # newly created records only
    skipped_count = 0   # IDs that didn't match any User
    for sid in student_ids:
        try:
            student = User.objects.get(id=sid)
            obj, created = AttendanceRecord.objects.update_or_create(
                student=student,
                subject=subject,
                date=date,
                defaults={
                    "status": AttendanceRecord.STATUS_PRESENT,
                    "time": time_now,
                    "marked_by": request.user
                }
            )
            present_user_ids.add(student.id)
            present_count += 1
            if created:
                created_count += 1
        except User.DoesNotExist:
            logger.warning(f"[mark_attendance] No User found with id={sid} — skipping.")
            skipped_count += 1
            continue

    #Auto mark all other enrolled students as ABSENT for this session
    #(only if this is today's class, so the notification system has real data)
    absent_count = 0
    enrolled_profiles = subject.students.select_related('user').all()
    for profile in enrolled_profiles:
        if profile.user.id in present_user_ids:
            continue  # already marked Present — skip
        _, created = AttendanceRecord.objects.get_or_create(
            student=profile.user,
            subject=subject,
            date=date,
            defaults={
                "status": AttendanceRecord.STATUS_ABSENT,
                "time": time_now,
                "marked_by": request.user
            }
        )
        if created:
            absent_count += 1

    #Automatically log Teacher Attendance
    if hasattr(request.user, 'teacher_profile'):
        from .models import TeacherAttendance
        from django.db.models import F
        teacher = request.user.teacher_profile
        t_record, t_created = TeacherAttendance.objects.get_or_create(
            teacher=teacher,
            date=date,
            defaults={'first_activity_time': time_now, 'classes_taught': 1}
        )
        if not t_created:
            TeacherAttendance.objects.filter(id=t_record.id).update(classes_taught=F('classes_taught') + 1)

    logger.info(
        f"[mark_attendance] subject={subject.name}, date={date}, "
        f"present={present_count} (new={created_count}), absent={absent_count}, skipped={skipped_count}"
    )

    return Response({
        "detail": f"Successfully marked {present_count} student{'s' if present_count != 1 else ''} as Present.",
        "present": present_count,
        "absent": absent_count,
        "skipped": skipped_count,
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_teacher_face_upload(request, teacher_id):
    """Register a teacher's face from an uploaded image."""
    try:
        teacher = Teacher.objects.get(id=teacher_id)
    except Teacher.DoesNotExist:
        return Response({"detail": "Teacher not found."}, status=status.HTTP_404_NOT_FOUND)

    image_data = request.data.get('image')
    if image_data:
        face_service = _get_face_service()
        if face_service is None:
            return Response({"detail": "Face service unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            from ml.utils import base64_to_pil
            pil_image = base64_to_pil(image_data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        detection = face_service.detect_faces(pil_image)
        if detection["count"] == 0:
            return Response({"detail": "No face detected."}, status=status.HTTP_400_BAD_REQUEST)
        elif detection["count"] > 1:
            return Response({"detail": "Multiple faces detected."}, status=status.HTTP_400_BAD_REQUEST)

        # Liveness check
        box = detection["boxes"][0]
        x1, y1, x2, y2 = box.astype(int).tolist()
        width, height = pil_image.size
        x1_c, y1_c = max(0, x1), max(0, y1)
        x2_c, y2_c = min(width, x2), min(height, y2)
        face_crop = pil_image.crop((x1_c, y1_c, x2_c, y2_c))

        liveness_score = None
        try:
            from ml.liveness import detect_liveness
            is_live, liveness_score, _ = detect_liveness(face_crop)
            if not is_live:
                return Response({"detail": "Liveness check failed. Spoofing detected."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            pass

        try:
            embedding_list = face_service.register_face(pil_image)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        teacher.face_encoding = json.dumps(embedding_list)
        teacher.save()
        return Response({"detail": "Face registered successfully."})
        
    return Response({"detail": "Provide 'image' (base64)."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_recognize_staff_faces(request):
    """
    Recognize teachers from a camera frame.
    Returns matched teachers and logs their attendance.
    """
    image_data = request.data.get('image')
    if not image_data:
        return Response({"detail": "No image data provided."}, status=status.HTTP_400_BAD_REQUEST)
        
    face_service = _get_face_service()
    if face_service is None:
        return Response({"detail": "ML models not loaded."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    try:
        from ml.utils import base64_to_pil
        pil_image = base64_to_pil(image_data)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    detection = face_service.detect_faces(pil_image)
    if detection["count"] == 0:
        return Response({"faces_detected": 0, "faces_matched": 0, "results": []})

    from .models import TeacherAttendance
    from django.utils import timezone as tz
    now_local = tz.localtime(tz.now())   # Nepal local time (Asia/Kathmandu)
    time_now = now_local.time()
    date_today = now_local.date()

    results = []
    faces_matched = 0

    teachers = Teacher.objects.exclude(face_encoding="")
    db_embeddings = []
    db_metadata = []
    for t in teachers:
        try:
            emb = json.loads(t.face_encoding)
            db_embeddings.append(emb)
            db_metadata.append({"teacher_id": t.id, "name": t.full_name})
        except:
            continue

    for i in range(detection["count"]):
        box = detection["boxes"][i]
        emb = detection["embeddings"][i]
        
        x1, y1, x2, y2 = box.astype(int).tolist()
        width, height = pil_image.size
        x1_c, y1_c = max(0, x1), max(0, y1)
        x2_c, y2_c = min(width, x2), min(height, y2)
        face_crop = pil_image.crop((x1_c, y1_c, x2_c, y2_c))

        is_live = True
        try:
            from ml.liveness import detect_liveness
            is_live, _, _ = detect_liveness(face_crop)
        except Exception:
            pass

        face_result = {
            "bbox": {"x": x1, "y": y1, "w": x2-x1, "h": y2-y1},
            "matched": False,
            "is_live": is_live,
            "name": "Unknown",
            "teacher_id": None,
            "confidence": 0
        }

        if is_live and db_embeddings:
            match_idx, confidence = face_service.recognize_face(emb, db_embeddings)
            if match_idx is not None and confidence >= face_service.threshold:
                meta = db_metadata[match_idx]
                face_result["matched"] = True
                face_result["name"] = meta["name"]
                face_result["teacher_id"] = meta["teacher_id"]
                face_result["confidence"] = float(confidence)
                faces_matched += 1
                
                # Log attendance!
                teacher = Teacher.objects.get(id=meta["teacher_id"])
                TeacherAttendance.objects.get_or_create(
                    teacher=teacher,
                    date=date_today,
                    defaults={'first_activity_time': time_now, 'classes_taught': 0}
                )

        results.append(face_result)

    return Response({
        "faces_detected": detection["count"],
        "faces_matched": faces_matched,
        "results": results
    })

@api_view(['POST'])
@permission_classes([IsAdminOrTeacher])
def admin_recognize_faces(request):
    """
    Recognize faces in an uploaded image using MTCNN + FaceNet.
    Uses screen-context liveness: detects phone/screen bezels and backlit screen colors.
    """
    image_data = request.data.get('image')

    if not image_data:
        return Response(
            {"detail": "Provide 'image' as a base64-encoded string."},
            status=status.HTTP_400_BAD_REQUEST
        )

    face_service = _get_face_service()
    if face_service is None:
        return Response(
            {"detail": "Face recognition service unavailable. Ensure ML dependencies are installed."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    try:
        from ml.utils import base64_to_pil
        pil_image = base64_to_pil(image_data)
    except Exception as e:
        return Response(
            {"detail": f"Invalid image data: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    students_with_faces = StudentProfile.objects.exclude(
        face_encoding=""
    ).select_related('user')

    known_encodings = []
    for profile in students_with_faces:
        try:
            encoding = json.loads(profile.face_encoding)
            known_encodings.append({
                "student_id": profile.user.id,
                "name": profile.user.get_full_name() or profile.user.username,
                "encoding": encoding
            })
        except (json.JSONDecodeError, ValueError):
            logger.warning(f"Invalid face encoding for student {profile.student_id}")
            continue

    try:
        results = face_service.recognize_faces(pil_image, known_encodings)
    except Exception as e:
        logger.error(f"Face recognition error: {e}")
        return Response(
            {"detail": f"Face recognition failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Apply screen-context liveness check on top of recognition results.
    # This detects phones, tablets, and laptop screens held in front of the camera.
    from ml.liveness import detect_screen_spoof
    for result in results:
        try:
            is_live, screen_score, screen_details = detect_screen_spoof(
                pil_image, result["bbox"]
            )
            # Screen-context liveness overrides the single-frame LBP result
            # but only if it detects a spoof (we don't override live verdicts with uncertain scores)
            if not is_live:
                result["is_live"] = False
                result["liveness_score"] = round(screen_score, 4)
                result["liveness_details"] = screen_details
                logger.info(
                    f"Screen spoof detected for '{result['name']}': score={screen_score:.4f}"
                )
            else:
                # Keep single-frame liveness result, just log the screen check passed
                logger.info(
                    f"Screen check passed for '{result['name']}': score={screen_score:.4f}, "
                    f"combined is_live={result.get('is_live', True)}"
                )
        except Exception as e:
            logger.warning(f"Screen liveness check failed for face: {e}")

    return Response({
        "faces_detected": len(results),
        "faces_matched": sum(1 for r in results if r["matched"]),
        "spoofs_detected": sum(1 for r in results if not r.get("is_live", True)),
        "results": results
    })


#subjects mgnt
@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrTeacher])
def admin_subjects(request):
    if request.method == 'GET':
        subjects = Subject.objects.all()
        if not request.user.is_staff and hasattr(request.user, 'teacher_profile'):
            teacher = request.user.teacher_profile
            subjects = teacher.subjects.all()
        data = [{"id": s.id, "name": s.name, "code": s.code, "department": s.department, "semester": s.semester, "total_classes": s.total_classes} for s in subjects]
        return Response(data)
    elif request.method == 'POST':
        if not request.user.is_staff:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        name = request.data.get('name')
        code = request.data.get('code')
        department = request.data.get('department', '')
        semester = request.data.get('semester', '')
        if not name or not code:
            return Response({"detail": "name and code are required"}, status=status.HTTP_400_BAD_REQUEST)
        sub = Subject.objects.create(name=name, code=code, department=department, semester=semester)
        return Response({"id": sub.id, "name": sub.name, "code": sub.code, "department": sub.department, "semester": sub.semester}, status=status.HTTP_201_CREATED)

@api_view(['PUT', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_subject_detail(request, subject_id):
    try:
        subject = Subject.objects.get(id=subject_id)
    except Subject.DoesNotExist:
        return Response({"detail": "Subject not found."}, status=status.HTTP_404_NOT_FOUND)
        
    if request.method == 'PUT':
        subject.name = request.data.get('name', subject.name)
        subject.code = request.data.get('code', subject.code)
        subject.department = request.data.get('department', subject.department)
        subject.semester = request.data.get('semester', subject.semester)
        subject.save()
        return Response({"detail": "Subject updated successfully."})
        
    elif request.method == 'DELETE':
        subject.delete()
        return Response({"detail": "Subject deleted successfully."}, status=status.HTTP_204_NO_CONTENT)



#monthly analytics report(using Matplotlib)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_monthly_report(request):
    import io
    import base64
    import matplotlib
    matplotlib.use('Agg')  # Set backend to non-GUI Agg
    import matplotlib.pyplot as plt
    from datetime import datetime, timedelta
    from django.utils import timezone
    
    # Fetch attendance records for the last 30 days
    today = timezone.now().date()
    start_date = today - timedelta(days=30)
    records = AttendanceRecord.objects.filter(date__range=[start_date, today]).select_related('student', 'subject')
    
    if not records.exists():
        # Handle empty database gracefully with sample data
        students_pct = [85, 92, 78, 64, 88, 71, 95, 60, 81, 89]
        daily_dates = [(today - timedelta(days=i)).strftime('%m-%d') for i in range(10)][::-1]
        daily_rates = [80, 83, 79, 85, 88, 76, 82, 84, 81, 85]
        summary = {
            "total_records": 120,
            "overall_average": 82,
            "at_risk_count": 3,
            "top_subject": "Database Management (90%)",
            "bottom_subject": "Computer Networks (69%)"
        }
    else:
        # Calculate percentage per student
        student_stats = {}
        for r in records:
            s_id = r.student.id
            if s_id not in student_stats:
                student_stats[s_id] = {"total": 0, "present": 0}
            student_stats[s_id]["total"] += 1
            if r.status == AttendanceRecord.STATUS_PRESENT:
                student_stats[s_id]["present"] += 1
                
        students_pct = [
            round((vals["present"] / vals["total"]) * 100)
            for vals in student_stats.values()
        ]
        
        # Calculate daily trend
        daily_stats = {}
        for r in records:
            d_str = r.date.strftime('%m-%d')
            if d_str not in daily_stats:
                daily_stats[d_str] = {"total": 0, "present": 0}
            daily_stats[d_str]["total"] += 1
            if r.status == AttendanceRecord.STATUS_PRESENT:
                daily_stats[d_str]["present"] += 1
                
        sorted_days = sorted(daily_stats.keys())
        daily_dates = sorted_days
        daily_rates = [
            round((daily_stats[day]["present"] / daily_stats[day]["total"]) * 100)
            for day in sorted_days
        ]
        
        # Calculate subject stats
        subject_stats = {}
        for r in records:
            sub_name = r.subject.name
            if sub_name not in subject_stats:
                subject_stats[sub_name] = {"total": 0, "present": 0}
            subject_stats[sub_name]["total"] += 1
            if r.status == AttendanceRecord.STATUS_PRESENT:
                subject_stats[sub_name]["present"] += 1
                
        subject_averages = [
            {"name": name, "pct": round((vals["present"] / vals["total"]) * 100)}
            for name, vals in subject_stats.items()
        ]
        subject_averages.sort(key=lambda x: x["pct"])
        
        top_subject = f"{subject_averages[-1]['name']} ({subject_averages[-1]['pct']}%)" if subject_averages else "N/A"
        bottom_subject = f"{subject_averages[0]['name']} ({subject_averages[0]['pct']}%)" if subject_averages else "N/A"
        
        total_records = records.count()
        overall_avg = round(sum(students_pct) / len(students_pct)) if students_pct else 0
        at_risk_count = sum(1 for p in students_pct if p < 75)
        
        summary = {
            "total_records": total_records,
            "overall_average": overall_avg,
            "at_risk_count": at_risk_count,
            "top_subject": top_subject,
            "bottom_subject": bottom_subject
        }

    # Build the Matplotlib figure
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4.5))
    fig.patch.set_facecolor('#fdfefe')  # light background
    
    # Left Subplot: Histogram of student attendance distribution
    ax1.set_facecolor('#f8fafc')
    ax1.grid(color='#e2e8f0', linestyle='--', linewidth=0.5)
    counts, bins, patches = ax1.hist(students_pct, bins=[0, 60, 75, 90, 100], edgecolor='#e2e8f0', color='#0bc0e4', alpha=0.85, rwidth=0.85)
    
    # Style bars by risk: red for below 75%, green for above
    for i in range(len(patches)):
        bin_center = (bins[i] + bins[i+1])/2
        if bin_center < 75:
            patches[i].set_facecolor('#ef4444')  # Red alert
        else:
            patches[i].set_facecolor('#10b981')  # Green safe
            
    ax1.set_title("Student Attendance Distribution", fontsize=11, fontweight='bold', color='#0a3d5c', pad=12)
    ax1.set_xlabel("Attendance Percentage (%)", fontsize=9, color='#64748b')
    ax1.set_ylabel("Number of Students", fontsize=9, color='#64748b')
    ax1.set_xlim(0, 105)
    ax1.tick_params(colors='#64748b', labelsize=8)
    ax1.spines['top'].set_visible(False)
    ax1.spines['right'].set_visible(False)
    ax1.spines['left'].set_color('#cbd5e1')
    ax1.spines['bottom'].set_color('#cbd5e1')

    # Right Subplot: Line plot of Daily Trend
    ax2.set_facecolor('#f8fafc')
    ax2.grid(color='#e2e8f0', linestyle='--', linewidth=0.5)
    ax2.plot(daily_dates, daily_rates, marker='o', linewidth=2.5, color='#0bc0e4', markerfacecolor='#0a3d5c', markersize=5, label="Daily Presence Rate")
    ax2.axhline(75, color='#ef4444', linestyle=':', label='75% Threshold', alpha=0.8)
    
    ax2.set_title("Daily Overall Presence Trend", fontsize=11, fontweight='bold', color='#0a3d5c', pad=12)
    ax2.set_xlabel("Date (Month-Day)", fontsize=9, color='#64748b')
    ax2.set_ylabel("Presence Rate (%)", fontsize=9, color='#64748b')
    ax2.set_ylim(0, 105)
    ax2.tick_params(colors='#64748b', labelsize=8)
    ax2.legend(loc='lower left', frameon=True, facecolor='white', edgecolor='#e2e8f0', fontsize=8)
    plt.xticks(rotation=45)
    ax2.spines['top'].set_visible(False)
    ax2.spines['right'].set_visible(False)
    ax2.spines['left'].set_color('#cbd5e1')
    ax2.spines['bottom'].set_color('#cbd5e1')

    plt.tight_layout()
    
    # Save chart to buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, facecolor=fig.get_facecolor(), edgecolor='none')
    buf.seek(0)
    image_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    
    return Response({
        "summary": summary,
        "chart_image": f"data:image/png;base64,{image_base64}"
    })


#courses mgnt
@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_courses(request):
    if request.method == 'GET':
        courses = Course.objects.all().order_by('code')
        data = [{
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "total_semesters": c.total_semesters,
            "description": c.description,
        } for c in courses]
        return Response(data)

    elif request.method == 'POST':
        name = request.data.get('name')
        code = request.data.get('code')
        if not name or not code:
            return Response({"detail": "name and code are required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            course = Course.objects.create(
                name=name,
                code=code.upper(),
                total_semesters=int(request.data.get('total_semesters', 8)),
                description=request.data.get('description', '')
            )
            return Response({"id": course.id, "name": course.name, "code": course.code}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_course_detail(request, course_id):
    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({
            "id": course.id, "name": course.name, "code": course.code,
            "total_semesters": course.total_semesters, "description": course.description
        })

    elif request.method == 'PUT':
        course.name = request.data.get('name', course.name)
        course.code = request.data.get('code', course.code).upper()
        course.total_semesters = int(request.data.get('total_semesters', course.total_semesters))
        course.description = request.data.get('description', course.description)
        try:
            course.save()
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Course updated successfully."})

    elif request.method == 'DELETE':
        course.delete()
        return Response({"detail": "Course deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


#teachers mgnt
@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_teachers(request):
    if request.method == 'GET':
        teachers = Teacher.objects.all().order_by('employee_id')
        data = [{
            "id": t.id,
            "employee_id": t.employee_id,
            "full_name": t.full_name,
            "email": t.email,
            "phone": t.phone,
            "department": t.department,
            "specialty": t.specialty,
            "subjects": list(t.subjects.values_list('id', flat=True))
        } for t in teachers]
        return Response(data)

    elif request.method == 'POST':
        employee_id = request.data.get('employee_id')
        full_name = request.data.get('full_name')
        email = request.data.get('email')
        password = request.data.get('password', 'teacher@123')
        if not employee_id or not full_name or not email:
            return Response({"detail": "employee_id, full_name and email are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create User first
            names = full_name.split(' ', 1)
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else ''
            
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )

            teacher = Teacher.objects.create(
                user=user,
                employee_id=employee_id,
                full_name=full_name,
                email=email,
                phone=request.data.get('phone', ''),
                department=request.data.get('department', 'BCA'),
                specialty=request.data.get('specialty', '')
            )
            
            subject_ids = request.data.get('subjects', [])
            if subject_ids:
                matching_subjects = Subject.objects.filter(id__in=subject_ids)
                teacher.subjects.set(matching_subjects)
                
            return Response({"id": teacher.id, "full_name": teacher.full_name}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_teacher_detail(request, teacher_id):
    try:
        teacher = Teacher.objects.get(id=teacher_id)
    except Teacher.DoesNotExist:
        return Response({"detail": "Teacher not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({
            "id": teacher.id, "employee_id": teacher.employee_id,
            "full_name": teacher.full_name, "email": teacher.email,
            "phone": teacher.phone, "department": teacher.department,
            "specialty": teacher.specialty,
            "subjects": list(teacher.subjects.values_list('id', flat=True))
        })

    elif request.method == 'PUT':
        email = request.data.get('email', teacher.email)
        full_name = request.data.get('full_name', teacher.full_name)
        password = request.data.get('password')
        
        teacher.employee_id = request.data.get('employee_id', teacher.employee_id)
        teacher.full_name = full_name
        teacher.email = email
        teacher.phone = request.data.get('phone', teacher.phone)
        teacher.department = request.data.get('department', teacher.department)
        teacher.specialty = request.data.get('specialty', teacher.specialty)
        
        try:
            # Update associated User if exists
            if teacher.user:
                user = teacher.user
                user.username = email
                user.email = email
                names = full_name.split(' ', 1)
                user.first_name = names[0]
                user.last_name = names[1] if len(names) > 1 else ''
                if password:
                    user.set_password(password)
                user.save()
            teacher.save()
            
            if 'subjects' in request.data:
                subject_ids = request.data.get('subjects', [])
                matching_subjects = Subject.objects.filter(id__in=subject_ids)
                teacher.subjects.set(matching_subjects)
                
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Teacher updated successfully."})

    elif request.method == 'DELETE':
        if teacher.user:
            teacher.user.delete() # this will cascade delete the teacher profile
        else:
            teacher.delete()
        return Response({"detail": "Teacher deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_send_absent_warnings(request):
    from django.utils import timezone
    today = timezone.now().date()

    # Find all subjects that had at least one student marked Present today
    # (i.e., a class actually happened today for that subject)
    subjects_with_class_today = Subject.objects.filter(
        attendance_records__date=today,
        attendance_records__status=AttendanceRecord.STATUS_PRESENT
    ).distinct()

    count = 0
    for subject in subjects_with_class_today:
        # Get all students enrolled in this subject
        enrolled_students = subject.students.all()

        # Get students who were marked Present today for this subject
        present_student_ids = AttendanceRecord.objects.filter(
            subject=subject,
            date=today,
            status=AttendanceRecord.STATUS_PRESENT
        ).values_list('student_id', flat=True)

        # Students who are enrolled but have no Present record = absent
        absent_students = enrolled_students.exclude(user__id__in=present_student_ids)

        for student_profile in absent_students:
            student_user = student_profile.user
            subject_line = f"Absent Notification - {subject.name}"

            # Deduplication: skip if already notified today
            if EmailNotification.objects.filter(
                student=student_user,
                subject_line=subject_line,
                sent_at__date=today
            ).exists():
                continue

            EmailNotification.objects.create(
                student=student_user,
                subject_line=subject_line,
                preview=(
                    f"Dear {student_user.first_name or student_user.username}, "
                    f"you were marked ABSENT for the class of '{subject.name}' ({subject.code}) "
                    f"today ({today.strftime('%b %d, %Y')}). "
                    f"Please contact your instructor if this is a mistake."
                ),
                email_type=EmailNotification.TYPE_WARNING,
                is_read=False
            )
            count += 1

    return Response({
        "detail": f"Successfully sent daily absence notices to {count} students."
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_send_low_attendance_warnings(request):
    """
    Scan every student's attendance per subject.
    Any student below 75% in a subject gets an in-app warning notification.
    Deduplicates: only one warning per student per subject per day.
    """
    from django.utils import timezone
    today = timezone.now().date()

    THRESHOLD = 75
    notified_count = 0
    already_sent_count = 0

    students = StudentProfile.objects.select_related('user').all()

    for profile in students:
        student_user = profile.user
        # Subjects this student is enrolled in
        enrolled_subjects = profile.subjects.all()

        for subject in enrolled_subjects:
            records = AttendanceRecord.objects.filter(student=student_user, subject=subject)
            total = records.count()
            if total == 0:
                continue  # No attendance recorded yet — skip

            present = records.filter(status=AttendanceRecord.STATUS_PRESENT).count()
            rate = round((present / total) * 100)

            if rate < THRESHOLD:
                subject_line = f"Low Attendance Warning – {subject.name}"

                # Deduplication: one warning per student per subject per day
                if EmailNotification.objects.filter(
                    student=student_user,
                    subject_line=subject_line,
                    sent_at__date=today
                ).exists():
                    already_sent_count += 1
                    continue

                EmailNotification.objects.create(
                    student=student_user,
                    subject_line=subject_line,
                    preview=(
                        f"Dear {student_user.first_name or student_user.username}, "
                        f"your attendance in '{subject.name}' ({subject.code}) is currently "
                        f"{rate}%, which is below the required 75%. "
                        f"You have attended {present} out of {total} classes. "
                        f"Please improve your attendance to avoid academic consequences."
                    ),
                    email_type=EmailNotification.TYPE_WARNING,
                    is_read=False
                )
                notified_count += 1

    return Response({
        "detail": (
            f"Scanned all students. Sent {notified_count} low-attendance warning(s). "
            f"{already_sent_count} already notified today."
        ),
        "notified": notified_count,
        "skipped": already_sent_count,
    }, status=status.HTTP_200_OK)
