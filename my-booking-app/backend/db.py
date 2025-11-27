import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db():
    connection = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return connection

    
