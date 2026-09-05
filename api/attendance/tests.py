from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from attendance.models import StudentProfile

class DualEmailAuthenticationTests(APITestCase):
    def setUp(self):
        # Create two users with the same email address: 'duplicate@example.com'
        self.email = 'duplicate@example.com'
        
        # User 1: Admin/Staff user
        self.admin_user = User.objects.create_user(
            username='admin_user',
            email=self.email,
            password='admin_password123',
            is_staff=True
        )
        
        # User 2: Student user
        self.student_user = User.objects.create_user(
            username='student_user',
            email=self.email,
            password='student_password123',
            is_staff=False
        )
        # Create a StudentProfile for the student user as required by views.py
        self.student_profile = StudentProfile.objects.create(
            user=self.student_user,
            student_id='STU001',
            department='BCA',
            semester='1st'
        )

        self.login_url = '/api/auth/login/'

    def test_admin_login_success_with_shared_email(self):
        """Test that the admin user can successfully log in using the shared email and the admin password."""
        data = {
            'email': self.email,
            'password': 'admin_password123'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_admin'])
        self.assertFalse(response.data['is_student'])
        self.assertEqual(response.data['username'], 'admin_user')

    def test_student_login_success_with_shared_email(self):
        """Test that the student user can successfully log in using the shared email and the student password."""
        data = {
            'email': self.email,
            'password': 'student_password123'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_admin'])
        self.assertTrue(response.data['is_student'])

    def test_login_invalid_password(self):
        """Test that logging in with a shared email but an incorrect password fails."""
        data = {
            'email': self.email,
            'password': 'wrong_password'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['detail'], 'Invalid credentials.')

    def test_login_non_existent_email(self):
        """Test that attempting to log in with a non-existent email fails."""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'password123'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
