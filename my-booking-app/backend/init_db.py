print("DEBUG: init_db.py loaded")


from db import get_db
print("DEBUG: imported get_db")

def init_db():
    print("DEBUG: starting init_db()")
    
    try:
        connection = get_db()
        print("DEBUG: connected to database")
    except Exception as e:
        print("DEBUG: FAILED TO CONNECT TO DATABASE")
        print(e)
        return
    
    cur = connection.cursor()
    print("DEBUG: cursor created")
    
    try:
        #THE USER TABLE
        cur.execute("""
                    CREATE TABLE IF NOT EXISTS users(
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW()  
                    );
                    """)
        print("DEBUG: users table created")
        
        cur.execute("""
                    CREATE TABLE IF NOT EXISTS bookings(
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        service TEXT NOT NULL,
                        date DATE NOT NULL,
                        time TEXT NOT NULL,
                        notes TEXT,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    """)
        print("DEBUG: bookings table created")
        
        connection.commit()
        print("DEBUG: commit successful")
        
        
        
    except Exception as e:
        print("DEBUG: ERROR DURING TABLE CREATION")
        print(e)
        
    connection.close()
    print("DEBUG: connection closed")

    
    print("Database tables created successfully")
    
if __name__ == "__main__":
    print("DEBUG: running init_db.py directly")
    init_db()
        