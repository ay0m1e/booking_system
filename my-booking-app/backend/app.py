from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from functools import wraps
import os
import re
import datetime
import jwt
import bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor
from groq import Groq


from db import get_db

load_dotenv()


app = Flask(__name__)
CORS (app)

# JWT secret comes from .env so I never leak it into git.
JWT_SECRET = os.getenv("JWT_SECRET")

ALLOWED_EMAIL_DOMAINS = {
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "yahoo.com",
    "ymail.com",
    "icloud.com",
    "me.com",
    "mac.com",
}

groq_client = Groq(api_key = os.getenv("GROQ_API_KEY"))


FAQ_PATH = "faq_data.txt"

# Static schedule for availability endpoints (UI-driven booking only).
TIME_SLOTS = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00"
]


def load_faq_text():
    
    try:
        with open(FAQ_PATH, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""

@app.post("/api/faq")
def faq():
    data = request.get_json() or {}
    user_input = data.get("query", "").strip()
    return faq_internal(user_input)
    
def faq_internal(user_input):
    if not user_input:
        return jsonify({"error": "No query entered"}), 400
    
    faq_context = load_faq_text()
    
    if not faq_context:
        return jsonify({"message": "No FAQ information is currently available", "answer": "No FAQ information is currently available"}), 200
    
    
    response = groq_client.chat.completions.create(
        model = "llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content" : ("You are a helpful salon assistant. "
                                "Answer the user's question using ONLY the FAQ information provided. "
                                "Be friendly and concise. "
                                "If the answer is not in the FAQ, say you are not sure and suggest contacting the salon.")
                },
            {
                "role":"system",
                "content":f"FAQ INFORMATION: \n{faq_context}"
            },
            {
                "role":"user",
                "content": user_input
            }
        ], temperature=0.3
    )

    answer = response.choices[0].message.content
    # Return both keys so newer clients get a consistent message field without breaking older consumers.
    return jsonify({"message": answer, "answer": answer}), 200


# Stateless assistant endpoint restored to FAQ-only behavior (no booking/session logic).
@app.post("/api/assistant")
def assistant():
    data = request.get_json() or {}
    user_input = data.get("query", "").strip()
    
    if not user_input:
        return jsonify({"error": "No query entered"}), 400
    
    return faq_internal(user_input)


