#!/usr/bin/env python
"""
Drop all attendance_* tables and reset migration tracking,
so `migrate` can recreate them cleanly from the Django models
(with proper foreign keys).
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()

# 1. Disable FK checks so we can drop in any order
cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')

# 2. Find all attendance_* tables
cursor.execute("SHOW TABLES LIKE 'attendance_%'")
tables = [r[0] for r in cursor.fetchall()]
print(f'Found {len(tables)} attendance tables:')
for t in tables:
    print(f'  - {t}')

# 3. Drop them all
for t in tables:
    cursor.execute(f'DROP TABLE IF EXISTS `{t}`;')
    print(f'  Dropped: {t}')

# 4. Re-enable FK checks
cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')

# 5. Remove attendance migration records so Django runs them fresh
cursor.execute("DELETE FROM django_migrations WHERE app = 'attendance';")
print(f'\nCleared attendance migration records from django_migrations.')

connection.commit()
print('\nDone! Now run: python manage.py migrate')
