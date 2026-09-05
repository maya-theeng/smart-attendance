#!/usr/bin/env python
"""
Import all TU subjects from tu_subjects.csv into the database.
Skips rows with missing Department or Semester.
"""
import os
import csv
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from attendance.models import Subject

CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'tu_subjects.csv')

created_count = 0
skipped_count = 0
updated_count = 0

with open(CSV_PATH, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        code = row['Code'].strip()
        name = row['Subject Name'].strip()
        department = row['Department'].strip()
        semester = row['Semester'].strip()
        total_classes = int(row['Total Classes'].strip() or 0)

        # Skip rows with missing department or semester
        if not code or not name or not department or not semester:
            print(f'  SKIP (incomplete): {code} - {name}')
            skipped_count += 1
            continue

        subject, created = Subject.objects.update_or_create(
            code=code,
            defaults={
                'name': name,
                'department': department,
                'semester': semester,
                'total_classes': total_classes,
            }
        )
        if created:
            print(f'  CREATED: [{department} Sem-{semester}] {code} - {name}')
            created_count += 1
        else:
            updated_count += 1

print(f'\n✅ Done! Created: {created_count}, Updated: {updated_count}, Skipped: {skipped_count}')
print(f'Total subjects in DB: {Subject.objects.count()}')

# Show summary by department + semester
print('\n=== Subjects by Department & Semester ===')
from django.db.models import Count
stats = Subject.objects.values('department', 'semester').annotate(count=Count('id')).order_by('department', 'semester')
for s in stats:
    print(f'  {s["department"]:12} Semester {s["semester"]}: {s["count"]} subjects')