# Simple helper that wraps jwt.encode so I don't repeat expiry logic.
def create_token(user_id, is_admin=False) :
    payload = {
        "user_id" : user_id,
        "is_admin" : is_admin,
        "exp" : datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
        
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return token


def is_valid_email(email: str) -> bool:
    # Basic RFC 5322-ish pattern to reject obviously bad addresses.
    if not re.fullmatch(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", email):
        return False
    domain = email.split("@", 1)[1]
    return domain in ALLOWED_EMAIL_DOMAINS

# Helper so both US and UK spellings of the auth header are accepted, preferring the standard header.
def get_auth_header():
    return request.headers.get("Authorization") or request.headers.get("Authorisation") or ""


def get_bearer_token():
    auth_header = get_auth_header()
    parts = auth_header.split(" ", 1)
    if len(parts) == 2 and parts[0] == "Bearer" and parts[1]:
        return parts[1].strip()
    # Fallbacks so logged-in users aren't blocked if the header is missing.
    cookie_token = request.cookies.get("ms_token") or request.cookies.get("token")
    if cookie_token:
        return cookie_token
    body = {}
    try:
        body = request.get_json(silent=True) or {}
    except Exception:
        body = {}
    body_token = body.get("token") or body.get("auth_token")
    return body_token or None

# Decode the current request's token into a user id (if present/valid).
def get_request_user_id():
    token = get_bearer_token()
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("user_id")
    except Exception:
        return None


def require_admin(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = get_bearer_token()
        if not token:
            return jsonify({"error":"Missing or invalid Authorization header"}), 401
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        
        if not payload.get("is_admin", False):
            return jsonify({"error":"Admin access only"}), 403
        
        request.user = payload
        
        return fn(*args, **kwargs)
    
    return wrapper

@app.get("/api/admin/users")
@require_admin
def admin_get_users():
    connection = get_db()
    cur = connection.cursor()
    
    
    try:
        cur.execute("""
                    SELECT id, name, email, created_at, is_admin
                    FROM users
                    ORDER BY created_at DESC;
                    """)
        users = cur.fetchall()
        
    except Exception:
        connection.close()
        return jsonify({"error": "Failed to fetch users"}), 500
    
    
    connection.close()
    return jsonify({"users": users}), 200




@app.get("/api/admin/bookings")
@require_admin
def admin_get_all_bookings():
    connection = get_db()
    cur = connection.cursor()
    
    try:
        cur.execute("""
                    SELECT
                        b.id,
                        b.user_id,
                        u.name AS user_name,
                        u.email AS user_email,
                        b.service,
                        b.date,
                        b.time,
                        b.notes,
                        b.created_at
                    FROM bookings b JOIN users u ON b.user_id = u.id
                    ORDER BY b.date ASC, b.time ASC;
                    """)
        
        bookings = cur.fetchall()
    except Exception:
        connection.close()
        return jsonify({"error":"Failed to fetch bookings"}), 500
    
    connection.close()
    return jsonify({"bookings": bookings}), 200


@app.delete("/api/admin/bookings/<int:booking_id>")
@require_admin
def admin_delete_booking(booking_id):
    connection = get_db()
    cur = connection.cursor()
    
    
    try:
        cur.execute("""
                    SELECT id, date, time
                    FROM bookings
                    WHERE id = %s;
                    """, (booking_id,))
        row = cur.fetchone()
        
        if row is None:
            connection.close()
            return jsonify({"error": "Booking not found"}), 404

        # Fetch the date and time explicitly to avoid KeyErrors while enforcing cancellation rules.
        booking_date = row.get("date") if isinstance(row, dict) else None
        booking_time = row.get("time") if isinstance(row, dict) else None

        if not booking_date or not booking_time:
            connection.close()
            return jsonify({"error": "Booking date or time unavailable"}), 500

        try:
            time_component = booking_time if isinstance(booking_time, datetime.time) else datetime.time.fromisoformat(str(booking_time))
        except (TypeError, ValueError):
            connection.close()
            return jsonify({"error": "Booking time is invalid"}), 500

        booking_datetime = datetime.datetime.combine(booking_date, time_component)
        now = datetime.datetime.now()
        
        if booking_datetime < now:
            connection.close()
            return jsonify({"error":"Cannot delete past bookings"}),400
        
        cur.execute("""
                    DELETE FROM bookings
                    WHERE id = %s;
                    """, (booking_id,))
        
        connection.commit()
        
    except Exception:
        connection.rollback()
        connection.close()
        return jsonify({"error":"Failed to delete booking"}), 500
    
    connection.close()
    return jsonify({"success": True, 
                    "message":"Booking deleted by admin"}), 200
    
    
    
@app.get("/api/admin/services")
@require_admin
def admin_get_services():
    
    connection = get_db()
    cur = connection.cursor()
    
    
    
    try:
        cur.execute("""
                    SELECT id, name, price, duration, category, is_active
                    FROM services
                    ORDER BY id ASC;
                    """)
        
        services = cur.fetchall()
        
        
        
    except Exception:
        connection.close()
        return jsonify({"error":"Unable to fetch services"}), 500
    
    
    connection.close()
    return jsonify({"services": services}), 200

@app.post("/api/admin/services")
@require_admin
def admin_create_service():
    data = request.get_json() or {}
    
    name = data.get("name")
    price = data.get("price")
    duration = data.get("duration")
    category = data.get("category", None)
    
    if not name or price is None or duration is None:
        return jsonify({"error":"Missing required fields"}), 400
    
    connection = get_db()
    cur = connection.cursor()
    
    try:
        cur.execute ("""
                     INSERT INTO services (name, price, duration, category)
                     VALUES (%s, %s, %s, %s)
                     RETURNING id, name, price, duration, category, is_active; 
                     """, (name, price, duration, category))
        
        new_service = cur.fetchone()
        connection.commit()
        
    except Exception:
        connection.rollback()
        connection.close()
        return jsonify({"error":"Failed to create service"}), 500
    
    
    connection.close()
    return jsonify({"service": new_service}), 201


@app.put("/api/admin/services/<int:service_id>")
@require_admin
def admin_update_service(service_id):
    
    
    data = request.get_json() or {}
    
    name = data.get("name")
    price = data.get("price")
    duration = data.get("duration")
    category = data.get("category")
    is_active = data.get("is_active")
    
    
    if not any([name, price is not None, duration is not None, category, is_active is not None]):
        return jsonify({"error":"No fields to update"}), 400
    
    updates = []
    values =  []
    
    if name is not None:
        updates.append("name = %s")
        values.append(name)
        
    if price is not None:
        updates.append("price = %s")
        values.append(price)
        
    if duration is not None:
        updates.append("duration = %s")
        values.append(duration)
        
    if category is not None:
        updates.append("category = %s")
        values.append(category)
        
    if is_active is not None:
        updates.append("is_active = %s")
        values.append(is_active)
    
    values.append(service_id)
    
    
    query = f"""
        UPDATE services
        SET {", ".join(updates)}
        WHERE id = %s
        RETURNING id, name, price, duration, category, is_active;
    """

    
    connection = get_db()
    cur = connection.cursor()
    
    
    try:
        cur.execute (query, tuple(values))
        updated_service = cur.fetchone()
        
        if updated_service is None:
            connection.close()
            return jsonify({"error":"Service not found"}), 404
        
        
        connection.commit()
        
    except Exception:
        connection.rollback()
        connection.close()
        return jsonify({"error":"Unable to update service"}), 500
    
    connection.close()
    return jsonify({"service": updated_service}), 200


@app.delete("/api/admin/services/<int:service_id>")
@require_admin
def admin_delete_service(service_id):
    
    connection = get_db()
    cur = connection.cursor()
    
    
    try:
        cur.execute("""
                    SELECT id FROM services WHERE id = %s;
                    """, (service_id,))
        
        row = cur.fetchone()
        
        if row is None:
            connection.close()
            return jsonify({"error":"Service not found"}), 404
        
        
        cur.execute("""
                    UPDATE services
                    SET is_active = FALSE
                    WHERE id = %s
                    RETURNING id, name, price, duration, category, is_active;
                    """, (service_id,))
        
        updated = cur.fetchone()
        connection.commit()
        
    except Exception:
        connection.rollback()
        connection.close()
        return jsonify({"error":"Failed to delete service"}), 500
    
    
    connection.close()
    return jsonify({"service": updated}), 200
    
    
# Decorator that checks the Bearer header before hitting protected routes.
def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = get_bearer_token()
        if not token:
            return jsonify({"error":"Missing or invalid Authorization header"}), 401
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id")
            if not user_id:
                return jsonify({"error":"Invalid token"}), 401
            
        except jwt.ExpiredSignatureError:
            # If the token is old I just ask the user to login again.
            return jsonify({"error": "Expired token"}), 401
        
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        
        return f(user_id=user_id, *args, **kwargs)
    
    return wrapper


# Basic registration endpoint that hashes the password and stores the user.
@app.post("/api/register")
def register_user():

    data = request.get_json() or {}
    
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    
    if not name or not email or not password:
        return jsonify({"error": "Missing name, email or password"}), 400
    
    if not is_valid_email(email):
        return jsonify({"error": "Invalid or unsupported email domain"}), 400
    
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode()
    
    #start connection with data base
    connection = get_db()
    #create SQL communicator
    cur = connection.cursor()
    
    
    try:
        cur.execute(
            """INSERT INTO users (name, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id;
            """, (name, email, password_hash)
        )
        
        user_id = cur.fetchone()["id"]
        connection.commit()
    except psycopg2.errors.UniqueViolation:
        connection.rollback()
        return jsonify({"error": "Email already registered"}), 409
    except Exception:
        connection.rollback()
        return jsonify({"error": "Could not register user"}), 500
    finally:
        connection.close()
        
    
    token = create_token(user_id)
    
    return jsonify({
        "token" : token,
        "user" : {
            "id": user_id,
            "name": name,
            "email":email
        }
        
    })


# Login endpoint checks credentials and returns a fresh token.
@app.post("/api/login")
def login_user():
    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    connection = get_db()
    cur = connection.cursor()

    cur.execute("""
                SELECT id, name, email, password_hash, is_admin
                FROM users
                WHERE email = %s
                """, (email,))

    user = cur.fetchone()
    connection.close()

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    stored_hash = user["password_hash"]

    correct_password = bcrypt.checkpw(
        password.encode("utf-8"),
        stored_hash.encode("utf-8")
    )

    if not correct_password:
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_token(user["id"], user["is_admin"])

    return jsonify({
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "is_admin": user["is_admin"]
        }
    })
    


def create_booking_in_db(user_id, service, date_string, time_string, notes=None):
    
    service = (service or "").strip()
    date_string = (date_string or "").strip()
    time_string = (time_string or "").strip() 
    notes = notes.strip() if isinstance(notes, str) and notes.strip() else None
    
    
    if not service:
        return None, {"error":"Missing service"}, 400
    if not date_string:
        return None, {"error":"Missing date"}, 400
    if not time_string:
        return None, {"error": "Missing time"}, 400
    
    try:
        booking_date = datetime.date.fromisoformat(date_string)
    except ValueError:
        return None, {"error":"Invalid date format. Use YYYY-MM-DD"}, 400
    
    connection = get_db()
    cur = connection.cursor(cursor_factory=RealDictCursor)
    
    try:
        # service conflict handling
        cur.execute("""
                    SELECT id FROM bookings
                    WHERE date = %s AND time = %s AND service = %s;
                    """, (booking_date, time_string, service))
        if cur.fetchone():
            connection.close()
            return None, {"error":"This service is already booked at that time"}, 409
        
        
        # user conflict handling
        cur.execute("""
            SELECT id FROM bookings
            WHERE date = %s AND time = %s AND user_id = %s;
        """, (booking_date, time_string, user_id))
        if cur.fetchone():
            connection.close()
            return None, {"error": "You already have a booking at this time"}, 409

        # create booking 
        cur.execute("""
            INSERT INTO bookings (user_id, service, date, time, notes)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, user_id, service, date, time, notes, created_at;
        """, (user_id, service, booking_date, time_string, notes))

        booking = cur.fetchone()
        connection.commit()
        connection.close()
        return booking, None, 201
        
    except Exception:
        connection.rollback()
        connection.close()
        return None, {"error": "Failed to create booking"}

# Booking endpoint needs auth so I know who's making the reservation.
@app.post("/api/book")
@require_auth
def book_appointment(user_id):
    data = request.get_json() or {}

    booking, err, status = create_booking_in_db(
        user_id=user_id,
        service=data.get("service"),
        date_string=data.get("date"),
        time_string=data.get("time"),
        notes=data.get("notes")
    )

    if err:
        return jsonify(err), status

    return jsonify({"booking": booking}), 201
    
    
# Availability endpoint is public so the frontend can show slots.
@app.get("/api/availability")
def get_availability():
    service =request.args.get("service", "").strip()
    date_string = request.args.get("date","").strip()
    
    if not service or not date_string:
        return jsonify({"error":"Missing service or date"}), 400
    
    try:
        date_main = datetime.date.fromisoformat(date_string)
    except ValueError:
        return jsonify({"error":"Invalid date format. Use YYYY-MM-DD"}), 400
    
    connection = get_db()
    cur = connection.cursor()
    
    
    cur.execute("""
                SELECT time
                FROM bookings
                WHERE service = %s AND date = %s;
                """, (service, date_main))
    booked_slots = {row["time"] for row in cur.fetchall()}
    connection.close()
    
    slots = {}
    # I build a map of time => availability so the frontend can keep its UI simple.
    now = datetime.datetime.now()

    for slot in TIME_SLOTS:
        # slot: "14:00"
        slot_hour, slot_minute = map(int, slot.split(":"))

        slot_dt = datetime.datetime.combine(date_main, datetime.time(slot_hour, slot_minute))

        # Rule 1: slot already booked (existing logic)
        if slot in booked_slots:
            slots[slot] = False
            continue

        # Rule 2: slot is in the past (same day only)
        if date_main == now.date() and slot_dt <= now:
            slots[slot] = False
            continue

        # Otherwise available
        slots[slot] = True
        
    return jsonify({
        "service": service,
        "date": date_string,
        "slots": slots
    })


@app.get("/api/services")
def list_services():
    connection = get_db()
    cur = connection.cursor()
    try:
        cur.execute(
            """
            SELECT id, name, price, duration, category, is_active
            FROM services
            WHERE is_active = TRUE
            ORDER BY category ASC, name ASC;
            """
        )
        rows = cur.fetchall()
        services = []
        for row in rows:
            services.append({
                "id": row.get("id"),
                "name": row.get("name"),
                "price": str(row.get("price")) if row.get("price") is not None else None,
                "duration": row.get("duration"),
                "category": row.get("category") or "",
                "is_active": row.get("is_active", True),
            })
        return jsonify({"services": services})
    except Exception:
        connection.rollback()
        return jsonify({"error": "Failed to load services"}), 500
    finally:
        connection.close()
    
    
    
# Authenticated endpoint so each user can review their own bookings.
@app.get("/api/my-bookings")
@require_auth
def get_my_bookings(user_id):
    
    connection = get_db()
    cur = connection.cursor()
    
    cur.execute("""
                SELECT id,
                       service,
                       date,
                       time,
                       notes,
                       created_at,
                       (
                           date < CURRENT_DATE
                           OR (date = CURRENT_DATE AND time::time <= CURRENT_TIME)
                       ) AS is_past
                FROM bookings
                WHERE user_id = %s
                ORDER BY date ASC, time ASC;
                """, (user_id,))
    
    bookings = cur.fetchall()
    connection.close()
    
    return jsonify({"bookings": bookings})


@app.delete("/api/bookings/<int:booking_id>")
def delete_booking(booking_id):
    try:
        token = get_bearer_token()
        if not token:
            return jsonify({"error":"Missing or invalid token"}), 401

        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if not user_id:
            return jsonify({"error":"Invalid token payload"}), 401
        
    except Exception:
        return jsonify({"error": "Authentication failed"}), 401

    connection = get_db()
    cur = connection.cursor()
    
    cur.execute("""
        SELECT id FROM bookings
        WHERE id = %s AND user_id = %s;
    """, (booking_id, user_id))
    
    row = cur.fetchone()
    if row is None:
        connection.close()
        return jsonify({"error": "Booking not found"}), 404

    # 4. Delete the booking
    cur.execute("""
        DELETE FROM bookings
        WHERE id = %s AND user_id = %s;
    """, (booking_id, user_id))

    connection.commit()
    connection.close()

    return jsonify({"success": True, "message": "Booking cancelled."})

if __name__ == "__main__":
    app.run(debug=True)
