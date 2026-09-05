import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from attendance.models import Teacher

def fix_teachers():
    teachers = Teacher.objects.all()
    print(f"Total teachers: {teachers.count()}")
    for t in teachers:
        if not t.user:
            print(f"Teacher '{t.full_name}' ({t.email}) has no linked User object. Creating one...")
            try:
                # Check if User already exists with this email
                user = User.objects.filter(email=t.email).first()
                if not user:
                    names = t.full_name.split(' ', 1)
                    first_name = names[0]
                    last_name = names[1] if len(names) > 1 else ''
                    
                    user = User.objects.create_user(
                        username=t.email,
                        email=t.email,
                        password='teacher@123',
                        first_name=first_name,
                        last_name=last_name
                    )
                    print(f"Created new User for {t.email} with password 'teacher@123'")
                else:
                    print(f"Found existing User for {t.email}")
                
                t.user = user
                t.save()
                print(f"Linked Teacher '{t.full_name}' to User.")
            except Exception as e:
                print(f"Error for {t.email}: {e}")
        else:
            print(f"Teacher '{t.full_name}' ({t.email}) is already linked to User.")

if __name__ == '__main__':
    fix_teachers()
