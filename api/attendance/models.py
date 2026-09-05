from django.db import models
from django.contrib.auth.models import User


class Course(models.Model):
    """An academic programme / department (e.g. BCA, BIT, BSc.CSIT)."""
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)
    total_semesters = models.IntegerField(default=8)
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


class Teacher(models.Model):
    """A faculty member / teacher in the institution."""
    DEPARTMENTS = [
        ("BCA", "BCA"),
        ("BIT", "BIT"),
        ("BSc.CSIT", "BSc.CSIT"),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="teacher_profile"
    )
    employee_id = models.CharField(max_length=30, unique=True)
    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, default="")
    department = models.CharField(max_length=200, default="BCA")
    specialty = models.CharField(max_length=200, blank=True, default="")
    subjects = models.ManyToManyField('Subject', blank=True, related_name="teachers")

    # Face recognition fields for Teachers
    face_image = models.ImageField(upload_to="teacher_faces/", null=True, blank=True)
    face_encoding = models.TextField(blank=True, default="")  # JSON list of 128 floats

    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def face_registered(self):
        return bool(self.face_encoding)

    def __str__(self):
        return f"{self.employee_id} - {self.full_name}"


class Subject(models.Model):
    """A course/subject that students attend."""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    department = models.CharField(max_length=100, default="", blank=True)
    semester = models.CharField(max_length=30, default="", blank=True)
    total_classes = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.code} - {self.name}"


class StudentProfile(models.Model):
    """Extended profile for a student (linked to Django User)."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    student_id = models.CharField(max_length=30, unique=True)
    department = models.CharField(max_length=100, default="")
    semester = models.CharField(max_length=30, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    is_active = models.BooleanField(default=True)
    subjects = models.ManyToManyField(Subject, blank=True, related_name="students")

    # Face recognition fields
    face_image = models.ImageField(upload_to="faces/", null=True, blank=True)
    face_encoding = models.TextField(blank=True, default="")  # JSON list of 128 floats

    @property
    def face_registered(self):
        return bool(self.face_encoding)

    def __str__(self):
        return f"{self.student_id} - {self.user.get_full_name()}"


class AttendanceRecord(models.Model):
    """Tracks whether a student was present or absent for a specific class."""
    STATUS_PRESENT = "Present"
    STATUS_ABSENT = "Absent"
    STATUS_CHOICES = [
        (STATUS_PRESENT, "Present"),
        (STATUS_ABSENT, "Absent"),
    ]

    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="attendance_records"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="attendance_records"
    )
    date = models.DateField()
    time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    marked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="marked_attendance",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        # Prevent duplicate records for same student + subject + date
        unique_together = ("student", "subject", "date")

    def __str__(self):
        return f"{self.student.get_full_name()} | {self.subject.name} | {self.date} | {self.status}"


class EmailNotification(models.Model):
    """Stores email notifications sent to students about attendance."""
    TYPE_WARNING = "warning"
    TYPE_REPORT = "report"
    TYPE_SUCCESS = "success"
    TYPE_INFO = "info"
    TYPE_CHOICES = [
        (TYPE_WARNING, "Warning"),
        (TYPE_REPORT, "Report"),
        (TYPE_SUCCESS, "Success"),
        (TYPE_INFO, "Info"),
    ]

    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="email_notifications"
    )
    subject_line = models.CharField(max_length=255)
    preview = models.TextField()
    email_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_INFO)
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"[{self.email_type.upper()}] {self.subject_line} → {self.student.email}"


class TeacherAttendance(models.Model):
    """Tracks daily attendance for teachers based on their activity (Option 2)."""
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField()
    first_activity_time = models.TimeField(auto_now_add=True)
    classes_taught = models.IntegerField(default=1)

    class Meta:
        ordering = ["-date", "-first_activity_time"]
        unique_together = ("teacher", "date")

    def __str__(self):
        return f"{self.teacher.full_name} | {self.date} | Classes: {self.classes_taught}"
