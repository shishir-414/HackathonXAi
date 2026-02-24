"""
Practical Learning Service — Object feature identification.

Detects objects via COCO-SSD (client-side) and returns educational
features about the detected object using LLM (Pollinations.ai).
"""

import logging
import random
from typing import Dict, List, Optional

from app.services.llm_service import (
    generate_with_pollinations,
    generate_with_ollama,
    check_ollama_available,
    _clean_llm_output,
)

logger = logging.getLogger(__name__)

# ── Pre-built feature cards for common COCO-SSD objects ─────────

OBJECT_FEATURES: Dict[str, dict] = {
    "bottle": {
        "name": "Water Bottle",
        "category": "Everyday Object",
        "features": [
            {"title": "Material", "detail": "Usually made of PET plastic (Polyethylene Terephthalate) or glass. PET is recyclable and marked with ♻️ symbol #1."},
            {"title": "Capacity", "detail": "Standard bottles hold 500ml (16.9 oz). Your body needs about 2 liters (4 bottles) of water daily."},
            {"title": "Science", "detail": "Water (H₂O) is made of 2 hydrogen atoms and 1 oxygen atom. It's the only substance found naturally in all 3 states: solid, liquid, and gas."},
            {"title": "Fun Fact", "detail": "The water you drink today could be the same water dinosaurs drank! Water is recycled through the water cycle over millions of years."},
            {"title": "Physics", "detail": "Water has high surface tension — that's why you can slightly overfill a glass without it spilling. Molecules at the surface stick together."},
        ],
    },
    "cup": {
        "name": "Cup / Mug",
        "category": "Kitchen Item",
        "features": [
            {"title": "Material", "detail": "Ceramic cups are made from clay fired at 1000-1300°C in a kiln. The glazing makes them waterproof and shiny."},
            {"title": "Design", "detail": "The handle exists because ceramic is a poor heat conductor — it stays cool while the cup body holds hot liquid."},
            {"title": "Science", "detail": "Hot drinks cool down because of convection (hot liquid rises) and evaporation (molecules escape from the surface as steam)."},
            {"title": "Capacity", "detail": "A standard cup holds about 250ml (8 oz). A mug holds 350ml (12 oz). An espresso cup is only 60ml!"},
            {"title": "Fun Fact", "detail": "The world's oldest cup is over 7,000 years old, found in China. Humans have been drinking from cups since the Stone Age."},
        ],
    },
    "laptop": {
        "name": "Laptop Computer",
        "category": "Technology",
        "features": [
            {"title": "Processor", "detail": "The CPU (brain) performs billions of calculations per second. Modern chips have transistors just 3-5 nanometers wide — smaller than a virus!"},
            {"title": "Storage", "detail": "SSDs store data using electrical charges in tiny cells. A 512GB SSD can hold about 100,000 photos or 250 movies."},
            {"title": "Screen", "detail": "LCD/OLED screens use millions of tiny pixels. Each pixel has Red, Green, and Blue sub-pixels that mix to create any color."},
            {"title": "Battery", "detail": "Lithium-ion batteries store energy via chemical reactions. They contain lithium, cobalt, and graphite."},
            {"title": "Fun Fact", "detail": "Your laptop has more computing power than all of NASA had during the 1969 Moon landing combined!"},
        ],
    },
    "cell phone": {
        "name": "Smartphone",
        "category": "Technology",
        "features": [
            {"title": "Sensors", "detail": "Your phone has 10+ sensors: accelerometer, gyroscope, GPS, proximity, ambient light, barometer, magnetometer, and more."},
            {"title": "Camera", "detail": "Phone cameras use CMOS sensors with millions of tiny light-detecting pixels. Computational photography uses AI to enhance images."},
            {"title": "Connectivity", "detail": "Uses radio waves to communicate: 4G/5G for internet, Bluetooth for short range, WiFi for local networks, NFC for tap-to-pay."},
            {"title": "Screen", "detail": "OLED screens have pixels that emit their own light. Each pixel can turn completely off, creating true black and saving battery."},
            {"title": "Fun Fact", "detail": "The average smartphone has 100,000x more processing power than the computer that guided Apollo 11 to the Moon."},
        ],
    },
    "keyboard": {
        "name": "Keyboard",
        "category": "Input Device",
        "features": [
            {"title": "Layout", "detail": "QWERTY layout was designed in 1873 by Christopher Sholes to prevent typewriter key jams by separating common letter pairs."},
            {"title": "Mechanism", "detail": "Each key press completes an electrical circuit, sending a unique scan code to the computer. Mechanical keyboards use individual switches."},
            {"title": "Types", "detail": "Membrane keyboards use pressure pads, mechanical use individual switches, and laptop keyboards use scissor mechanisms."},
            {"title": "Fun Fact", "detail": "A keyboard can harbor 400x more bacteria than a toilet seat! The spacebar is the most-pressed key."},
        ],
    },
    "mouse": {
        "name": "Computer Mouse",
        "category": "Input Device",
        "features": [
            {"title": "Inventor", "detail": "Invented by Douglas Engelbart in 1964. It was made of wood and had only one button!"},
            {"title": "How It Works", "detail": "Optical mice use an LED and camera sensor to track movement 1000+ times per second by comparing tiny surface images."},
            {"title": "Laser vs Optical", "detail": "Laser mice work on more surfaces (even glass) because laser light penetrates surfaces deeper than LED light."},
            {"title": "Fun Fact", "detail": "The average person moves their mouse about 1.5 km (0.93 miles) per day during computer use!"},
        ],
    },
    "book": {
        "name": "Book",
        "category": "Knowledge & Learning",
        "features": [
            {"title": "History", "detail": "The first printed book was the Gutenberg Bible (1455). Before printing, books were copied by hand and could take years to make."},
            {"title": "Material", "detail": "Paper is made from wood pulp — cellulose fibers from trees. One tree makes about 100 books."},
            {"title": "Data", "detail": "A typical 300-page book contains about 500KB of text. Your phone can store the equivalent of millions of books!"},
            {"title": "Science", "detail": "Reading activates multiple brain areas simultaneously: vision, language processing, memory, and imagination."},
            {"title": "Fun Fact", "detail": "The world's smallest book is 0.07mm × 0.10mm — you need an electron microscope to read it!"},
        ],
    },
    "chair": {
        "name": "Chair",
        "category": "Furniture",
        "features": [
            {"title": "Ergonomics", "detail": "A good chair supports the natural S-curve of your spine. The ideal seat height puts your feet flat on the floor with knees at 90°."},
            {"title": "Physics", "detail": "A chair distributes your weight across its legs. A 4-legged chair on a flat surface is actually unstable — 3 legs is mathematically always stable!"},
            {"title": "Material", "detail": "Chairs can be made from wood, metal, plastic, or composite materials. Office chairs use pneumatic cylinders (compressed gas) to adjust height."},
            {"title": "Fun Fact", "detail": "The average person spends about 9.3 hours per day sitting — more time than sleeping!"},
        ],
    },
    "tv": {
        "name": "Television / Monitor",
        "category": "Display Technology",
        "features": [
            {"title": "Pixels", "detail": "A 4K TV has 8.3 million pixels (3840×2160). Each pixel has RGB sub-pixels, so there are actually ~25 million light sources!"},
            {"title": "Technology", "detail": "OLED TVs have pixels that emit their own light. LED TVs use a backlight behind an LCD panel that filters colors."},
            {"title": "Refresh Rate", "detail": "60Hz means the image updates 60 times per second. 120Hz is smoother, especially for fast motion and gaming."},
            {"title": "History", "detail": "The first TV broadcast was in 1928 with only 48 lines of resolution. Today's 8K TVs have 7680 lines!"},
            {"title": "Fun Fact", "detail": "If you watched TV for 8 hours a day, it would take 56 years to watch every show and movie ever made."},
        ],
    },
    "remote": {
        "name": "Remote Control",
        "category": "Electronics",
        "features": [
            {"title": "How It Works", "detail": "TV remotes use infrared (IR) LED light — invisible to human eyes but your phone camera can see it! Point and press to check."},
            {"title": "Encoding", "detail": "Each button sends a unique pattern of IR light pulses. The TV decodes these patterns to know which button was pressed."},
            {"title": "Battery", "detail": "Uses AAA/AA alkaline batteries that convert chemical energy (zinc + manganese dioxide) to electrical energy."},
            {"title": "Fun Fact", "detail": "The TV remote was invented in 1955 and was called 'Zenith Space Command'. It used ultrasonic sound instead of IR light!"},
        ],
    },
    "banana": {
        "name": "Banana",
        "category": "Fruit / Food",
        "features": [
            {"title": "Nutrition", "detail": "Rich in potassium (422mg), vitamin B6, and fiber. Potassium helps your muscles contract and nerves send signals."},
            {"title": "Biology", "detail": "Bananas are technically berries! They grow in clusters called 'hands' on plants that are actually giant herbs, not trees."},
            {"title": "Chemistry", "detail": "Bananas are slightly radioactive due to potassium-40 isotope. You'd need to eat 10 million bananas at once for radiation to be harmful!"},
            {"title": "Ripening", "detail": "Bananas produce ethylene gas which triggers ripening. That's why putting them near other fruits makes everything ripen faster."},
            {"title": "Fun Fact", "detail": "Banana DNA is 60% identical to human DNA! We share more genes with bananas than you'd expect."},
        ],
    },
    "apple": {
        "name": "Apple",
        "category": "Fruit / Food",
        "features": [
            {"title": "Nutrition", "detail": "One apple has ~95 calories, 4g fiber, and 14% daily vitamin C. The skin contains most of the fiber and antioxidants."},
            {"title": "Varieties", "detail": "There are over 7,500 varieties of apples worldwide. It would take 20 years to try a new variety every day!"},
            {"title": "Science", "detail": "Apples float because they're 25% air! The air pockets between cells make them less dense than water."},
            {"title": "History", "detail": "Newton's observation of a falling apple inspired his theory of gravity — the same force that keeps the Moon orbiting Earth."},
            {"title": "Fun Fact", "detail": "Apple seeds contain amygdalin which can release cyanide, but you'd need to eat 200+ seeds at once for it to be dangerous."},
        ],
    },
    "potted plant": {
        "name": "Potted Plant",
        "category": "Living Organism",
        "features": [
            {"title": "Photosynthesis", "detail": "Uses sunlight + CO₂ + water to make glucose (food) and release oxygen. One houseplant produces enough O₂ for about 1/10 of a person."},
            {"title": "Roots", "detail": "Roots absorb water and minerals via osmosis. Root hairs increase surface area by 100x for better absorption."},
            {"title": "Air Quality", "detail": "Plants remove toxins like formaldehyde and benzene from indoor air. NASA found they can remove up to 87% of air toxins in 24 hours."},
            {"title": "Communication", "detail": "Plants communicate! When attacked by insects, they release chemicals that warn nearby plants to activate their defenses."},
            {"title": "Fun Fact", "detail": "Plants can 'hear' — studies show they grow faster when exposed to certain sound frequencies around 1000-5000 Hz."},
        ],
    },
    "scissors": {
        "name": "Scissors",
        "category": "Tool",
        "features": [
            {"title": "Physics", "detail": "Scissors are a compound lever — two Class 1 levers joined at a fulcrum (the pivot screw). They multiply your hand's force."},
            {"title": "Material", "detail": "Blades are made of stainless steel (iron + chromium + carbon). Chromium forms an invisible oxide layer that prevents rust."},
            {"title": "History", "detail": "The earliest scissors date back to 1500 BC in ancient Egypt. Leonardo da Vinci is often (incorrectly) credited with inventing them."},
            {"title": "Fun Fact", "detail": "Left-handed scissors exist because the blade overlap is reversed — using right-handed scissors lefty actually pushes the blades apart!"},
        ],
    },
    "clock": {
        "name": "Clock",
        "category": "Timekeeping",
        "features": [
            {"title": "Mechanism", "detail": "Quartz clocks use a tiny quartz crystal that vibrates exactly 32,768 times per second when electricity is applied. This precision keeps time."},
            {"title": "History", "detail": "Mechanical clocks appeared in 13th century Europe. Before clocks, people used sundials, water clocks, and candle clocks."},
            {"title": "Accuracy", "detail": "Atomic clocks are accurate to 1 second in 300 million years! They use cesium atom vibrations (9.2 billion times per second)."},
            {"title": "Fun Fact", "detail": "Time moves slightly faster on top of a mountain than at sea level — Einstein's relativity! GPS satellites must account for this."},
        ],
    },
    "person": {
        "name": "Human Body",
        "category": "Biology",
        "features": [
            {"title": "Cells", "detail": "Your body has ~37 trillion cells. About 3.8 million cells die every second, but new ones are constantly being made."},
            {"title": "Brain", "detail": "The brain uses 20% of your body's energy despite being only 2% of body weight. It has ~86 billion neurons."},
            {"title": "Skeleton", "detail": "You have 206 bones. Babies are born with ~270 bones — some fuse together as you grow. The smallest bone (stapes) is 3mm."},
            {"title": "Water", "detail": "Your body is about 60% water. The brain is 73% water, lungs are 83%, and even bones are 31% water."},
            {"title": "Fun Fact", "detail": "If you stretched out all your DNA molecules end to end, they would reach from Earth to Pluto and back — about 70 billion miles!"},
        ],
    },
    "cat": {
        "name": "Cat",
        "category": "Animal",
        "features": [
            {"title": "Senses", "detail": "Cats can see 6x better than humans in the dark thanks to a reflective layer (tapetum lucidum) behind their retinas."},
            {"title": "Agility", "detail": "Cats have 230 bones (vs 206 in humans), no collarbone, and a flexible spine letting them squeeze through any gap their head fits through."},
            {"title": "Purring", "detail": "Cats purr at 25-150 Hz — frequencies that promote bone healing and tissue repair. Purring may be a self-healing mechanism!"},
            {"title": "Fun Fact", "detail": "Cats spend 70% of their lives sleeping (~16 hours/day). They can rotate their ears 180° independently."},
        ],
    },
    "dog": {
        "name": "Dog",
        "category": "Animal",
        "features": [
            {"title": "Smell", "detail": "Dogs have 300 million scent receptors (humans have 6 million). The smell-processing brain area is 40x larger than ours."},
            {"title": "Hearing", "detail": "Dogs hear frequencies up to 65,000 Hz (humans max at 20,000 Hz). They can hear sounds 4x farther away than humans."},
            {"title": "Evolution", "detail": "Dogs were domesticated from wolves 15,000-40,000 years ago, making them the first domesticated animal."},
            {"title": "Fun Fact", "detail": "Dogs' noses are wet to help absorb scent chemicals. Each dog's nose print is unique, like a human fingerprint!"},
        ],
    },
    "backpack": {
        "name": "Backpack",
        "category": "Everyday Object",
        "features": [
            {"title": "Ergonomics", "detail": "A loaded backpack should weigh no more than 10-15% of your body weight. Both straps should be used to distribute weight evenly."},
            {"title": "Material", "detail": "Most backpacks use nylon (strong, lightweight, water-resistant) or polyester. Military backpacks use Cordura — 10x more abrasion-resistant."},
            {"title": "Physics", "detail": "Wearing a backpack high on your back keeps the center of gravity close to your spine, reducing strain by up to 50%."},
            {"title": "Fun Fact", "detail": "The modern backpack with a zipper was invented in 1938. Before that, students carried books with leather straps!"},
        ],
    },
    "umbrella": {
        "name": "Umbrella",
        "category": "Everyday Object",
        "features": [
            {"title": "Material", "detail": "Canopy is usually polyester or nylon with waterproof coating. The frame uses steel or fiberglass ribs for flexibility and strength."},
            {"title": "History", "detail": "Umbrellas were invented over 3,500 years ago in ancient Egypt — originally for sun protection, not rain!"},
            {"title": "Physics", "detail": "Waterproofing works because the tight fabric weave and coating create surface tension that prevents water from passing through."},
            {"title": "Fun Fact", "detail": "In the UK they lose about 80,000 umbrellas on public transport every year!"},
        ],
    },
    "microwave": {
        "name": "Microwave Oven",
        "category": "Kitchen Appliance",
        "features": [
            {"title": "How It Works", "detail": "A magnetron generates microwaves (2.45 GHz) that vibrate water molecules 2.45 billion times/second, creating friction heat."},
            {"title": "Discovery", "detail": "Invented by accident in 1945! Engineer Percy Spencer noticed a chocolate bar in his pocket melted near a radar magnetron."},
            {"title": "Safety", "detail": "The metal mesh in the door has holes smaller than the microwave wavelength (12.2cm), so waves can't escape but light can pass through."},
            {"title": "Fun Fact", "detail": "Microwaves don't heat food from the inside out — they penetrate about 1-1.5cm deep. The rest heats by conduction."},
        ],
    },
    "refrigerator": {
        "name": "Refrigerator",
        "category": "Kitchen Appliance",
        "features": [
            {"title": "How It Works", "detail": "Uses a refrigerant gas that absorbs heat when it evaporates inside and releases heat when compressed outside. It moves heat, not cold!"},
            {"title": "Temperature", "detail": "Ideal fridge temperature is 3-4°C (37-39°F). Freezer should be -18°C (0°F). Bacteria growth slows 2x for every 5°C decrease."},
            {"title": "Energy", "detail": "A fridge runs 24/7 and uses about 150-400 kWh per year — roughly 13% of a household's electricity bill."},
            {"title": "Fun Fact", "detail": "Before refrigerators, people stored food in icehouses filled with winter-harvested ice, or underground root cellars."},
        ],
    },
    "toothbrush": {
        "name": "Toothbrush",
        "category": "Personal Care",
        "features": [
            {"title": "Bristles", "detail": "Modern bristles are nylon (invented 1938). Before that, people used pig hair, horse hair, or even bird feathers!"},
            {"title": "Teeth Science", "detail": "Tooth enamel is the hardest substance in the human body — harder than steel! But it can't regenerate once damaged."},
            {"title": "Hygiene", "detail": "Your mouth has 700+ species of bacteria. Brushing removes the sticky biofilm (plaque) that bacteria form on teeth."},
            {"title": "Fun Fact", "detail": "The first toothbrush was invented in China in 1498 using bamboo and boar bristles! Ancient Egyptians used chew sticks 5000 years ago."},
        ],
    },
}

