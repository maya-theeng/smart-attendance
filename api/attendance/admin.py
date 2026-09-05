from django.contrib import admin
from .models import Subject, StudentProfile, AttendanceRecord, EmailNotification


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'total_classes')
    search_fields = ('name', 'code')


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'get_name', 'department', 'semester')
    search_fields = ('student_id', 'user__first_name', 'user__last_name', 'user__email')
    filter_horizontal = ('subjects',)

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    get_name.short_description = 'Name'


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'subject', 'date', 'status', 'time')
    list_filter = ('status', 'subject', 'date')
    search_fields = ('student__first_name', 'student__last_name', 'subject__name')
    date_hierarchy = 'date'

    def get_student(self, obj):
        return obj.student.get_full_name() or obj.student.username
    get_student.short_description = 'Student'


@admin.register(EmailNotification)
class EmailNotificationAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'subject_line', 'email_type', 'is_read', 'sent_at')
    list_filter = ('email_type', 'is_read')
    search_fields = ('student__email', 'subject_line')

    def get_student(self, obj):
        return obj.student.email
    get_student.short_description = 'Student'
