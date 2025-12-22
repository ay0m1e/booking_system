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
from groq import Groq
import json
import uuid


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

# Booking assistant sessions expire so stale context doesn't leak across chats.
SESSION_TTL_MINUTES = 30

ASSISTANT_SESSIONS = {}


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

def extract_booking_intent(user_input):
    response = groq_client.chat.completions.create(
        model = "llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a JSON generator.\n"
                    "Return ONLY valid JSON.\n"
                    "Use double quotes for all keys and values.\n"
                    "Do not include comments, markdown, or extra text.\n"
                    "The JSON schema is:\n"
                    "{ \"service\": string | null, \"date\": string | null, \"time_window\": string | null }\n"
                    "Date format must be YYYY-MM-DD.")
                },
            {
                "role":"user",
                "content": user_input
            }
        ], temperature=0
    )
    
    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(raw)
    except Exception:
        return {"service": None, "date": None, "time_window": None}


def get_active_services():
    connection = get_db()
    cur = connection.cursor()
    cur.execute("""
                SELECT id, name, duration
                FROM services
                WHERE is_active = TRUE
                """)
    
    rows = cur.fetchall()
    connection.close()
    
    services = []
    
    for row in rows:
        services.append({
            "id": row["id"],
            "name": row["name"],
            "duration": row["duration"]
        })
    return services
    
    
def match_service(intent_service, services):
    if not intent_service:
        return None

    def normalise_service_text(value):
        # Strip apostrophes before removing other punctuation so words stay joined (e.g., \"boy's\" -> \"boys\").
        lower = re.sub(r"[’']", "", value.lower())
        cleaned = re.sub(r"[^a-z0-9\s]", " ", lower)
        return " ".join(cleaned.split())

    intent_clean = normalise_service_text(intent_service)
    intent_words = set(intent_clean.split())

    for service in services:
        name_clean = normalise_service_text(service["name"])
        name_words = set(name_clean.split())

        # Direct substring check on cleaned text covers punctuation differences.
        if intent_clean and (intent_clean in name_clean or name_clean in intent_clean):
            return service

        # Fallback: word overlap so minor misspellings or extra words still match.
        if intent_words and name_words:
            overlap = len(intent_words & name_words)
            if overlap / max(len(intent_words), len(name_words)) >= 0.6:
                return service
    return None
    
def parse_hour(value):
    value = value.strip().lower()
    
    if ":" in value:
        return int(value.split(":")[0])
    
    if value.endswith("am") or value.endswith("pm"):
        hour = int(value[:-2])
        if value.endswith("pm") and hour != 12:
            return hour + 12
        
        if value.endswith("am") and hour == 12:
            return 0
        
        return hour
    return int(value)

def filter_time_slots(time_window):
    if not time_window:
        return TIME_SLOTS
    
    time_window = time_window.lower()
    
    def hour(slot):
        return int(slot.split(":")[0])
    
    parts = time_window.split()
    
    if time_window.startswith("after"):
        h= parse_hour(parts[1])
        return [t for t in TIME_SLOTS if hour(t) > h]
    
    if time_window.startswith("before"):
        h= parse_hour(parts[1])
        return [t for t in TIME_SLOTS if hour(t) < h]
    
    if time_window.startswith("between"):
        start, end = parts[1].split("-")
        h1 = parse_hour(start)
        h2 = parse_hour(end)
        return [t for t in TIME_SLOTS if h1 <= hour(t) < h2]
    
    if time_window == "morning":
        return [t for t in TIME_SLOTS if 9 <= hour(t) < 12]
    
    if time_window == "afternoon":
        return [t for t in TIME_SLOTS if 12 <= hour(t) < 17]

    return TIME_SLOTS
    

def session_is_stale(session):
    last = session.get("updated_at")
    if not last:
        return False
    age = datetime.datetime.utcnow() - last
    return age > datetime.timedelta(minutes=SESSION_TTL_MINUTES)


