import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from attendance.models import Teacher, Subject
for teacher in Teacher.objects.all():
    if not teacher.subjects.exists():
        subs = Subject.objects.filter(department__iexact=teacher.department)
        teacher.subjects.set(subs)
        print(f"Assigned {subs.count()} subjects to {teacher.full_name}")
