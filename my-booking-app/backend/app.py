from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from functools import wraps
import os
import datetime
import jwt
import bcrypt


from db import get_db

load_dotenv()


TIME_SLOTS = [
    "09:00"
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

JWT_SECRET = os.getenv("JWT_SECRET")


def create_token(user_id):
    payload = {
        "user_id" : user_id,
        "exp" : datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return token


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
            return jsonify({"error": "Expired token"}), 401
        
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        
        return f(user_id=user_id, *args, **kwargs)
    
    return wrapper


@app.post("/api/register")
def register_user():

    data = request.get_json()
    
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    
    if not name or not email or not password:
        return jsonify({"error": "Missing name, email or password"}), 400
    
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
    except Exception as e:
        #if email already exists, it will raise error
        connection.rollback()
        return jsonify({"error": "Email already registered"})
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


@app.post("/api/login")
def login_user():
    data = request.get_json()
    
    
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    
    if not email or not password:
        return jsonify({"error":"Missing email or password"})
    
    connection = get_db()
    cur = connection.cursor()
    
    
    cur.execute("""
                SELECT id, name, email, password_hash
                FROM users
                WHERE email = %s
                """, (email,))
    
    user = cur.fetchone()
    connection.close()
    
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401
    
    stored_hash = user ["password_hash"]

    
    correct_password = bcrypt.checkpw(
        password.encode("utf-8"),
        stored_hash.encode("utf-8")
    )
    
    if not correct_password:
        return jsonify({"error": "Invalid email or password"})
    
    
    token = create_token(user["id"])
    
    return jsonify({
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    })
    

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
    
    
    try:
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
    
    
    
if __name__ == "__main__":
    app.run(debug=True)