def get_session(session_id):
    session = ASSISTANT_SESSIONS.get(session_id)
    if not session:
        return None
    if session_is_stale(session):
        ASSISTANT_SESSIONS.pop(session_id, None)
        return None
    return session


def touch_session(session):
    session["updated_at"] = datetime.datetime.utcnow()


def clear_session(session_id):
    ASSISTANT_SESSIONS.pop(session_id, None)


def get_available_slots_for_times(service, date_string, candidate_times):
    try:
        date_main = datetime.date.fromisoformat(date_string)
    except ValueError:
        return []
    
    connection = get_db()
    cur = connection.cursor()
    cur.execute("""
                SELECT time
                FROM bookings
                WHERE service = %s AND date = %s;
                """, (service, date_main)) 
    
    booked_slots = {row["time"] for row in cur.fetchall()}
    connection.close()
    
    available = []
    now = datetime.datetime.now()
    
    for slot in candidate_times:
        # slot: "14:00"
        slot_hour, slot_minute = map(int, slot.split(":"))

        slot_dt = datetime.datetime.combine(date_main, datetime.time(slot_hour, slot_minute))

        # Rule 1: slot already booked (existing logic)
        if slot in booked_slots:
            continue

        # Rule 2: slot is in the past (same day only)
        if date_main == now.date() and slot_dt <= now:
            continue

        # Otherwise available
        available.append(slot)
        
    return available

def format_booking_response(service, date, slots):
    if not slots:
        return f"Sorry, there are no available times for {service} on {date}."
    
    slots_text = ", ".join(slots[:5])
    
    response = groq_client.chat.completions.create(
        model = "llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content" : "You are a friendly salon booking assistant. Be concise."
            },
            {
                "role":"user",
                "content": (
                    f"Service: {service}\n"
                    f"Date: {date}\n"
                    f"Available times: {slots_text}"
                )
            }
        ], temperature=0.4
    )
    
    return response.choices[0].message.content

def classify_assistant_intent(user_input):
    response = groq_client.chat.completions.create(
        model = "llama-3.1-8b-instant",
        messages=[
            {
                "role":"system",
                "content": (
                    "Classify the user's intent.\n"
                    "Return ONLY one word:\n"
                    "- faq\n"
                    "- booking\n\n"
                    "Use 'booking' if user is trying to book, reschedule, "
                    "check availability, or mentions dates or times.\n"
                    "Otherwise use 'faq'."
                )
            },
            {
                "role": "user",
                "content": user_input
            }
        ], temperature=0
    )
    
    return response.choices[0].message.content.strip().lower()

