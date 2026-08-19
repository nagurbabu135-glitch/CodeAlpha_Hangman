import os
import random
import datetime
import bcrypt
import jwt
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from db import get_db, init_indexes

# Initialize Flask App
app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

# Configuration & Constants
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-hangman-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Difficulty Attempt Mapping
DIFFICULTY_MAX_ATTEMPTS = {
    "easy": 8,
    "medium": 6,
    "hard": 5
}

# Ensure MongoDB Indexes on Startup
try:
    init_indexes()
except Exception as err:
    print(f"[Warning] Failed to initialize index automatically: {err}")

# Helper Functions
def generate_token(user_id, username):
    payload = {
        "user_id": str(user_id),
        "username": username,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization")
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
        
        if not token:
            return jsonify({"error": "Authorization token is missing!"}), 401
            
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
            db = get_db()
            from bson.objectid import ObjectId
            user = db.users.find_one({"_id": ObjectId(data["user_id"])})
            if not user:
                return jsonify({"error": "User associated with token not found!"}), 401
            request.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired! Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid authorization token!"}), 401
        except Exception as e:
            return jsonify({"error": f"Token verification error: {str(e)}"}), 401
            
        return f(*args, **kwargs)
    return decorated

# Static File Routes (Serve Frontend SPA)
@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

# AUTHENTICATION ENDPOINTS
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters long."}), 400
    if not email or "@" not in email:
        return jsonify({"error": "Please provide a valid email address."}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400

    db = get_db()
    
    # Check duplicate user
    if db.users.find_one({"username": username}):
        return jsonify({"error": "Username is already taken."}), 400
    if db.users.find_one({"email": email}):
        return jsonify({"error": "Email address is already registered."}), 400

    # Hash Password
    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    user_doc = {
        "username": username,
        "email": email,
        "password": hashed_pw,
        "created_at": datetime.datetime.now(datetime.timezone.utc),
        "stats": {
            "games_played": 0,
            "games_won": 0,
            "games_lost": 0,
            "current_streak": 0,
            "best_streak": 0,
            "high_score": 0,
            "total_score": 0
        }
    }

    result = db.users.insert_one(user_doc)
    user_id = result.inserted_id

    # Create Leaderboard entry
    db.leaderboard.update_one(
        {"username": username},
        {"$set": {
            "user_id": str(user_id),
            "username": username,
            "score": 0,
            "wins": 0,
            "best_streak": 0,
            "updated_at": datetime.datetime.now(datetime.timezone.utc)
        }},
        upsert=True
    )

    token = generate_token(user_id, username)
    return jsonify({
        "message": "User registered successfully!",
        "token": token,
        "user": {
            "id": str(user_id),
            "username": username,
            "email": email,
            "stats": user_doc["stats"]
        }
    }), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username_or_email = data.get("username_or_email", "").strip()
    password = data.get("password", "")

    if not username_or_email or not password:
        return jsonify({"error": "Username/Email and password are required."}), 400

    db = get_db()
    # Find user by username or email
    user = db.users.find_one({
        "$or": [
            {"username": username_or_email},
            {"email": username_or_email.lower()}
        ]
    })

    if not user:
        return jsonify({"error": "Invalid login credentials."}), 401

    # Verify Password
    if not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
        return jsonify({"error": "Invalid login credentials."}), 401

    token = generate_token(user["_id"], user["username"])
    return jsonify({
        "message": "Login successful!",
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "stats": user.get("stats", {})
        }
    }), 200

@app.route("/api/auth/me", methods=["GET"])
@token_required
def get_current_user():
    user = request.current_user
    return jsonify({
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "stats": user.get("stats", {})
        }
    }), 200

# CATEGORIES & DIFFICULTY API
@app.route("/api/categories", methods=["GET"])
def get_categories():
    db = get_db()
    categories = db.words.distinct("category")
    if not categories:
        categories = ["Programming & Tech", "Movies & TV", "Science & Nature", "World History", "Animals", "Food & Culinary"]
    return jsonify({
        "categories": categories,
        "difficulties": ["easy", "medium", "hard"]
    }), 200

