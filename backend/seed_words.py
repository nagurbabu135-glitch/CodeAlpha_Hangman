"""
MongoDB Word Database Seeder for Hangman Game.
Populates the 'words' collection with categorized words, difficulty levels, and hints.
"""
from db import get_db

WORDS_DATA = [
    # Programming & Tech
    {"word": "PYTHON", "category": "Programming & Tech", "difficulty": "easy", "hint": "A versatile high-level programming language named after a comedy group.", "definition": "A popular, interpreted programming language known for readability."},
    {"word": "MONGODB", "category": "Programming & Tech", "difficulty": "easy", "hint": "A popular NoSQL document-oriented database system.", "definition": "A document-based distributed database designed for modern apps."},
    {"word": "JAVASCRIPT", "category": "Programming & Tech", "difficulty": "medium", "hint": "The programming language of the Web.", "definition": "Dynamic scripting language powering web interactivity."},
    {"word": "ALGORITHM", "category": "Programming & Tech", "difficulty": "medium", "hint": "A step-by-step procedure for solving a problem.", "definition": "A finite sequence of rigorous instructions to solve computational problems."},
    {"word": "CYBERSECURITY", "category": "Programming & Tech", "difficulty": "hard", "hint": "Protection of computer systems from digital attacks.", "definition": "The practice of defending computers, servers, and networks from malicious attacks."},
    {"word": "ASYNCHRONOUS", "category": "Programming & Tech", "difficulty": "hard", "hint": "Execution mode where operations run without blocking main thread.", "definition": "A programming paradigm that allows tasks to run concurrently."},
    {"word": "MICROSERVICES", "category": "Programming & Tech", "difficulty": "hard", "hint": "Architectural pattern structuring an app as a collection of services.", "definition": "An architectural style structuring an application as decoupled services."},

    # Movies & Pop Culture
    {"word": "AVATAR", "category": "Movies & TV", "difficulty": "easy", "hint": "James Cameron sci-fi epic set on the moon Pandora.", "definition": "Blockbuster movie about blue Na'vi inhabitants of Pandora."},
    {"word": "INCEPTION", "category": "Movies & TV", "difficulty": "medium", "hint": "Mind-bending thriller directed by Christopher Nolan about dream heist.", "definition": "Film exploring subconscious dream manipulation and spinning tops."},
    {"word": "GLADIATOR", "category": "Movies & TV", "difficulty": "medium", "hint": "Are you not entertained? Maximus seeks vengeance in ancient Rome.", "definition": "Epic historical drama starring Russell Crowe as a Roman general."},
    {"word": "INTERSTELLAR", "category": "Movies & TV", "difficulty": "hard", "hint": "Space exploration film involving wormholes and gravitational time dilation.", "definition": "Sci-fi masterpiece exploring black holes and space-time physics."},
    {"word": "MATRIX", "category": "Movies & TV", "difficulty": "easy", "hint": "Red pill or blue pill? Cyberpunk reality thriller.", "definition": "Iconic sci-fi action film where humanity lives in a simulated reality."},

    # Science & Nature
    {"word": "PHOTOSYNTHESIS", "category": "Science & Nature", "difficulty": "hard", "hint": "Process by which green plants convert sunlight into chemical energy.", "definition": "Biological process transforming light energy into plant nutrients."},
    {"word": "SUPERNOVA", "category": "Science & Nature", "difficulty": "medium", "hint": "A powerful and luminous stellar explosion.", "definition": "The transient astronomical event during the last evolutionary stages of a massive star."},
    {"word": "DNA", "category": "Science & Nature", "difficulty": "easy", "hint": "Double-helix molecule carrying genetic instructions.", "definition": "Deoxyribonucleic acid, building block of life."},
    {"word": "QUANTUM", "category": "Science & Nature", "difficulty": "hard", "hint": "Branch of physics studying subatomic particles and entanglement.", "definition": "Physics operating at microscopic levels where light behaves as particles and waves."},
    {"word": "ATMOSPHERE", "category": "Science & Nature", "difficulty": "medium", "hint": "The envelope of gases surrounding the Earth or another planet.", "definition": "Gaseous layer protecting a planet from cosmic radiation and space."},

    # World History
    {"word": "RENAISSANCE", "category": "World History", "difficulty": "hard", "hint": "Fervent period of European cultural, artistic, political rebirth.", "definition": "Cultural movement spanning the 14th to 17th centuries originating in Florence."},
    {"word": "PYRAMID", "category": "World History", "difficulty": "easy", "hint": "Ancient Egyptian triangular monument for Pharaohs.", "definition": "Monumental structure with a square base and sloping sides."},
    {"word": "PARTHENON", "category": "World History", "difficulty": "medium", "hint": "Former temple on the Athenian Acropolis dedicated to Athena.", "definition": "Ancient Greek marble temple dominating the city of Athens."},
    {"word": "COLOSSEUM", "category": "World History", "difficulty": "medium", "hint": "Flavian Amphitheatre in the center of ancient Rome.", "definition": "Ancient Roman arena built for gladiatorial contests."},

    # Animals
    {"word": "CHAMELEON", "category": "Animals", "difficulty": "medium", "hint": "Reptile known for changing skin colors and independent eyes.", "definition": "Lizard species capable of camouflage and rapid tongue expansion."},
    {"word": "CHEETAH", "category": "Animals", "difficulty": "easy", "hint": "The fastest land mammal on Earth.", "definition": "Spotted big cat native to Africa and Iran capable of 70mph sprints."},
    {"word": "OCTOPUS", "category": "Animals", "difficulty": "medium", "hint": "Eight-armed highly intelligent marine creature with 3 hearts.", "definition": "Soft-bodied sea creature with eight tentacles and camouflage skills."},
    {"word": "PLATYPUS", "category": "Animals", "difficulty": "hard", "hint": "Duck-billed egg-laying mammal native to eastern Australia.", "definition": "Unique semiaquatic mammal with a bill, webbed feet, and venomous spurs."},

    # Food & Culinary
    {"word": "CAPPUCCINO", "category": "Food & Culinary", "difficulty": "medium", "hint": "Italian coffee drink prepared with espresso and steamed milk foam.", "definition": "Popular espresso beverage topped with velvety frothed milk."},
    {"word": "GUACAMOLE", "category": "Food & Culinary", "difficulty": "medium", "hint": "Avocado-based dip originated in Mexico.", "definition": "Traditional Mexican dip made from mashed ripe avocados, lime juice, and salt."},
    {"word": "CROISSANT", "category": "Food & Culinary", "difficulty": "hard", "hint": "Flaky, buttery French pastry shaped like a crescent.", "definition": "Laminated yeast-leavened dough pastry baked into crescent shapes."},
    {"word": "CHOCOLATE", "category": "Food & Culinary", "difficulty": "easy", "hint": "Sweet food made from roasted and ground cacao seeds.", "definition": "Confectionery product derived from cocoa beans enjoyed worldwide."}
]

def seed_words():
    db = get_db()
    words_col = db.words
    
    # Check existing count
    existing_count = words_col.count_documents({})
    print(f"[Seed] Existing words count in MongoDB: {existing_count}")
    
    # Upsert words based on word string
    inserted_or_updated = 0
    for word_item in WORDS_DATA:
        words_col.update_one(
            {"word": word_item["word"]},
            {"$set": word_item},
            upsert=True
        )
        inserted_or_updated += 1
        
    print(f"[Seed] Successfully seeded {inserted_or_updated} words into MongoDB database 'hangman_db'!")

if __name__ == "__main__":
    seed_words()
