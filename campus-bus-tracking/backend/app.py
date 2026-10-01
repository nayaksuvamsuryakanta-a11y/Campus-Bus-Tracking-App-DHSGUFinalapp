import os

from flask import Flask, jsonify
from flask_cors import CORS

from database import init_db
from routes import api


app = Flask(__name__)
init_db()

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://campus-bus-tracking-app-dhsgu-finalapp.vercel.app",
]
frontend_origin = os.getenv("FRONTEND_ORIGIN")
if frontend_origin:
    allowed_origins.append(frontend_origin)

CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
app.register_blueprint(api, url_prefix="/api")


@app.get("/api/health")
def health():
    return jsonify({"status": "running", "service": "Campus Bus Tracking API"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG") == "1")