# ── Quiz questions per object ──────────────────────────────────

OBJECT_QUIZZES: Dict[str, List[dict]] = {
    "bottle": [
        {"question": "What is the chemical formula of water?", "options": ["CO₂", "H₂O", "O₂", "NaCl"], "correct": 1, "explanation": {"correct": "Correct! Water is H₂O — two hydrogen atoms bonded to one oxygen atom.", "wrong": "It's H₂O — two hydrogen (H) atoms and one oxygen (O) atom bonded together."}},
        {"question": "At what temperature does water boil?", "options": ["50°C", "100°C", "150°C", "200°C"], "correct": 1, "explanation": {"correct": "Correct! Water boils at 100°C (212°F) at sea level.", "wrong": "Water boils at 100°C (212°F) at standard atmospheric pressure."}},
    ],
    "laptop": [
        {"question": "What does CPU stand for?", "options": ["Central Processing Unit", "Computer Power Unit", "Central Power Utility", "Core Processing Unit"], "correct": 0, "explanation": {"correct": "Correct! CPU = Central Processing Unit — the 'brain' of your computer.", "wrong": "CPU stands for Central Processing Unit — it executes instructions and processes data."}},
        {"question": "Which component stores data permanently?", "options": ["RAM", "CPU", "SSD/Hard Drive", "GPU"], "correct": 2, "explanation": {"correct": "Correct! SSDs and hard drives retain data even when powered off (non-volatile storage).", "wrong": "SSD/Hard Drive stores data permanently. RAM loses data when power is off."}},
    ],
    "cell phone": [
        {"question": "What type of waves does WiFi use?", "options": ["Sound waves", "Radio waves", "X-rays", "Light waves"], "correct": 1, "explanation": {"correct": "Correct! WiFi uses radio waves at 2.4 GHz or 5 GHz frequency.", "wrong": "WiFi uses radio waves — the same type of electromagnetic radiation as FM radio, just at different frequencies."}},
    ],
    "banana": [
        {"question": "Which mineral are bananas famously rich in?", "options": ["Iron", "Calcium", "Potassium", "Zinc"], "correct": 2, "explanation": {"correct": "Correct! Bananas are packed with potassium (~422mg each), essential for muscle and nerve function.", "wrong": "Bananas are rich in potassium — about 422mg per banana. It helps muscles contract and nerves send signals."}},
    ],
    "apple": [
        {"question": "Why do apples float in water?", "options": ["They're hollow", "They're 25% air", "They have wax coating", "They repel water"], "correct": 1, "explanation": {"correct": "Correct! Apples are about 25% air, making them less dense than water.", "wrong": "Apples are approximately 25% air due to tiny pockets between cells, which makes them less dense than water."}},
    ],
    "potted plant": [
        {"question": "What gas do plants absorb during photosynthesis?", "options": ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], "correct": 2, "explanation": {"correct": "Correct! Plants absorb CO₂ and use it with sunlight and water to make glucose.", "wrong": "Plants absorb Carbon Dioxide (CO₂). They use it + sunlight + water to make glucose and release oxygen."}},
    ],
    "person": [
        {"question": "How many bones does an adult human have?", "options": ["106", "206", "306", "406"], "correct": 1, "explanation": {"correct": "Correct! Adults have 206 bones. Babies have ~270 that fuse together.", "wrong": "Adults have 206 bones. Babies are born with about 270 bones, many of which fuse together during growth."}},
    ],
    "scissors": [
        {"question": "What type of simple machine are scissors?", "options": ["Pulley", "Wedge", "Lever", "Wheel"], "correct": 2, "explanation": {"correct": "Correct! Scissors are a compound lever — two Class 1 levers joined at a fulcrum (the pivot).", "wrong": "Scissors are a type of lever (specifically two Class 1 levers joined at a fulcrum/pivot point)."}},
    ],
}


