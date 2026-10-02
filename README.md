# Smart Attendance System 🎓👁️

An automated, AI-driven Facial Recognition Attendance Management System designed for academic institutions following the Tribhuvan University (TU) curriculum structure.

The system replaces manual roll-calling with real-time biometric verification using state-of-the-art deep learning models, robust anti-spoofing / liveness detection, and an interactive multi-role web portal.

---

## 🌟 Key Features

* **AI Face Recognition**:
  * **Face Detection**: Multi-task Cascaded Convolutional Networks (**MTCNN**) for both single-face enrollment and group-photo multi-face detection.
  * **Embeddings**: **FaceNet** (`InceptionResnetV1` pre-trained on VGGFace2) extracting 512-dimensional biometric feature vectors.
  * **Vectorized Cosine Similarity Matching**: Efficient dot-product batch matching ($\ge 0.65$ confidence threshold).
* **Multi-Layer Anti-Spoofing & Liveness**:
  * **LBP Texture Analysis**: Computes Local Binary Patterns entropy to detect printed paper photo attacks.
  * **Screen Bezel Ring Detection**: Analyzes luminance uniformity and bezel dark edges to detect phones/tablets shown to the camera.
  * **Glare / Specular Reflection Check**: Identifies glass/screen reflective hot spots.
* **Role-Based Portals**:
  * 👑 **Admin Portal**: Analytics dashboard, monthly trends, student/teacher enrollment, webcam biometric enrollment, live multi-face attendance scanning, syllabus/course manager, and automated email warning triggers.
  * 👨‍🏫 **Teacher Portal**: Assigned subject schedule, live attendance scanning, student records, and class logs.
  * 🎓 **Student Portal**: Real-time personal attendance percentage, per-subject breakdown, and absentee warning notifications.
* **Automated Email Notifications**:
  * Sends automated email alerts to students with low attendance or multiple consecutive absences via SMTP.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide Icons, Chart.js, React-Router v7 |
| **Backend** | Python 3.12, Django 6.0, Django REST Framework, Token Authentication |
| **Machine Learning** | PyTorch, `facenet-pytorch`, OpenCV, NumPy, SciPy, Pillow |
| **Database** | MySQL (`smart_attendance` database) |
| **Timezone** | `Asia/Kathmandu` (Nepal Standard Time) |

---

## 📁 Project Architecture

```
smart-attendance/
├── api/                       # Django Backend
│   ├── attendance/            # Main attendance application
│   │   ├── models.py          # Student, Teacher, Subject, Course, Attendance models
│   │   ├── views.py           # Student & teacher authentication and data endpoints
│   │   ├── admin_views.py     # Admin CRUD, face registration & recognition endpoints
│   │   └── urls.py            # API routing
│   ├── config/                # Django project configuration & settings
│   ├── scripts/               # Utility scripts (seed subjects, reset passwords)
│   ├── manage.py
│   └── requirements.txt
├── client/                    # React + Vite Frontend
│   ├── src/
│   │   ├── api/               # Axios API client & token interceptors
│   │   ├── components/        # Shared UI components (Navbar, etc.)
│   │   └── pages/             # Admin, Teacher, Student, and Public pages
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── ml/                        # Computer Vision & Biometric Pipeline
│   ├── face_recognition.py   # MTCNN + FaceNet singleton service & matcher
│   ├── liveness.py           # Texture, bezel, and glare anti-spoofing
│   └── utils.py              # Base64 image decoding & preprocessing
├── .env                       # Local environment secrets (ignored by Git)
├── .env.example               # Configuration template for deployment
├── .gitignore
└── tu_subjects.csv            # Tribhuvan University course curriculum database
```

---

## 🚀 Quickstart Guide

### Prerequisites
* **Python 3.12+**
* **Node.js 18+** & **npm**
* **MySQL Server** (running on `localhost:3306`)

---

### 1. Configure Environment Variables
Copy the configuration template and update your credentials:
```bash
cp .env.example .env
```
Edit `.env` to configure your MySQL database credentials and Gmail SMTP settings:
```env
SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=smart_attendance
DB_USER=root
DB_PASSWORD=your_mysql_password
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_gmail_app_password
```

---

### 2. Backend Setup
Activate your virtual environment and install backend dependencies:
```bash
# Activate virtual environment
source api/venv/bin/activate

# Install requirements
pip install -r api/requirements.txt

# Run migrations
python api/manage.py migrate

# (Optional) Seed TU Subjects from CSV
python api/scripts/import_subjects.py
```

Start the Django API server:
```bash
python api/manage.py runserver 127.0.0.1:8000
```

---

### 3. Frontend Setup
In a separate terminal, install dependencies and start the Vite dev server:
```bash
cd client
npm install
npm run dev
```
Open your browser and visit: `http://localhost:5173/`

---

## 🧪 Running Tests & Health Check

Run the backend test suite:
```bash
python api/manage.py test attendance
```

Verify frontend production build:
```bash
npm --prefix client run build
```

---

## 🔐 Security Best Practices
* Never commit the `.env` file to version control.
* Use [Google App Passwords](https://support.google.com/accounts/answer/185833) rather than your personal Google account password for SMTP email delivery.
* Keep `DEBUG=False` and configure `ALLOWED_HOSTS` in production environments.


"The liveness/anti-spoofing module was implemented but yielded inconsistent results when tested with webcam input due to JPEG compression artifacts and varying lighting conditions; this remains a known limitation."