# GAMEPLAY ENDPOINTS
@app.route("/api/game/start", methods=["POST"])
@token_required
def start_game():
    data = request.get_json() or {}
    category = data.get("category", "All")
    difficulty = data.get("difficulty", "medium").lower()

    if difficulty not in DIFFICULTY_MAX_ATTEMPTS:
        difficulty = "medium"

    db = get_db()

    # Query matching word from MongoDB
    query = {}
    if category and category != "All":
        query["category"] = category
    if difficulty:
        query["difficulty"] = difficulty

    words_cursor = list(db.words.find(query))
    if not words_cursor:
        words_cursor = list(db.words.find({"category": category} if category != "All" else {}))
    
    if not words_cursor:
        word_obj = {
            "word": "HANGMAN",
            "category": "General",
            "difficulty": difficulty,
            "hint": "Classic word guessing game.",
            "definition": "A word guessing game where incorrect guesses draw a hanged man."
        }
    else:
        # Non-repetition per user session tracking
        user_id_str = str(request.current_user["_id"])
        if not hasattr(app, 'user_used_words_map'):
            app.user_used_words_map = {}
        if user_id_str not in app.user_used_words_map:
            app.user_used_words_map[user_id_str] = set()
            
        user_set = app.user_used_words_map[user_id_str]
        available_words = [w for w in words_cursor if w.get("word") not in user_set]

        if not available_words:
            for w in words_cursor:
                user_set.discard(w.get("word"))
            word_obj = random.choice(words_cursor)
        else:
            word_obj = random.choice(available_words)

        user_set.add(word_obj.get("word"))

    secret_word = word_obj["word"].upper()

    max_attempts = DIFFICULTY_MAX_ATTEMPTS.get(difficulty, 6)

    # Masked representation
    masked_word = ["_" if char.isalpha() else char for char in secret_word]

    game_doc = {
        "user_id": str(request.current_user["_id"]),
        "username": request.current_user["username"],
        "word": secret_word,
        "category": word_obj.get("category", "General"),
        "difficulty": difficulty,
        "hint": word_obj.get("hint", ""),
        "definition": word_obj.get("definition", ""),
        "guessed_letters": [],
        "wrong_guesses": [],
        "attempts_remaining": max_attempts,
        "max_attempts": max_attempts,
        "hint_used": False,
        "status": "IN_PROGRESS",
        "created_at": datetime.datetime.now(datetime.timezone.utc),
        "score": 0
    }

    result = db.games.insert_one(game_doc)
    game_id = str(result.inserted_id)

    return jsonify({
        "game_id": game_id,
        "masked_word": " ".join(masked_word),
        "word_length": len(secret_word),
        "category": game_doc["category"],
        "difficulty": difficulty,
        "attempts_remaining": max_attempts,
        "max_attempts": max_attempts,
        "guessed_letters": [],
        "status": "IN_PROGRESS"
    }), 200