def handle_booking_followup(user_input, session_id, session):
    text = (user_input or "").strip().lower()

    # If we're waiting for confirmation, handle yes/no deterministically.
    if session.get("status") == "awaiting_confirmation":
        yes_words = {"yes", "yep", "yeah", "confirm", "book it", "go ahead", "okay", "ok"}
        no_words = {"no", "nope", "not now", "cancel", "stop", "change"}

        if text in yes_words:
            # Need a logged-in user to actually book
            token = get_bearer_token()
            if not token:
                return jsonify({
                    "session_id": session_id,
                    "message": "Please log in first so I can confirm your booking."
                }), 200

            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                user_id = payload.get("user_id")
            except Exception:
                return jsonify({
                    "session_id": session_id,
                    "message": "Your login session expired. Please log in again."
                }), 200

            booking, err, status = create_booking_in_db(
                user_id=user_id,
                service=session.get("service"),
                date_string=session.get("date"),
                time_string=session.get("selected_time"),
                notes=None
            )

            if err:
                # If slot got taken, re-check and offer new slots
                if status == 409:
                    candidate_times = filter_time_slots(session.get("time_window"))
                    session["available_slots"] = get_available_slots_for_times(
                        session["service"], session["date"], candidate_times
                    )
                    session["status"] = None
                    session["selected_time"] = None
                    touch_session(session)

                    slots = session["available_slots"]
                    if not slots:
                        return jsonify({
                            "session_id": session_id,
                            "message": (
                                f"Sorry, that time was just taken and there are no other "
                                f"available slots for {session['service']} on {session['date']}. "
                                f"Would you like to try another day?"
                            )
                        }), 200

                    return jsonify({
                        "session_id": session_id,
                        "available_slots": slots,
                        "message": (
                            f"Sorry, that time was just taken. Here are the next available times: "
                            f"{' or '.join(slots)}"
                        )
                    }), 200

                return jsonify({
                    "session_id": session_id,
                    "message": "Sorry, I couldn’t complete that booking. Please try again."
                }), 200

            # Success
            clear_session(session_id)
            return jsonify({
                "message": (
                    f"✅ Booking confirmed!\n\n"
                    f"Service: {booking['service']}\n"
                    f"Date: {booking['date']}\n"
                    f"Time: {booking['time']}\n\n"
                    f"You can view it in My Bookings."
                ),
                "booking": booking
            }), 200

        if text in no_words:
            # Go back to choosing a time
            session["status"] = None
            session["selected_time"] = None
            touch_session(session)
            return jsonify({
                "session_id": session_id,
                "available_slots": session.get("available_slots", []),
                "message": "No problem. Pick a different time from the available slots."
            }), 200

        return jsonify({
            "session_id": session_id,
            "message": "Please reply 'yes' to confirm, or 'no' to choose another time."
        }), 200

    # Otherwise, treat this message as a slot choice (only if we have slots)
    chosen = user_input.strip()
    if chosen in session.get("available_slots", []):
        session["selected_time"] = chosen
        session["status"] = "awaiting_confirmation"
        touch_session(session)
        return jsonify({
            "session_id": session_id,
            "message": (
                f"Great. I can book your {session['service']} on {session['date']} at {chosen}.\n\n"
                f"Reply 'yes' to confirm, or 'no' to choose another time."
            )
        }), 200

    return jsonify({
        "session_id": session_id,
        "message": f"Please choose one of these times: {' or '.join(session.get('available_slots', []))}"
    }), 200
    

@app.post("/api/assistant")
def assistant():
    data = request.get_json() or {}
    user_input = data.get("query", "").strip()
    session_id = data.get("session_id")
    
    
    if not user_input:
        return jsonify({"error":"No query identified"}), 400

    session = get_session(session_id) if session_id else None
    # If the user clicks a provided slot, skip LLM calls to avoid flaky upstream errors.
    if session and session.get("intent") == "booking" and session.get("available_slots") and user_input in session["available_slots"]:
        touch_session(session)
        return handle_booking_followup(user_input, session)

    intent_label = classify_assistant_intent(user_input)
    # Keep booking routing narrow so FAQ-style questions (e.g., parking) don't get misrouted.
    extracted = extract_booking_intent(user_input)
    has_booking_signal = (
        intent_label == "booking"
        or any(word in user_input.lower() for word in [
            "book", "booking", "appointment", "schedule", "haircut"
        ])
    )

    # When already in a booking session, accept extracted date/time/service hints even if classifier is unsure.
    booking_reply = has_booking_signal
    if session and session.get("intent") == "booking":
        booking_reply = booking_reply or extracted.get("service") or extracted.get("date") or extracted.get("time_window")

    if session and session["intent"] == "booking":
        touch_session(session)
        # If we already offered times, treat the next reply as a slot choice.
        if session.get("available_slots"):
            # If the user is no longer talking about booking, drop the session and answer as FAQ.
            if not booking_reply:
                clear_session(session_id)
                return faq_internal(user_input)
            return handle_booking_followup(user_input, session, session_id)
        # If the user clearly isn't talking about booking, drop to FAQ without using stale booking data.
        if not booking_reply:
            clear_session(session_id)
            return faq_internal(user_input)
        return booking_assistant_internal(user_input, session_id)

    if booking_reply:
        return booking_assistant_internal(user_input, session_id)

    return faq_internal(user_input)


