from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import datetime
import jwt
import bcrypt


from db import get_db

load_dotenv()

print("DEBUG app.py loaded", flush=True)


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



@app.post("/api/register")
def register_user():
    app.logger.info("DEBUG /api/register hit")

    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json(silent=True) or {}
    
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    
    if not name or not email or not password:
        return jsonify({"error": "Missing name, email or password"}), 400

    password_bytes_len = len(password.encode("utf-8"))
    print(
        "DEBUG register payload:",
        {"name": name, "email": email, "password_len_bytes": password_bytes_len, "password_value": password},
        flush=True,
    )

    if password_bytes_len > 72:
        return jsonify({"error": "Password too long for bcrypt (max 72 bytes)"}), 400
    
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
    app.logger.info("DEBUG /api/login hit")

    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    password_bytes_len = len(password.encode("utf-8"))
    if password_bytes_len > 72:
        return jsonify({"error": "Password too long for bcrypt (max 72 bytes)"}), 400

    connection = get_db()
    cur = connection.cursor()

    try:
        cur.execute(
            """SELECT id, name, email, password_hash
               FROM users
               WHERE email = %s
            """,
            (email,),
        )
        user = cur.fetchone()
    finally:
        connection.close()

    if not user or not user.get("password_hash"):
        return jsonify({"error": "Invalid email or password"}), 401

    stored_hash = user["password_hash"]
    if not bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8")):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_token(user["id"])

    return jsonify({
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
        },
    })
    
if __name__ == "__main__":
    app.run(debug=True)
