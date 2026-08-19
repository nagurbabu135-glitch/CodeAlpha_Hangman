"""
MongoDB & In-Memory Word Database Seeder for Hangman Game.
Populates categorized words with detailed tips/hints, definitions, and difficulty settings.
"""
from db import get_db

WORDS_DATA = [
    # Programming & Tech
    {"word": "PYTHON", "category": "Programming & Tech", "difficulty": "easy", "hint": "A versatile high-level programming language named after a British comedy group.", "definition": "A popular, interpreted programming language known for readability and AI data science."},
    {"word": "MONGODB", "category": "Programming & Tech", "difficulty": "easy", "hint": "A leading NoSQL document-oriented database storing data in JSON-like BSON.", "definition": "A document-based distributed database designed for modern web applications."},
    {"word": "JAVASCRIPT", "category": "Programming & Tech", "difficulty": "medium", "hint": "The foundational programming language powering web browser interactivity.", "definition": "Dynamic scripting language driving front-end and back-end web applications."},
    {"word": "REACT", "category": "Programming & Tech", "difficulty": "easy", "hint": "Popular declarative UI component library developed by Meta.", "definition": "Frontend JavaScript library using a virtual DOM for building user interfaces."},
    {"word": "EXPRESS", "category": "Programming & Tech", "difficulty": "medium", "hint": "Fast, unopinionated, minimalist web framework for Node.js.", "definition": "Standard backend web server framework for Node.js applications."},
    {"word": "NODEJS", "category": "Programming & Tech", "difficulty": "medium", "hint": "Event-driven asynchronous JavaScript runtime built on Chrome's V8 engine.", "definition": "Server-side JavaScript environment enabling scalable network apps."},
    {"word": "ALGORITHM", "category": "Programming & Tech", "difficulty": "medium", "hint": "A step-by-step procedure for solving a computational problem.", "definition": "A finite sequence of rigorous instructions to solve mathematical problems."},
    {"word": "CYBERSECURITY", "category": "Programming & Tech", "difficulty": "hard", "hint": "Protection of computer systems, networks, and data from digital attacks.", "definition": "The practice of defending servers, networks, and data from malicious cyber threats."},
    {"word": "ASYNCHRONOUS", "category": "Programming & Tech", "difficulty": "hard", "hint": "Execution mode where operations run concurrently without blocking main thread.", "definition": "A programming paradigm allowing tasks to process in parallel."},
    {"word": "MICROSERVICES", "category": "Programming & Tech", "difficulty": "hard", "hint": "Architectural pattern structuring an app as a collection of decoupled services.", "definition": "An architectural style structuring applications as small, independent services."},
    {"word": "DOCKER", "category": "Programming & Tech", "difficulty": "medium", "hint": "Containerization platform to package applications with their dependencies.", "definition": "OS-level virtualization platform for lightweight software containers."},
    {"word": "KUBERNETES", "category": "Programming & Tech", "difficulty": "hard", "hint": "Container orchestration system automating deployment, scaling, and management.", "definition": "Open-source container management platform created by Google."},
    {"word": "TYPESCRIPT", "category": "Programming & Tech", "difficulty": "medium", "hint": "Strongly typed programming language that compiles to JavaScript.", "definition": "Microsoft-developed typed superset of JavaScript enhancing code safety."},
    {"word": "BLOCKCHAIN", "category": "Programming & Tech", "difficulty": "hard", "hint": "Immutable decentralized digital ledger technology behind cryptocurrencies.", "definition": "Cryptographic distributed peer-to-peer transaction chain."},

    # Movies & TV
    {"word": "INCEPTION", "category": "Movies & TV", "difficulty": "medium", "hint": "Mind-bending thriller directed by Christopher Nolan about dream heist.", "definition": "Film exploring subconscious dream manipulation and spinning tops."},
    {"word": "AVENGERS", "category": "Movies & TV", "difficulty": "easy", "hint": "Earth's mightiest heroes assemble to defeat global and cosmic threats.", "definition": "Marvel superhero blockbuster team assembly."},
    {"word": "GLADIATOR", "category": "Movies & TV", "difficulty": "medium", "hint": "Are you not entertained? Maximus seeks vengeance in ancient Rome.", "definition": "Epic historical drama starring Russell Crowe as a Roman general."},
    {"word": "INTERSTELLAR", "category": "Movies & TV", "difficulty": "hard", "hint": "Astronaut team travels through a wormhole near Saturn to save humanity.", "definition": "Sci-fi masterpiece exploring black holes and space-time physics."},
    {"word": "MATRIX", "category": "Movies & TV", "difficulty": "easy", "hint": "Red pill or blue pill? Cyberpunk reality thriller featuring Neo.", "definition": "Iconic sci-fi action film where humanity lives in a simulated reality."},
    {"word": "OPPENHEIMER", "category": "Movies & TV", "difficulty": "hard", "hint": "Biographical epic detailing the creation of the atomic bomb.", "definition": "Christopher Nolan drama about the physicist behind the Manhattan Project."},
    {"word": "PARASITE", "category": "Movies & TV", "difficulty": "medium", "hint": "Dark social satire where a poor family infiltrates a wealthy household.", "definition": "Academy Award winning South Korean psychological thriller."},
    {"word": "TITANIC", "category": "Movies & TV", "difficulty": "easy", "hint": "Romance set against the ill-fated 1912 maiden voyage of a luxury liner.", "definition": "James Cameron maritime disaster drama starring Leo & Kate."},
    {"word": "AVATAR", "category": "Movies & TV", "difficulty": "easy", "hint": "Ex-Marine explores alien moon Pandora in an organic Na'vi body.", "definition": "Sci-fi epic featuring blue Na'vi inhabitants of Pandora."},
    {"word": "GODFATHER", "category": "Movies & TV", "difficulty": "hard", "hint": "Chronicle of the Corleone Italian-American crime dynasty.", "definition": "Cinematic masterpiece directed by Francis Ford Coppola."},

    # Science & Nature
    {"word": "PHOTOSYNTHESIS", "category": "Science & Nature", "difficulty": "hard", "hint": "Process by which green plants convert solar sunlight into chemical energy.", "definition": "Biological process generating oxygen and plant nutrients."},
    {"word": "SUPERNOVA", "category": "Science & Nature", "difficulty": "medium", "hint": "A powerful cataclysmic explosion marking the death of a star.", "definition": "Stellar explosion producing heavy interstellar elements."},
    {"word": "QUANTUM", "category": "Science & Nature", "difficulty": "hard", "hint": "Branch of physics studying subatomic particles and wave-particle duality.", "definition": "Physics operating at microscopic subatomic scales."},
    {"word": "ATMOSPHERE", "category": "Science & Nature", "difficulty": "medium", "hint": "Gaseous shield surrounding Earth protecting life from solar radiation.", "definition": "Layer of gases held by planetary gravity."},
    {"word": "GRAVITY", "category": "Science & Nature", "difficulty": "easy", "hint": "Universal force attracting massive physical bodies towards one another.", "definition": "Fundamental interaction warping spacetime."},
    {"word": "DNA", "category": "Science & Nature", "difficulty": "easy", "hint": "Double-helix molecular blueprint carrying genetic instructions.", "definition": "Deoxyribonucleic acid, building block of life."},
    {"word": "NEBULA", "category": "Science & Nature", "difficulty": "medium", "hint": "Glowing interstellar cloud of gas and dust where stars are born.", "definition": "Cosmic stellar nursery in outer space."},
    {"word": "VOLCANO", "category": "Science & Nature", "difficulty": "easy", "hint": "Rupture in Earth's crust allowing hot lava, ash, and gases to escape.", "definition": "Geological vent erupting magma."},

    # World History
    {"word": "RENAISSANCE", "category": "World History", "difficulty": "hard", "hint": "European cultural, artistic, and intellectual rebirth originating in Florence.", "definition": "Cultural movement spanning 14th to 17th centuries."},
    {"word": "PARTHENON", "category": "World History", "difficulty": "medium", "hint": "Classical Greek marble temple atop the Acropolis dedicated to Athena.", "definition": "Ancient temple dominating the skyline of Athens."},
    {"word": "COLOSSEUM", "category": "World History", "difficulty": "medium", "hint": "Flavian amphitheater in ancient Rome used for gladiatorial contests.", "definition": "Ancient Roman arena built for public spectacles."},
    {"word": "PHARAOH", "category": "World History", "difficulty": "medium", "hint": "Monarch of ancient Egyptian dynasties worshipped as a living deity.", "definition": "Supreme ruler of ancient Egyptian civilization."},
    {"word": "PYRAMID", "category": "World History", "difficulty": "easy", "hint": "Monumental triangular stone structure built as royal Egyptian tombs.", "definition": "Triangular ancient Egyptian architectural wonder."},
    {"word": "HIEROGLYPH", "category": "World History", "difficulty": "hard", "hint": "Pictorial writing system used by ancient Egyptian scribes.", "definition": "Ancient Egyptian formal script combining symbols."},

    # Animals
    {"word": "CHAMELEON", "category": "Animals", "difficulty": "medium", "hint": "Reptile known for rapid skin camouflage and 360-degree independent eyes.", "definition": "Lizard species capable of changing colors."},
    {"word": "CHEETAH", "category": "Animals", "difficulty": "easy", "hint": "The fastest terrestrial mammal on Earth reaching 70 mph.", "definition": "Spotted African big cat specialized for high-speed sprints."},
    {"word": "OCTOPUS", "category": "Animals", "difficulty": "medium", "hint": "Eight-armed ocean creature possessing 3 hearts and high intelligence.", "definition": "Soft-bodied marine mollusk."},
    {"word": "PLATYPUS", "category": "Animals", "difficulty": "hard", "hint": "Egg-laying mammal with a duck bill, webbed feet, and venomous spurs.", "definition": "Unique Australian semi-aquatic monotreme."},
    {"word": "KANGAROO", "category": "Animals", "difficulty": "easy", "hint": "Australian marsupial that hops on powerful hind legs with a front pouch.", "definition": "Large hopping marsupial native to Australia."},
    {"word": "FLAMINGO", "category": "Animals", "difficulty": "medium", "hint": "Wading bird famous for pink feathers derived from carotenoid shrimp diet.", "definition": "Long-legged pink wading bird."},
    {"word": "DOLPHIN", "category": "Animals", "difficulty": "easy", "hint": "Echolocating marine mammal known for acrobatics and social intelligence.", "definition": "Aquatic mammal related to whales."},

    # Food & Culinary
    {"word": "CAPPUCCINO", "category": "Food & Culinary", "difficulty": "medium", "hint": "Italian coffee drink prepared with equal parts espresso, milk, and foam.", "definition": "Classic frothed espresso beverage."},
    {"word": "GUACAMOLE", "category": "Food & Culinary", "difficulty": "medium", "hint": "Avocado-based Mexican dip mixed with lime, cilantro, and onions.", "definition": "Creamy Mexican avocado condiment."},
    {"word": "CROISSANT", "category": "Food & Culinary", "difficulty": "hard", "hint": "Flaky buttery French crescent-shaped laminated pastry.", "definition": "Classic French breakfast pastry."},
    {"word": "CHOCOLATE", "category": "Food & Culinary", "difficulty": "easy", "hint": "Sweet food created from roasted and ground cacao seeds.", "definition": "Cocoa-based sweet confection enjoyed worldwide."},
    {"word": "SPAGHETTI", "category": "Food & Culinary", "difficulty": "medium", "hint": "Long, thin cylindrical Italian pasta noodles.", "definition": "Popular Italian wheat pasta traditionally served with sauce."},
    {"word": "SUSHI", "category": "Food & Culinary", "difficulty": "easy", "hint": "Japanese dish of seasoned vinegared rice served with raw seafood.", "definition": "Traditional Japanese culinary art."},
    {"word": "TIRAMISU", "category": "Food & Culinary", "difficulty": "hard", "hint": "Italian coffee-flavoured dessert layered with ladyfingers and mascarpone.", "definition": "Classic espresso-infused Italian dessert."}
]

def seed_words():
    db = get_db()
    words_col = db.words
    
    # Check existing count
    existing_count = words_col.count_documents({}) if hasattr(words_col, 'count_documents') else 0
    print(f"[Seed] Existing words count in MongoDB: {existing_count}")
    
    # Upsert words based on word string
    inserted_or_updated = 0
    for word_item in WORDS_DATA:
        if hasattr(words_col, 'update_one'):
            words_col.update_one(
                {"word": word_item["word"]},
                {"$set": word_item},
                upsert=True
            )
            inserted_or_updated += 1
        elif hasattr(words_col, 'data'):
            existing = words_col.find_one({"word": word_item["word"]})
            if not existing:
                words_col.insert_one(word_item)
                inserted_or_updated += 1
        
    print(f"[Seed] Successfully seeded {inserted_or_updated} words with custom tips & definitions!")

if __name__ == "__main__":
    seed_words()