def normalise_date(value):
    if not value:
        return None
    
    value = value.lower().strip()
    today = datetime.date.today()
    
    if value == "today":
        return today.isoformat()
    
    if value == "tomorrow":
        return (today +datetime.timedelta(days=1)).isoformat()
    
    try:
        parsed = datetime.date.fromisoformat(value)
    except ValueError:
        return None
    
    if parsed < today:
        return None
    
    return parsed.isoformat()
    

@app.post("/api/ai/booking-assistant")
def booking_assistant():
    data = request.get_json() or {}
    user_input = data.get("query", "").strip()
    return booking_assistant_internal(user_input)
    
def booking_assistant_internal(user_input, session_id=None):
    if not session_id:
        session_id = str(uuid.uuid4())
        
    session = get_session(session_id)
    
    if not session:
        session = {
            "intent": "booking",
            "service": None,
            "date": None,
            "time_window": None,
            "available_slots": [],
            "updated_at": datetime.datetime.utcnow()
        }
        
        ASSISTANT_SESSIONS[session_id] = session
    else:
        touch_session(session)
        
    intent = extract_booking_intent(user_input)

    # If we're already in a booking thread and still waiting for a service, use the raw reply as a fallback service guess.
    if session_id and session and session.get("service") is None and not intent.get("service") and user_input:
        intent["service"] = user_input.strip()
    
    if not session.get("service") and not intent.get("service"):
        return jsonify({
            "session_id": session_id,
            "message":"What service would you like to book?"
        })
    
    if intent.get("service") and not session["service"]:
        services = get_active_services()
        matched = match_service(intent["service"], services)
        
        if not matched:
            return jsonify({
                "session_id": session_id,
                "message":"What service would you like to book?"
            }), 200
            
        session["service"] = matched["name"]
        
        
    if intent.get("date") and not session["date"]:
        normalized = normalise_date(intent["date"])
        if not normalized:
            return jsonify({
                "session_id": session_id,
                "message": "Please provide a future date in YYYY-MM-DD format."
            }), 200
        session["date"] = normalized
        
        
    if intent.get("time_window") and not session["time_window"]:
        session["time_window"] = intent["time_window"]
        
        
    if not session ["service"]:
        return jsonify({
            "session_id": session_id,
            "message": "What service would you like to book?"
        }), 200
        
    if not session ["date"]:
        return jsonify({
            "session_id": session_id,
            "message": "What day would you like to book for?"
        }), 200
        
    if not session ["time_window"]:
        return jsonify({
            "session_id": session_id,
            "message": "What time works best for you?"
        }), 200
        
    
    if not session["available_slots"]:
        candidate_times = filter_time_slots(session["time_window"])
        
        session["available_slots"] = get_available_slots_for_times(
            session["service"],
            session["date"],
            candidate_times
        )
        
    slots = session["available_slots"]
    
    if not slots:
        return jsonify({
            "session_id":session_id,
            "message": (
                f"Sorry, there are no available times for a {session['service']} "
                f"on {session['date']}. Would you like to try another day?"
            )
        }), 200
        
        
    if len(slots) == 1:
        # Keep the session_id in the response so the next user reply continues the thread.
        return jsonify({
            "session_id": session_id,
            "available_slots": slots,
            "message": (
                f"We have one available time for a {session['service']} on "
                f"{session['date']}: {slots[0]}. Would you like to book it?"
            )
        }), 200
    
    # Step 3: respond nicely    
    
    return jsonify({
        "session_id" : session_id,
        "available_slots": slots,
        "message": (
            f"I have {len(slots)} available times for a {session['service']} "
            f"on {session['date']}.\n\n"
            f"Would you like { ' or '.join(slots) }?"
        )
        }), 200




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
    if len(parts) != 2 or parts[0] != "Bearer" or not parts[1]:
        return None
    return parts[1].strip()


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
        booking_date = datetime.date.isoformat(date_string)
        
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
