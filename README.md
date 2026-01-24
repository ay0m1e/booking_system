# Mane Society Booking System

A full-stack booking platform for service-based businesses such as salons, makeup artists, and similar appointment-driven services.

Originally built as a class project, this system has been expanded into a **production-ready booking engine** designed to be reused across multiple client projects with custom frontends.

---

## Features

### Authentication
- User registration and login
- Secure password hashing
- JWT-based stateless authentication
- Admin and regular user roles

### Booking Engine
- Service-based bookings
- Time-slot availability system
- Prevents double-booking
- Prevents overlapping bookings per user
- Booking history for users
- Booking cancellation

### Admin Panel
- View all bookings
- Manage services (CRUD)
- Cancel bookings
- Basic analytics support (in progress)

### Payments
- Pay online (Stripe demo / test mode)
- Pay in person
- Payment status tracking via webhooks

### AI Assistant (Optional)
- FAQ chatbot for customer support
- Designed as a **low-frequency helper**
- AI is not part of the core booking logic
- Provider can be swapped (OpenAI, etc.)

---

## Tech Stack

### Backend
- Python (Flask)
- PostgreSQL
- JWT Authentication
- Stripe (test mode)
- REST API

### Frontend
- React
- Custom CSS (no templates)
- Fully responsive design
- Image-first layouts

### Hosting
- Cloud-hosted backend
- Static frontend hosting
- SSL enabled

---

## Project Structure

backend/
app.py
requirements.txt
.env.example

frontend/
src/
components/
pages/
styles/

---

## Design Principles

- Backend-first, frontend-flexible
- Stateless APIs (JWT, no server-side sessions)
- Reliability over hype
- AI as an enhancement, not a dependency
- Designed for reuse across multiple clients

---

## Current Status

- Booking engine: ✅ Stable
- Admin system: ✅ Functional
- Payments (demo): ✅ Working
- AI assistant: ⚠️ Optional
- Frontend: 🔄 Custom per client

---

## Reusability

The backend is designed to remain mostly unchanged across projects.  
Each client receives:
- A custom frontend
- Custom services and branding
- The same underlying booking logic

---

## Future Improvements

- Multi-staff booking support
- Cleaner multi-tenant architecture
- Email and SMS notifications
- Advanced analytics
- Optional AI enhancements

---

## Author

Built and maintained by **Ayo**  
Full-stack developer focused on real-world, production-ready systems.
