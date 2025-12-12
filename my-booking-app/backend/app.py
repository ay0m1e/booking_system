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
from sentence_transformers import SentenceTransformer
import numpy as np


from db import get_db

load_dotenv()


# I keep a static schedule of slots so both frontend and backend stay in sync.
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

faq_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', device ='cpu')


FAQ_PATH = "faq_data.txt"


def load_faq_items():
    faq_pairs = []
    with open(FAQ_PATH, "r") as f:
        content = f.read()
        
        
        
    blocks = content.strip().split("\n\n")
    
    for block in blocks:
        lines = block.split("\n")
        if len(lines) >= 2:
            q = lines[0].replace("Q: ", "")
            a = lines[0].replace("A: ", "")
            faq_pairs.append((q, a))
    return faq_pairs

faq_items = load_faq_items()
faq_questions = [q for q, _ in faq_items]


faq_embeddings = np.asarray(faq_model.encode(faq_questions, convert_to_numpy=True))

def find_best_faq_match(user_query):
    query_embedding = faq_model.encode([user_query])[0]
    
    similarities = np.dot(faq_embeddings, query_embedding) / (np.linalg.norm(faq_embeddings, axis=1) * np.linalg.norm(query_embedding))
    
    best_idx = int (np.argmax(similarities))
    
    return faq_items[best_idx]



@app.post("/api/faq")
def faq_query():
    data = request.get_json()
    query = data.get("query", "")
    
    if not query:
        return jsonify({"error":"No query provided"}), 400
    
    best_q, best_a = find_best_faq_match(query)
    
    return jsonify({"question":best_q,
                    "answer":best_a 
                    })



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


def require_admin(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorisation", "")
        
        if not auth_header.startswith("Bearer "):
            return jsonify({"error":"Missing or invalid Authorisation header"}), 401
        
        token = auth_header.split(" ")[1]
        
        try:
            payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
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
                    SELECT id
                    FROM bookings
                    WHERE id = %s;
                    """, (booking_id,))
        row = cur.fetchone()
        
        if row is None:
            connection.close()
            return jsonify({"error": "Booking not found"}), 404
        
        booking_datetime = datetime.datetime.combine(row["date"], datetime.time.fromisoformat(row["time"]))
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
    data = request.get_json()
    
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
    
    
    data = request.get_json()
    
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
    return ({"service": updated})
    
    
# Decorator that checks the Bearer header before hitting protected routes.
def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorisation", "")
        
        if not auth_header.startswith("Bearer "):
            return jsonify({"error":"Missing or invalid Authorisation header"}), 401
        
        token = auth_header.split(" ")[1]
        
        try:
            payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
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

    data = request.get_json()
    
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

# Booking endpoint needs auth so I know who's making the reservation.
@app.post("/api/book")
@require_auth
def book_appointment(user_id):
    data = request.get_json() or {}
    
    service = data.get("service", "").strip()
    date_string = data.get("date", "").strip()
    time_string = data.get("time","").strip()
    notes = data.get("notes", "").strip() if data.get("notes") else None
    
    
    try:
        booking_date = datetime.date.fromisoformat(date_string)
    except ValueError:
        return jsonify({"error":"Invalid date format. Use YYYY-MM-DD"}), 400
    
    today = datetime.date.today()
    if booking_date < today:
        return jsonify({"error":"Cannot book past dates"}), 400
    
    
    connection = get_db()
    cur = connection.cursor()
    
    cur.execute("""
                SELECT name, email
                FROM users
                WHERE id = %s
                """, (user_id,))
    user_profile = cur.fetchone()
    if not user_profile:
        connection.close()
        return jsonify({"error": "User profile not found"}), 404
    
    clientName = user_profile.get("name") or "Guest"
    clientMail = user_profile.get("email") or ""
    
    
    try:
        # make sure the service/time combo isn't already taken by somebody else.
        cur.execute("""
            SELECT id FROM bookings
            WHERE date = %s AND time = %s AND service = %s;
        """, (booking_date, time_string, service))

        service_conflict = cur.fetchone()
        if service_conflict:
            connection.close()
            return jsonify({"error": "This service is already booked at that time"}), 409


        cur.execute("""
            SELECT id FROM bookings
            WHERE date = %s AND time = %s AND user_id = %s;
        """, (booking_date, time_string, user_id))

        user_conflict = cur.fetchone()
        if user_conflict:
            connection.close()
            return jsonify({"error": "You already have a booking at this time"}), 409

        cur.execute("""
            INSERT INTO bookings (user_id, service, date, time, notes)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, user_id, service, date, time, notes, created_at;
        """, (user_id, service, booking_date, time_string, notes))

        booking = cur.fetchone()
        connection.commit()

    except Exception as e:
        connection.rollback()
        connection.close()
        return jsonify({"error": "Failed to create booking"}), 500

    connection.close()

    return jsonify({
        "booking": booking
    }), 201
    
    
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
        auth_header = request.headers.get("Authorisation","")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error":"Missing or invalid token"}), 401
        
        token = auth_header.split("Bearer ")[1].strip()
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