# ── Service Functions ──────────────────────────────────────────


def get_object_features(object_name: str) -> dict:
    """Return pre-built educational features for a detected object."""
    obj_lower = object_name.lower().strip()

    if obj_lower in OBJECT_FEATURES:
        data = OBJECT_FEATURES[obj_lower]
        return {
            "found": True,
            "name": data["name"],
            "category": data["category"],
            "features": data["features"],
        }

    # Check partial match
    for key, data in OBJECT_FEATURES.items():
        if key in obj_lower or obj_lower in key:
            return {
                "found": True,
                "name": data["name"],
                "category": data["category"],
                "features": data["features"],
            }

    return {"found": False, "name": object_name, "category": "Object", "features": []}


async def generate_object_features_llm(object_name: str) -> list:
    """Generate educational features for an unknown object via LLM."""
    system_prompt = (
        "You are an educational assistant. A student has shown an object to their camera. "
        "Generate exactly 4 educational features about this object. "
        "Each feature should have a short title (1-2 words) and a detailed explanation (1-2 sentences, max 30 words). "
        "Cover: what it's made of, how it works, a science fact, and a fun fact. "
        "Format each feature on a new line as: Title: Detail"
    )
    prompt = f"Generate 4 educational features about: {object_name}"

    result = None
    if await check_ollama_available():
        result = await generate_with_ollama(prompt, system_prompt)

    if not result or len(result) < 30:
        result = await generate_with_pollinations(prompt, system_prompt)

    if result and len(result) > 30:
        features = []
        for line in result.strip().split("\n"):
            line = line.strip().lstrip("0123456789.-) ")
            if ":" in line:
                parts = line.split(":", 1)
                title = parts[0].strip().strip("*#")
                detail = parts[1].strip()
                if title and detail:
                    features.append({"title": title, "detail": detail})
        if features:
            return features[:5]

    return [
        {"title": "Identified", "detail": f"This is a {object_name}. Point your camera at common objects to learn more!"},
        {"title": "Explore", "detail": "Try showing bottles, phones, books, fruits, or plants for detailed educational content."},
    ]


