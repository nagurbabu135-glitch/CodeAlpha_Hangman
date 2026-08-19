import os
from pymongo import MongoClient, errors

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "hangman_db")

client = None
db = None

class MockCollection:
    def __init__(self, name):
        self.name = name
        self.data = []

    def create_index(self, *args, **kwargs):
        pass

    def find_one(self, query=None, projection=None):
        if not query:
            return self.data[0] if self.data else None
        for item in self.data:
            match = True
            for k, v in query.items():
                if k == "_id":
                    if str(item.get("_id")) != str(v):
                        match = False
                        break
                elif item.get(k) != v:
                    match = False
                    break
            if match:
                return item
        return None

    def insert_one(self, doc):
        from bson import ObjectId
        if "_id" not in doc:
            doc["_id"] = ObjectId()
        self.data.append(doc)
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(doc["_id"])

    def update_one(self, query, update):
        item = self.find_one(query)
        if item:
            if "$set" in update:
                for k, v in update["$set"].items():
                    item[k] = v
            if "$inc" in update:
                for k, v in update["$inc"].items():
                    item[k] = item.get(k, 0) + v
        class UpdateResult:
            def __init__(self):
                self.modified_count = 1 if item else 0
        return UpdateResult()

    def find(self, query=None, projection=None):
        results = []
        if not query:
            results = list(self.data)
        else:
            for item in self.data:
                match = True
                for k, v in query.items():
                    if k == "_id":
                        if str(item.get("_id")) != str(v):
                            match = False
                            break
                    elif item.get(k) != v:
                        match = False
                        break
                if match:
                    results.append(item)
        class Cursor:
            def __init__(self, res):
                self.res = res
            def sort(self, key, direction=1):
                if isinstance(key, list):
                    key = key[0][0]
                self.res.sort(key=lambda x: x.get(key, 0), reverse=(direction == -1))
                return self
            def limit(self, l):
                self.res = self.res[:l]
                return self
            def __iter__(self):
                return iter(self.res)
            def __list__(self):
                return self.res
        return Cursor(results)

    def aggregate(self, pipeline):
        results = list(self.data)
        class Cursor:
            def __init__(self, res):
                self.res = res
            def __iter__(self):
                return iter(self.res)
        return Cursor(results)

class InMemoryDB:
    def __init__(self):
        self.users = MockCollection("users")
        self.games = MockCollection("games")
        self.words = MockCollection("words")
        self.leaderboard = MockCollection("leaderboard")

def get_db():
    global client, db
    if db is None:
        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
            client.admin.command('ping')
            db = client[DB_NAME]
            print(f"[MongoDB] Successfully connected to database '{DB_NAME}' at '{MONGO_URI}'")
        except Exception as e:
            print(f"[MongoDB Warning] Could not connect to MongoDB ({e}). Falling back to In-Memory Database Mode!")
            db = InMemoryDB()
    return db

def init_indexes():
    """Create indexes for optimized queries."""
    try:
        database = get_db()
        if hasattr(database, 'users') and hasattr(database.users, 'create_index'):
            database.users.create_index("username", unique=True)
            database.users.create_index("email", unique=True)
            database.words.create_index("category")
            database.words.create_index("difficulty")
            database.games.create_index("user_id")
            database.leaderboard.create_index([("score", -1)])
            print("[MongoDB] Indexes initialized successfully.")
    except Exception as err:
        print(f"[Warning] Index initialization skipped/failed: {err}")

if __name__ == "__main__":
    init_indexes()

