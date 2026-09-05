import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from attendance.models import Teacher

def reset_passwords():
    teachers = Teacher.objects.all()
    print(f"Total teachers: {teachers.count()}")
    for t in teachers:
        if t.user:
            user = t.user
            user.set_password('teacher@123')
            user.save()
            print(f"Password reset to 'teacher@123' for teacher '{t.full_name}' ({t.email})")
        else:
            print(f"Teacher '{t.full_name}' has no linked User.")

if __name__ == '__main__':
    reset_passwords()