@app.route("/api/game/guess", methods=["POST"])
@token_required
def process_guess():
    data = request.get_json() or {}
    game_id = data.get("game_id")
    letter = data.get("letter", "").upper().strip()

    if not game_id or not letter or len(letter) != 1 or not letter.isalpha():
        return jsonify({"error": "Invalid guess format. Must be a single letter."}), 400

    db = get_db()
    from bson.objectid import ObjectId

    try:
        game = db.games.find_one({"_id": ObjectId(game_id), "user_id": str(request.current_user["_id"])})
    except Exception:
        return jsonify({"error": "Game session not found."}), 404

    if not game:
        return jsonify({"error": "Game session not found."}), 404

    if game["status"] != "IN_PROGRESS":
        return jsonify({"error": "This game session has already finished."}), 400

    guessed_letters = game.get("guessed_letters", [])
    if letter in guessed_letters:
        return jsonify({"error": f"Letter '{letter}' has already been guessed."}), 400

    guessed_letters.append(letter)
    secret_word = game["word"]
    wrong_guesses = game.get("wrong_guesses", [])
    attempts_remaining = game["attempts_remaining"]

    is_correct = letter in secret_word
    if not is_correct:
        wrong_guesses.append(letter)
        attempts_remaining -= 1

    # Check if word is fully revealed
    word_revealed = all(char in guessed_letters or not char.isalpha() for char in secret_word)
    game_status = "IN_PROGRESS"
    earned_score = 0

    if word_revealed:
        game_status = "WON"
        # Calculate Score: Base (100) + Remaining attempts * 25 + Difficulty multiplier
        diff_mult = {"easy": 1, "medium": 1.5, "hard": 2.0}.get(game["difficulty"], 1)
        hint_penalty = 30 if game.get("hint_used") else 0
        earned_score = int((100 + (attempts_remaining * 25) - hint_penalty) * diff_mult)
        if earned_score < 10:
            earned_score = 10
    elif attempts_remaining <= 0:
        game_status = "LOST"

    # Update Game Document in MongoDB
    db.games.update_one(
        {"_id": ObjectId(game_id)},
        {"$set": {
            "guessed_letters": guessed_letters,
            "wrong_guesses": wrong_guesses,
            "attempts_remaining": attempts_remaining,
            "status": game_status,
            "score": earned_score,
            "updated_at": datetime.datetime.now(datetime.timezone.utc)
        }}
    )

    # Build Masked Word
    masked_word = [char if char in guessed_letters or not char.isalpha() else "_" for char in secret_word]

    # If Game Ended, update User Stats & Leaderboard
    user = request.current_user
    stats = user.get("stats", {
        "games_played": 0, "games_won": 0, "games_lost": 0,
        "current_streak": 0, "best_streak": 0, "high_score": 0, "total_score": 0
    })

    if game_status in ["WON", "LOST"]:
        stats["games_played"] += 1
        if game_status == "WON":
            stats["games_won"] += 1
            stats["current_streak"] += 1
            if stats["current_streak"] > stats["best_streak"]:
                stats["best_streak"] = stats["current_streak"]
            stats["total_score"] += earned_score
            if earned_score > stats["high_score"]:
                stats["high_score"] = earned_score
        else:
            stats["games_lost"] += 1
            stats["current_streak"] = 0

        # Persist updated stats in MongoDB User collection
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"stats": stats}}
        )

        # Update Leaderboard Entry in MongoDB
        db.leaderboard.update_one(
            {"username": user["username"]},
            {"$set": {
                "score": stats["high_score"],
                "total_score": stats["total_score"],
                "wins": stats["games_won"],
                "best_streak": stats["best_streak"],
                "updated_at": datetime.datetime.now(datetime.timezone.utc)
            }},
            upsert=True
        )

    response_payload = {
        "letter": letter,
        "is_correct": is_correct,
        "masked_word": " ".join(masked_word),
        "attempts_remaining": attempts_remaining,
        "max_attempts": game["max_attempts"],
        "wrong_guesses": wrong_guesses,
        "guessed_letters": guessed_letters,
        "status": game_status,
        "score": earned_score,
        "stage": game["max_attempts"] - attempts_remaining
    }

    if game_status in ["WON", "LOST"]:
        response_payload["secret_word"] = secret_word
        response_payload["definition"] = game.get("definition", "")
        response_payload["user_stats"] = stats

    return jsonify(response_payload), 200

@app.route("/api/game/hint", methods=["POST"])
@token_required
def get_game_hint():
    data = request.get_json() or {}
    game_id = data.get("game_id")

    if not game_id:
        return jsonify({"error": "Game ID required."}), 400

    db = get_db()
    from bson.objectid import ObjectId

    try:
        game = db.games.find_one({"_id": ObjectId(game_id), "user_id": str(request.current_user["_id"])})
    except Exception:
        return jsonify({"error": "Game not found."}), 404

    if not game or game["status"] != "IN_PROGRESS":
        return jsonify({"error": "Game not active."}), 400

    # Mark hint as used
    db.games.update_one(
        {"_id": ObjectId(game_id)},
        {"$set": {"hint_used": True}}
    )

    return jsonify({
        "hint": game.get("hint", "No hint available for this word.")
    }), 200

# LEADERBOARD & STATS API
@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    db = get_db()
    # Fetch top 10 players sorted by high score descending
    top_players = list(db.leaderboard.find({}, {"_id": 0}).sort("score", -1).limit(10))
    return jsonify({"leaderboard": top_players}), 200

@app.route("/api/stats", methods=["GET"])
@token_required
def get_user_stats():
    user = request.current_user
    db = get_db()
    
    # Recent games
    recent_games = list(db.games.find(
        {"user_id": str(user["_id"])},
        {"_id": 0, "word": 1, "category": 1, "difficulty": 1, "status": 1, "score": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5))

    return jsonify({
        "username": user["username"],
        "stats": user.get("stats", {}),
        "recent_games": recent_games
    }), 200

# Main Server Launcher
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"\n=======================================================")
    print(f"[SERVER] Hangman Python + MongoDB Server is running on port {port}")
    print(f"[SERVER] Access Web Interface at: http://127.0.0.1:{port}")
    print(f"=======================================================\n")
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