def get_object_quiz(object_name: str) -> Optional[dict]:
    """Get a quiz question about the detected object."""
    obj_lower = object_name.lower().strip()

    if obj_lower in OBJECT_QUIZZES:
        quiz = random.choice(OBJECT_QUIZZES[obj_lower])
        return {
            "question": quiz["question"],
            "options": quiz["options"],
            "correct_index": quiz["correct"],
            "explanations": quiz["explanation"],
        }

    # Partial match
    for key, quizzes in OBJECT_QUIZZES.items():
        if key in obj_lower or obj_lower in key:
            quiz = random.choice(quizzes)
            return {
                "question": quiz["question"],
                "options": quiz["options"],
                "correct_index": quiz["correct"],
                "explanations": quiz["explanation"],
            }

    return None


# Keep backward compatibility
def get_topic_objects(topic: str) -> dict:
    return {
        "topic": topic,
        "detectable_objects": list(OBJECT_FEATURES.keys()),
        "object_details": {k: {"label": v["name"], "fact": v["features"][0]["detail"] if v["features"] else ""} for k, v in OBJECT_FEATURES.items()},
        "fallback_message": "Show any object to your camera!",
    }

async def generate_object_explanation(topic: str, detected_object: str, object_label: str = "") -> str:
    data = get_object_features(detected_object)
    if data["found"] and data["features"]:
        return data["features"][0]["detail"]
    features = await generate_object_features_llm(detected_object)
    return features[0]["detail"] if features else f"You found a {detected_object}!"

def get_quiz_for_topic(topic: str, detected_object: str = "") -> Optional[dict]:
    return get_object_quiz(detected_object or topic)
