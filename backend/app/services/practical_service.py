"""
Practical Learning Service — Object feature identification.

Uses MobileNet (1000+ ImageNet classes) for accurate identification
and provides educational features about detected objects.
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

# ── Pre-built feature cards (covers MobileNet ImageNet class names) ──────

OBJECT_FEATURES: Dict[str, dict] = {
    # ── Technology ─────────────────────────────────────────
    "laptop": {
        "name": "Laptop Computer",
        "category": "Technology",
        "features": [
            {"title": "Processor", "detail": "The CPU performs billions of calculations per second. Modern chips have transistors just 3-5 nanometers wide — smaller than a virus!"},
            {"title": "Storage", "detail": "SSDs store data using electrical charges in tiny cells. A 512GB SSD can hold about 100,000 photos or 250 movies."},
            {"title": "Screen", "detail": "LCD/OLED screens use millions of tiny pixels. Each pixel has Red, Green, and Blue sub-pixels that mix to create any color."},
            {"title": "Battery", "detail": "Lithium-ion batteries store energy via chemical reactions. They contain lithium, cobalt, and graphite."},
            {"title": "Fun Fact", "detail": "Your laptop has more computing power than all of NASA had during the 1969 Moon landing combined!"},
        ],
    },
    "notebook": {
        "name": "Laptop / Notebook",
        "category": "Technology",
        "features": [
            {"title": "Processor", "detail": "Modern laptop CPUs have billions of transistors on a chip the size of your fingernail. They process data at GHz speeds."},
            {"title": "Memory", "detail": "RAM (Random Access Memory) temporarily stores data being used. 8-16GB is common — it forgets everything when power is off."},
            {"title": "Connectivity", "detail": "WiFi uses radio waves at 2.4GHz or 5GHz. Bluetooth operates at 2.4GHz for short-range device communication."},
            {"title": "Fun Fact", "detail": "The first laptop (Osborne 1, 1981) weighed 10.7 kg and had a 5-inch screen. Today's laptops are 100x more powerful and 10x lighter!"},
        ],
    },
    "cell phone": {
        "name": "Smartphone",
        "category": "Technology",
        "features": [
            {"title": "Sensors", "detail": "Your phone has 10+ sensors: accelerometer, gyroscope, GPS, proximity, ambient light, barometer, magnetometer, and more."},
            {"title": "Camera", "detail": "Phone cameras use CMOS sensors with millions of tiny light-detecting pixels. Computational photography uses AI to enhance images."},
            {"title": "Connectivity", "detail": "Uses radio waves: 4G/5G for internet, Bluetooth for short range, WiFi for local networks, NFC for tap-to-pay."},
            {"title": "Screen", "detail": "OLED screens have pixels that emit their own light. Each pixel can turn completely off, creating true black and saving battery."},
            {"title": "Fun Fact", "detail": "The average smartphone has 100,000x more processing power than the computer that guided Apollo 11 to the Moon."},
        ],
    },
    "cellular telephone": {
        "name": "Mobile Phone",
        "category": "Technology",
        "features": [
            {"title": "Sensors", "detail": "Phones contain accelerometers, gyroscopes, GPS, proximity sensors, and more — over 10 different sensors!"},
            {"title": "Camera", "detail": "Modern phone cameras use CMOS sensors with millions of light-detecting pixels and AI computational photography."},
            {"title": "Radio", "detail": "Phones communicate via radio waves: cellular (4G/5G), WiFi, Bluetooth, and NFC for contactless payments."},
            {"title": "Fun Fact", "detail": "Your phone is millions of times more powerful than the computers used for the Apollo 11 moon landing!"},
        ],
    },
    "monitor": {
        "name": "Computer Monitor",
        "category": "Display Technology",
        "features": [
            {"title": "Pixels", "detail": "A 4K monitor has 8.3 million pixels (3840x2160). Each pixel has RGB sub-pixels — about 25 million light sources total!"},
            {"title": "Panel Types", "detail": "IPS panels offer wide viewing angles, VA panels have deep blacks, and TN panels have fastest response times for gaming."},
            {"title": "Refresh Rate", "detail": "60Hz refreshes 60 times/second. 144Hz and 240Hz are smoother for fast motion. Your eye can perceive differences up to ~240Hz."},
            {"title": "Fun Fact", "detail": "The first computer monitors were oscilloscopes in the 1950s displaying simple dots and lines — no color, no graphics!"},
        ],
    },
    "screen": {
        "name": "Display Screen",
        "category": "Display Technology",
        "features": [
            {"title": "Technology", "detail": "LCD screens use liquid crystals that twist to block or pass light. OLED pixels emit their own light — no backlight needed."},
            {"title": "Resolution", "detail": "HD = 1920x1080 (2M pixels), 4K = 3840x2160 (8.3M pixels), 8K = 7680x4320 (33.2M pixels)."},
            {"title": "Blue Light", "detail": "Screens emit blue light (400-490nm) that can affect sleep by suppressing melatonin. Night mode shifts colors warmer."},
            {"title": "Fun Fact", "detail": "If you could see individual pixels on a 4K screen, each one would be about 0.07mm — thinner than a human hair!"},
        ],
    },
    "desktop computer": {
        "name": "Desktop Computer",
        "category": "Technology",
        "features": [
            {"title": "CPU", "detail": "The processor is the brain — modern ones have billions of transistors and can execute billions of instructions per second."},
            {"title": "GPU", "detail": "Graphics cards render images using thousands of small cores in parallel. A modern GPU can have over 10,000 processing cores!"},
            {"title": "Cooling", "detail": "CPUs generate 65-125W of heat. Fans, heatsinks, and liquid cooling prevent overheating. Without cooling, chips would melt in seconds."},
            {"title": "Fun Fact", "detail": "The first general-purpose computer (ENIAC, 1945) weighed 30 tons and filled an entire room. Your phone is millions of times faster."},
        ],
    },
    "keyboard": {
        "name": "Keyboard",
        "category": "Input Device",
        "features": [
            {"title": "Layout", "detail": "QWERTY layout was designed in 1873 by Christopher Sholes to prevent typewriter key jams by separating common letter pairs."},
            {"title": "Mechanism", "detail": "Each key press completes an electrical circuit, sending a unique scan code to the computer. Mechanical keyboards use individual switches."},
            {"title": "Types", "detail": "Membrane keyboards use pressure pads, mechanical use switches, laptop keyboards use scissor mechanisms for thin profiles."},
            {"title": "Fun Fact", "detail": "A keyboard can harbor 400x more bacteria than a toilet seat! The spacebar is the most-pressed key."},
        ],
    },
    "space bar": {
        "name": "Keyboard / Space Bar",
        "category": "Input Device",
        "features": [
            {"title": "Layout", "detail": "QWERTY layout was designed in 1873 to prevent typewriter key jams by separating commonly used letter pairs."},
            {"title": "The Space Bar", "detail": "It's the largest key and the most frequently pressed. Typists hit it about 18% of all keystrokes — once every 5-6 characters."},
            {"title": "Mechanism", "detail": "Each key press completes a circuit sending a scan code. Mechanical keyboards use spring-loaded switches for tactile feedback."},
            {"title": "Fun Fact", "detail": "Keyboards can harbor 400x more bacteria than a toilet seat! The average typist's fingers travel about 20 km per day."},
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
    "iPod": {
        "name": "Portable Media Player",
        "category": "Technology",
        "features": [
            {"title": "Storage", "detail": "Early iPods used tiny 1.8-inch hard drives. Later models used flash memory — no moving parts, more durable, less power."},
            {"title": "Audio", "detail": "Digital audio files (MP3/AAC) compress sound by removing frequencies humans can't easily hear, reducing file size by 90%."},
            {"title": "History", "detail": "The iPod (2001) revolutionized music. Before digital players, people used Walkmans with cassette tapes or portable CD players."},
            {"title": "Fun Fact", "detail": "The first iPod could hold 1,000 songs. Today a phone can hold 100,000+ songs — and do a million other things!"},
        ],
    },
    # ── Ceiling Fan & Fans ─────────────────────────────────
    "ceiling fan": {
        "name": "Ceiling Fan",
        "category": "Home Appliance",
        "features": [
            {"title": "How It Works", "detail": "Blades are angled (pitched) to push air downward. The motor spins at 50-350 RPM. More blade pitch = more air movement."},
            {"title": "Physics", "detail": "Fans don't actually cool air — they create a wind-chill effect that helps evaporate sweat from your skin, making you feel cooler."},
            {"title": "Energy", "detail": "A ceiling fan uses only 15-75 watts — about 50x less than an air conditioner! Running one can lower AC costs by 30-40%."},
            {"title": "Design", "detail": "Most fans have 3-5 blades. Fewer blades = less drag = higher speed. More blades = quieter operation but more motor strain."},
            {"title": "Fun Fact", "detail": "In winter, reverse the fan direction (clockwise) to push warm air down from the ceiling and distribute heat evenly."},
        ],
    },
    "electric fan": {
        "name": "Electric Fan",
        "category": "Home Appliance",
        "features": [
            {"title": "Motor", "detail": "Uses an electric motor that converts electrical energy into rotational energy. AC motors use alternating current to spin the rotor."},
            {"title": "Wind Chill", "detail": "Fans don't lower room temperature — they create airflow that speeds up sweat evaporation, making you feel 3-4°C cooler."},
            {"title": "Blade Design", "detail": "Blades are angled (pitched) to push air. Greater pitch = more air but more noise. Most fans are optimized at 12-15° pitch."},
            {"title": "Energy", "detail": "A typical fan uses 50-100 watts — about 30x less energy than an air conditioner running at 1500 watts."},
            {"title": "Fun Fact", "detail": "The first electric fan was invented in 1882 by Schuyler Wheeler. It had just two blades and no protective cage!"},
        ],
    },
    # ── Lighting ───────────────────────────────────────────
    "table lamp": {
        "name": "Table Lamp",
        "category": "Lighting",
        "features": [
            {"title": "Bulb Types", "detail": "LED bulbs use 75% less energy than incandescent. A 10W LED = 60W incandescent brightness. LEDs last 25,000+ hours."},
            {"title": "Light Science", "detail": "Light is electromagnetic radiation visible to humans (380-700nm wavelength). Different wavelengths = different colors."},
            {"title": "Color Temp", "detail": "Measured in Kelvin: 2700K = warm/yellow (relaxing), 4000K = neutral white, 6500K = daylight/blue (alerting)."},
            {"title": "Fun Fact", "detail": "Before electric lamps, people used candles, oil lamps, and gas lights. The average candle produces about 13 lumens — an LED bulb produces 800!"},
        ],
    },
    "desk lamp": {
        "name": "Desk Lamp",
        "category": "Lighting",
        "features": [
            {"title": "LED Technology", "detail": "LEDs produce light by electroluminescence — electrons release photons when passing through a semiconductor. 90% efficient vs 10% for incandescent."},
            {"title": "Lumens", "detail": "Brightness is measured in lumens, not watts. For reading, 450-800 lumens is ideal. A 60W incandescent = ~800 lumens."},
            {"title": "Eye Health", "detail": "Good desk lighting reduces eye strain. The 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds."},
            {"title": "Fun Fact", "detail": "The Anglepoise lamp (1932) uses springs to mimic human arm joints, allowing it to stay in any position — inspired by spring mechanics!"},
        ],
    },
    "lampshade": {
        "name": "Lamp / Lampshade",
        "category": "Lighting",
        "features": [
            {"title": "Purpose", "detail": "Lampshades diffuse and redirect light, reducing glare. They soften harsh direct light into ambient, comfortable illumination."},
            {"title": "Materials", "detail": "Made from fabric, paper, glass, or metal. Each material diffuses light differently — fabric creates warm, soft light."},
            {"title": "Light Science", "detail": "Light intensity decreases with the square of distance (inverse-square law). Doubling distance = 1/4 the brightness."},
            {"title": "Fun Fact", "detail": "The first lampshades were made in the 18th century from parchment paper to shield eyes from the flame of oil lamps."},
        ],
    },
    # ── Containers & Bottles ───────────────────────────────
    "bottle": {
        "name": "Water Bottle",
        "category": "Everyday Object",
        "features": [
            {"title": "Material", "detail": "Usually PET plastic (Polyethylene Terephthalate) or glass. PET is recyclable and marked with recycle symbol #1."},
            {"title": "Capacity", "detail": "Standard bottles hold 500ml (16.9 oz). Your body needs about 2 liters (4 bottles) of water daily."},
            {"title": "Science", "detail": "Water (H₂O) is the only substance found naturally in all 3 states: solid (ice), liquid (water), and gas (steam)."},
            {"title": "Physics", "detail": "Water has high surface tension — molecules at the surface stick together, letting you slightly overfill a glass."},
            {"title": "Fun Fact", "detail": "The water you drink today could be the same water dinosaurs drank! Water is recycled through the water cycle over millions of years."},
        ],
    },
    "water bottle": {
        "name": "Water Bottle",
        "category": "Everyday Object",
        "features": [
            {"title": "Material", "detail": "Usually PET plastic (Polyethylene Terephthalate) or glass. PET is recyclable and marked with recycle symbol #1."},
            {"title": "Hydration", "detail": "Your body needs about 2 liters of water daily. Water makes up 60% of your body weight and is essential for every cell."},
            {"title": "Science", "detail": "Water (H₂O) has unique properties: high specific heat capacity, universal solvent, and exists in all 3 states naturally on Earth."},
            {"title": "Fun Fact", "detail": "Only 3% of Earth's water is fresh water, and only 1% is easily accessible. The rest is in glaciers or deep underground."},
        ],
    },
    "cup": {
        "name": "Cup / Mug",
        "category": "Kitchen Item",
        "features": [
            {"title": "Material", "detail": "Ceramic cups are made from clay fired at 1000-1300°C in a kiln. The glazing makes them waterproof and shiny."},
            {"title": "Design", "detail": "The handle stays cool because ceramic is a poor heat conductor — insulating your hand from the hot liquid."},
            {"title": "Science", "detail": "Hot drinks cool via convection (hot liquid rises) and evaporation (molecules escape the surface as steam)."},
            {"title": "Capacity", "detail": "A standard cup holds ~250ml (8 oz). A mug = ~350ml (12 oz). An espresso cup is only 60ml!"},
            {"title": "Fun Fact", "detail": "The world's oldest cup is over 7,000 years old, found in China. Humans have been drinking from cups since the Stone Age."},
        ],
    },
    "coffee mug": {
        "name": "Coffee Mug",
        "category": "Kitchen Item",
        "features": [
            {"title": "Material", "detail": "Ceramic mugs are clay fired at 1000-1300°C. Porcelain mugs are fired even hotter (1200-1400°C) making them stronger."},
            {"title": "Heat Transfer", "detail": "Ceramic is a poor heat conductor (insulator), so the handle stays cool while the mug body holds hot liquid."},
            {"title": "Coffee Science", "detail": "Coffee contains caffeine which blocks adenosine receptors in your brain, preventing drowsiness signals. Effect peaks at 30-60 minutes."},
            {"title": "Fun Fact", "detail": "Finns drink the most coffee per capita — about 12 kg per person per year! That's roughly 4 cups every day."},
        ],
    },
    # ── Furniture ──────────────────────────────────────────
    "chair": {
        "name": "Chair",
        "category": "Furniture",
        "features": [
            {"title": "Ergonomics", "detail": "A good chair supports the natural S-curve of your spine. Ideal seat height puts feet flat on the floor with knees at 90°."},
            {"title": "Physics", "detail": "A chair distributes weight across its legs. A 4-legged chair on a flat surface is actually unstable — 3 legs is mathematically always stable!"},
            {"title": "Material", "detail": "Can be wood, metal, plastic, or composite. Office chairs use pneumatic cylinders (compressed gas) to adjust height."},
            {"title": "Fun Fact", "detail": "The average person spends about 9.3 hours per day sitting — more time than sleeping!"},
        ],
    },
    "folding chair": {
        "name": "Folding Chair",
        "category": "Furniture",
        "features": [
            {"title": "Design", "detail": "Uses pivot joints that allow the frame to collapse flat. The X-frame design dates back to ancient Egypt and Rome."},
            {"title": "Physics", "detail": "When unfolded, forces are distributed through the X-frame to the ground. The design converts vertical load into outward push at the base."},
            {"title": "Materials", "detail": "Typically steel or aluminum frames with fabric or plastic seats. Steel chairs support 100-150 kg. Aluminum is lighter but weaker."},
            {"title": "Fun Fact", "detail": "Ancient Egyptian pharaohs had folding stools as portable thrones! Folding chairs found in King Tutankhamun's tomb are 3,300 years old."},
        ],
    },
    "rocking chair": {
        "name": "Rocking Chair",
        "category": "Furniture",
        "features": [
            {"title": "Physics", "detail": "The curved runners (rockers) create a pendulum motion. The center of gravity shifts as you rock, creating a natural back-and-forth rhythm."},
            {"title": "Health", "detail": "Rocking stimulates the vestibular system (balance center). Studies show it can reduce anxiety, improve sleep, and help with dementia symptoms."},
            {"title": "History", "detail": "Invented in the early 1700s, originally as garden furniture. Benjamin Franklin is sometimes (incorrectly) credited with the invention."},
            {"title": "Fun Fact", "detail": "President John F. Kennedy's doctor prescribed a rocking chair for his back pain. His iconic rocker is now in the JFK Library!"},
        ],
    },
    # ── Books & Writing ────────────────────────────────────
    "book": {
        "name": "Book",
        "category": "Knowledge & Learning",
        "features": [
            {"title": "History", "detail": "The first printed book was the Gutenberg Bible (1455). Before printing, books were copied by hand — taking months or years."},
            {"title": "Material", "detail": "Paper is made from wood pulp — cellulose fibers from trees. One tree makes about 100 books."},
            {"title": "Brain", "detail": "Reading activates multiple brain areas simultaneously: vision, language processing, memory, and imagination."},
            {"title": "Data", "detail": "A 300-page book contains ~500KB of text. Your phone can store the equivalent of millions of books!"},
            {"title": "Fun Fact", "detail": "The world's smallest book is 0.07mm × 0.10mm — you need an electron microscope to read it!"},
        ],
    },
    "book jacket": {
        "name": "Book",
        "category": "Knowledge & Learning",
        "features": [
            {"title": "History", "detail": "Book dust jackets appeared in the 1830s as protective wrapping. They became decorative in the 1920s to attract buyers."},
            {"title": "Paper Science", "detail": "Paper is made from cellulose fibers bonded together. Acid-free paper lasts 500+ years; regular paper yellows in 50 years."},
            {"title": "Reading", "detail": "Your brain processes written text at 200-300 words per minute. Speed readers can reach 1000+ wpm with practice."},
            {"title": "Fun Fact", "detail": "The most expensive book ever sold was Leonardo da Vinci's Codex Leicester — Bill Gates bought it for $30.8 million in 1994!"},
        ],
    },
    # ── Timepieces ─────────────────────────────────────────
    "clock": {
        "name": "Clock",
        "category": "Timekeeping",
        "features": [
            {"title": "Mechanism", "detail": "Quartz clocks use a tiny crystal that vibrates exactly 32,768 times per second when electricity is applied."},
            {"title": "History", "detail": "Mechanical clocks appeared in 13th century Europe. Before that, people used sundials, water clocks, and candle clocks."},
            {"title": "Accuracy", "detail": "Atomic clocks are accurate to 1 second in 300 million years! They use cesium atom vibrations (9.2 billion/second)."},
            {"title": "Fun Fact", "detail": "Time moves slightly faster on a mountaintop than at sea level — Einstein's relativity! GPS satellites must account for this."},
        ],
    },
    "wall clock": {
        "name": "Wall Clock",
        "category": "Timekeeping",
        "features": [
            {"title": "Quartz Crystal", "detail": "Most wall clocks use a quartz crystal that vibrates 32,768 times/second when voltage is applied, keeping precise time."},
            {"title": "Clockwise", "detail": "Clocks go 'clockwise' because sundials in the Northern Hemisphere cast shadows that move in that direction as the sun crosses the sky."},
            {"title": "History", "detail": "The first mechanical wall clocks (14th century) had no minute hand! Minutes weren't important until trains needed precise schedules."},
            {"title": "Fun Fact", "detail": "Big Ben in London is actually the name of the bell, not the clock! The clock tower is officially called the Elizabeth Tower."},
        ],
    },
    "analog clock": {
        "name": "Analog Clock",
        "category": "Timekeeping",
        "features": [
            {"title": "Mechanism", "detail": "Gears with specific tooth ratios make the minute hand rotate 12x faster than the hour hand. A simple yet elegant system."},
            {"title": "Quartz", "detail": "A tiny quartz crystal vibrates 32,768 times per second when electrified. A circuit divides this into 1-second pulses to move the hands."},
            {"title": "Hands", "detail": "The second hand's smooth vs ticking movement shows whether it uses a mechanical (sweep) or quartz (tick) movement."},
            {"title": "Fun Fact", "detail": "Clocks in advertisements almost always show 10:10 — it makes the clock face look like it's smiling!"},
        ],
    },
    "digital clock": {
        "name": "Digital Clock",
        "category": "Timekeeping",
        "features": [
            {"title": "Display", "detail": "Uses LED or LCD segments. The 7-segment display can show all digits 0-9 and was invented in 1910 but popularized in the 1970s."},
            {"title": "Accuracy", "detail": "Digital clocks use quartz oscillators accurate to ±15 seconds/month. Radio-controlled clocks sync with atomic clocks for perfect time."},
            {"title": "24h vs 12h", "detail": "Most of the world uses 24-hour time for clarity. The 12-hour AM/PM system originated from ancient Egypt's sundial divisions."},
            {"title": "Fun Fact", "detail": "The first digital clock (1956) used a motorized mechanical display of flip cards — no LEDs or LCDs existed yet!"},
        ],
    },
    # ── Living Things ──────────────────────────────────────
    "person": {
        "name": "Human Body",
        "category": "Biology",
        "features": [
            {"title": "Cells", "detail": "Your body has ~37 trillion cells. About 3.8 million cells die every second, but new ones constantly replace them."},
            {"title": "Brain", "detail": "The brain uses 20% of your body's energy despite being only 2% of body weight. It has ~86 billion neurons."},
            {"title": "Skeleton", "detail": "You have 206 bones. Babies are born with ~270 that fuse as they grow. The smallest bone (stapes) is 3mm."},
            {"title": "Water", "detail": "Your body is about 60% water. Brain = 73%, lungs = 83%, even bones = 31% water."},
            {"title": "Fun Fact", "detail": "If stretched end to end, all your DNA molecules would reach from Earth to Pluto and back — about 70 billion miles!"},
        ],
    },
    "cat": {
        "name": "Cat",
        "category": "Animal",
        "features": [
            {"title": "Vision", "detail": "Cats see 6x better in the dark thanks to a reflective layer (tapetum lucidum) behind their retinas."},
            {"title": "Agility", "detail": "230 bones, no collarbone, and a flexible spine let cats squeeze through any gap their head fits."},
            {"title": "Purring", "detail": "Purring at 25-150 Hz may promote bone healing and tissue repair — a self-healing mechanism!"},
            {"title": "Fun Fact", "detail": "Cats sleep 16 hours/day and can rotate their ears 180° independently."},
        ],
    },
    "dog": {
        "name": "Dog",
        "category": "Animal",
        "features": [
            {"title": "Smell", "detail": "Dogs have 300 million scent receptors (humans: 6 million). Their smell-processing brain area is 40x larger than ours."},
            {"title": "Hearing", "detail": "Dogs hear up to 65,000 Hz (humans max at 20,000 Hz) and can hear sounds 4x farther away."},
            {"title": "Evolution", "detail": "Domesticated from wolves 15,000-40,000 years ago — the first domesticated animal."},
            {"title": "Fun Fact", "detail": "Each dog's nose print is unique, like a human fingerprint! Their noses are wet to absorb scent chemicals."},
        ],
    },
    "potted plant": {
        "name": "Potted Plant",
        "category": "Living Organism",
        "features": [
            {"title": "Photosynthesis", "detail": "Uses sunlight + CO₂ + water to make glucose and O₂. One houseplant makes enough oxygen for about 1/10 of a person."},
            {"title": "Roots", "detail": "Roots absorb water and minerals via osmosis. Root hairs increase surface area by 100x for better absorption."},
            {"title": "Air Quality", "detail": "NASA found plants can remove up to 87% of air toxins (formaldehyde, benzene) in 24 hours."},
            {"title": "Fun Fact", "detail": "Plants can 'hear' — studies show they grow faster with certain sound frequencies around 1000-5000 Hz."},
        ],
    },
    "flowerpot": {
        "name": "Potted Plant / Flowerpot",
        "category": "Living Organism",
        "features": [
            {"title": "Drainage", "detail": "The hole at the bottom prevents root rot by draining excess water. Roots sitting in water suffocate from lack of oxygen."},
            {"title": "Photosynthesis", "detail": "Plants convert CO₂ + water + sunlight into glucose (food) and oxygen. This process powers almost all life on Earth."},
            {"title": "Soil Science", "detail": "Potting soil contains peat, perlite, and vermiculite — designed to retain moisture while allowing air circulation around roots."},
            {"title": "Fun Fact", "detail": "Terracotta pots are porous — they 'breathe' by allowing air and moisture to pass through the walls, keeping roots healthy."},
        ],
    },
    # ── Food & Fruit ───────────────────────────────────────
    "banana": {
        "name": "Banana",
        "category": "Fruit / Food",
        "features": [
            {"title": "Nutrition", "detail": "Rich in potassium (422mg), vitamin B6, and fiber. Potassium helps muscles contract and nerves send signals."},
            {"title": "Biology", "detail": "Bananas are technically berries! They grow in clusters called 'hands' on giant herbs, not trees."},
            {"title": "Chemistry", "detail": "Slightly radioactive due to potassium-40 isotope. You'd need 10 million bananas at once for radiation to be harmful!"},
            {"title": "Ripening", "detail": "Bananas produce ethylene gas that triggers ripening. Putting them near other fruits makes everything ripen faster."},
            {"title": "Fun Fact", "detail": "Banana DNA is 60% identical to human DNA! We share more genes with bananas than you'd expect."},
        ],
    },
    "apple": {
        "name": "Apple",
        "category": "Fruit / Food",
        "features": [
            {"title": "Nutrition", "detail": "One apple has ~95 calories, 4g fiber, and 14% daily vitamin C. The skin has most fiber and antioxidants."},
            {"title": "Varieties", "detail": "Over 7,500 varieties worldwide. It would take 20 years to try a new variety every day!"},
            {"title": "Science", "detail": "Apples float because they're 25% air! Air pockets between cells make them less dense than water."},
            {"title": "History", "detail": "Newton's falling apple observation inspired his theory of gravity — the same force keeping the Moon in orbit."},
            {"title": "Fun Fact", "detail": "Apple seeds contain amygdalin (cyanide precursor), but you'd need 200+ seeds at once for danger."},
        ],
    },
    "orange": {
        "name": "Orange",
        "category": "Fruit / Food",
        "features": [
            {"title": "Nutrition", "detail": "One orange has 70 calories, 130% daily vitamin C, and 3g fiber. Vitamin C boosts immune function and collagen production."},
            {"title": "Color", "detail": "The fruit was named before the color! The word 'orange' comes from Sanskrit 'naranga'. In many tropical countries, ripe oranges are green."},
            {"title": "Segments", "detail": "Oranges typically have 10 segments (carpels). Each segment is filled with juice vesicles — tiny sacs that burst when you bite."},
            {"title": "Fun Fact", "detail": "Brazil produces 1/3 of the world's oranges — about 17 million tonnes per year! Most become orange juice."},
        ],
    },
    "lemon": {
        "name": "Lemon",
        "category": "Fruit / Food",
        "features": [
            {"title": "Acid", "detail": "Lemons contain 5-6% citric acid, giving them pH 2.0. This acidity kills some bacteria and is used as a natural preservative."},
            {"title": "Vitamin C", "detail": "One lemon provides 51% of your daily vitamin C. British sailors ate lemons to prevent scurvy — hence the nickname 'limeys'."},
            {"title": "Electricity", "detail": "A lemon can generate about 0.9 volts of electricity! The citric acid reacts with zinc and copper electrodes to create a battery."},
            {"title": "Fun Fact", "detail": "Lemon juice is a natural invisible ink — write with it and the text appears when heated, as the acid chars before the paper!"},
        ],
    },
    "pizza": {
        "name": "Pizza",
        "category": "Food Science",
        "features": [
            {"title": "Chemistry", "detail": "The Maillard reaction (browning) between amino acids and sugars at 140-165°C creates pizza's complex flavors and golden crust."},
            {"title": "Yeast", "detail": "Dough rises because yeast (fungi) eats sugar and produces CO₂ gas bubbles. This fermentation creates the airy, chewy texture."},
            {"title": "Temperature", "detail": "Traditional Neapolitan pizza cooks at 485°C for just 60-90 seconds. Home ovens at 250°C take 10-15 minutes."},
            {"title": "Fun Fact", "detail": "Americans eat about 3 billion pizzas a year — roughly 100 acres of pizza per day! Pizza Margherita was named after Queen Margherita of Italy in 1889."},
        ],
    },
    # ── Home Objects ───────────────────────────────────────
    "tv": {
        "name": "Television",
        "category": "Display Technology",
        "features": [
            {"title": "Pixels", "detail": "A 4K TV has 8.3 million pixels (3840×2160), each with RGB sub-pixels — ~25 million light sources!"},
            {"title": "Technology", "detail": "OLED TVs have self-emitting pixels. LED TVs use a backlight behind an LCD panel that filters colors."},
            {"title": "Refresh Rate", "detail": "60Hz = 60 updates/second. 120Hz is smoother for fast motion and gaming."},
            {"title": "Fun Fact", "detail": "The first TV broadcast (1928) had only 48 lines of resolution. Today's 8K TVs have 7680 lines!"},
        ],
    },
    "television": {
        "name": "Television",
        "category": "Display Technology",
        "features": [
            {"title": "Pixels", "detail": "A 4K TV has 8.3 million pixels. Each pixel has Red, Green, and Blue sub-pixels — about 25 million tiny light sources total!"},
            {"title": "OLED vs LED", "detail": "OLED pixels emit their own light (true black). LED TVs use a backlight behind liquid crystal filters — can't achieve true black."},
            {"title": "History", "detail": "First TV broadcast in 1928 had 48 lines. Standard HD is 1080 lines. 4K = 2160 lines. 8K = 4320 lines — 90x the first broadcast!"},
            {"title": "Fun Fact", "detail": "If you watched TV 8 hours daily, it would take 56 years to watch every show and movie ever made."},
        ],
    },
    "remote control": {
        "name": "Remote Control",
        "category": "Electronics",
        "features": [
            {"title": "How It Works", "detail": "Uses infrared (IR) LED — invisible to eyes but your phone camera can see it! Point and press to check."},
            {"title": "Encoding", "detail": "Each button sends a unique pattern of IR light pulses. The TV decodes these patterns to know which button was pressed."},
            {"title": "Battery", "detail": "Alkaline batteries convert chemical energy (zinc + manganese dioxide) to electrical energy."},
            {"title": "Fun Fact", "detail": "The first remote (1955) was called 'Zenith Space Command' and used ultrasonic sound instead of IR light!"},
        ],
    },
    "pillow": {
        "name": "Pillow",
        "category": "Everyday Object",
        "features": [
            {"title": "Ergonomics", "detail": "Pillows align your neck with your spine. Side sleepers need thicker pillows, back sleepers need thinner ones for proper support."},
            {"title": "Materials", "detail": "Filled with polyester fiber, memory foam, down feathers, or buckwheat hulls. Memory foam molds to your head shape using body heat."},
            {"title": "Hygiene", "detail": "After 2 years, 10% of a pillow's weight can be dust mites and their waste! Experts recommend replacing pillows every 1-2 years."},
            {"title": "Fun Fact", "detail": "Ancient Mesopotamians used stone pillows 9,000 years ago! Ancient Egyptians used wooden or ivory headrests to protect elaborate hairstyles."},
        ],
    },
    # ── Bags & Accessories ─────────────────────────────────
    "backpack": {
        "name": "Backpack",
        "category": "Everyday Object",
        "features": [
            {"title": "Ergonomics", "detail": "Should weigh no more than 10-15% of body weight. Both straps distribute weight evenly across shoulders."},
            {"title": "Material", "detail": "Most use nylon (strong, water-resistant) or polyester. Military packs use Cordura — 10x more abrasion-resistant."},
            {"title": "Physics", "detail": "Wearing high on back keeps center of gravity close to spine, reducing strain by up to 50%."},
            {"title": "Fun Fact", "detail": "The modern zippered backpack was invented in 1938. Before that, students used leather straps!"},
        ],
    },
    "umbrella": {
        "name": "Umbrella",
        "category": "Everyday Object",
        "features": [
            {"title": "Material", "detail": "Canopy is polyester/nylon with waterproof coating. Frame uses steel or fiberglass ribs for flexibility."},
            {"title": "History", "detail": "Invented over 3,500 years ago in ancient Egypt — originally for sun protection, not rain!"},
            {"title": "Physics", "detail": "Tight fabric weave plus coating creates surface tension that prevents water from passing through."},
            {"title": "Fun Fact", "detail": "The UK loses about 80,000 umbrellas on public transport every year!"},
        ],
    },
    "sunglasses": {
        "name": "Sunglasses",
        "category": "Eyewear",
        "features": [
            {"title": "UV Protection", "detail": "Good sunglasses block 99-100% of UV-A and UV-B radiation. UV exposure can cause cataracts and macular degeneration over time."},
            {"title": "Polarization", "detail": "Polarized lenses have a special filter that blocks horizontal light waves (glare from flat surfaces like water or roads)."},
            {"title": "Tint vs Protection", "detail": "Dark tint does NOT mean better UV protection! A clear lens can block 100% UV. Cheap dark glasses without UV coating are actually worse."},
            {"title": "Fun Fact", "detail": "Roman emperor Nero watched gladiator fights through polished emerald gems — possibly the first 'sunglasses' in history (1st century AD)!"},
        ],
    },
    # ── Scissors & Tools ───────────────────────────────────
    "scissors": {
        "name": "Scissors",
        "category": "Tool",
        "features": [
            {"title": "Physics", "detail": "Scissors are two Class 1 levers joined at a fulcrum (pivot). They multiply your hand's force."},
            {"title": "Material", "detail": "Blades are stainless steel (iron + chromium + carbon). Chromium forms an oxide layer preventing rust."},
            {"title": "History", "detail": "Earliest scissors date to 1500 BC in ancient Egypt. Leonardo da Vinci is often incorrectly credited."},
            {"title": "Fun Fact", "detail": "Left-handed scissors reverse the blade overlap — right-handed scissors actually push blades apart when used lefty!"},
        ],
    },
    # ── Kitchen Appliances ─────────────────────────────────
    "microwave": {
        "name": "Microwave Oven",
        "category": "Kitchen Appliance",
        "features": [
            {"title": "How It Works", "detail": "A magnetron generates microwaves (2.45 GHz) that vibrate water molecules 2.45 billion times/second, creating friction heat."},
            {"title": "Discovery", "detail": "Invented by accident in 1945! Engineer Percy Spencer noticed a chocolate bar melted near a radar magnetron."},
            {"title": "Safety", "detail": "The metal mesh in the door has holes smaller than microwave wavelength (12.2cm), so waves can't escape but light passes through."},
            {"title": "Fun Fact", "detail": "Microwaves don't heat from inside out — they penetrate about 1-1.5cm deep. The rest heats by conduction."},
        ],
    },
    "refrigerator": {
        "name": "Refrigerator",
        "category": "Kitchen Appliance",
        "features": [
            {"title": "How It Works", "detail": "Refrigerant gas absorbs heat when evaporating inside, releases heat when compressed outside. It moves heat, not cold!"},
            {"title": "Temperature", "detail": "Ideal: fridge 3-4°C, freezer -18°C. Bacteria growth slows 2x for every 5°C decrease."},
            {"title": "Energy", "detail": "Runs 24/7, using 150-400 kWh/year — about 13% of household electricity."},
            {"title": "Fun Fact", "detail": "Before fridges, people stored food in icehouses filled with winter-harvested ice, or underground root cellars."},
        ],
    },
    # ── Stationery ─────────────────────────────────────────
    "ballpoint": {
        "name": "Ballpoint Pen",
        "category": "Writing Instrument",
        "features": [
            {"title": "How It Works", "detail": "A tiny ball (0.7-1.0mm) rotates in a socket, picking up viscous ink from a cartridge and depositing it on paper by contact."},
            {"title": "Ink Science", "detail": "Ballpoint ink is oil-based and viscous (thick). It dries by absorption into paper and oxidation, unlike water-based fountain pen ink."},
            {"title": "History", "detail": "Patented by László Bíró in 1938. He noticed newspaper ink dried quickly, so he created a pen that could use similar thick ink."},
            {"title": "Fun Fact", "detail": "A single ballpoint pen can draw a line 2-3 km long! The average pen runs out after writing about 45,000 words."},
        ],
    },
    "pencil": {
        "name": "Pencil",
        "category": "Writing Instrument",
        "features": [
            {"title": "Material", "detail": "Pencil 'lead' is actually graphite (carbon) mixed with clay. More clay = harder pencil (H). More graphite = softer/darker (B)."},
            {"title": "How It Works", "detail": "Graphite has layers of carbon atoms that slide apart easily, leaving marks on paper. It's held by Van der Waals forces."},
            {"title": "Capacity", "detail": "A single pencil can draw a line 56 km long or write approximately 45,000 words before running out!"},
            {"title": "Fun Fact", "detail": "NASA spent millions developing a space pen. The Soviets used pencils! (Actually, both eventually used space pens — pencil tips can break and damage electronics in zero gravity.)"},
        ],
    },
    # ── Footwear ───────────────────────────────────────────
    "running shoe": {
        "name": "Running Shoe / Sneaker",
        "category": "Footwear",
        "features": [
            {"title": "Cushioning", "detail": "Midsoles use EVA foam or special foams (Nike ZoomX, Adidas Boost) that compress on impact and return energy — up to 85% energy return."},
            {"title": "Biomechanics", "detail": "Running generates impact forces of 2-3x your body weight. Shoes distribute this force across the foot to reduce joint stress."},
            {"title": "Material", "detail": "Uppers use knit or mesh fabric for breathability. Outsoles use rubber compounds optimized for grip on different surfaces."},
            {"title": "Fun Fact", "detail": "The first modern running shoes (1920s) were just rubber-soled plimsolls. Today's carbon-plate shoes have helped break the 2-hour marathon!"},
        ],
    },
    "Loafer": {
        "name": "Shoe / Loafer",
        "category": "Footwear",
        "features": [
            {"title": "Material", "detail": "Leather shoes are made from tanned animal hide. Tanning converts collagen fibers into a durable, flexible material."},
            {"title": "Construction", "detail": "Quality shoes use a welt — a strip stitching the upper to the sole. Goodyear-welted shoes can be resoled multiple times."},
            {"title": "Sizing", "detail": "Shoe sizes vary by country. The Brannock Device (invented 1927) measures foot length, width, and arch length for proper fit."},
            {"title": "Fun Fact", "detail": "The oldest known shoes are 5,500 years old, found in an Armenian cave. They were made of a single piece of cowhide!"},
        ],
    },
    # ── Miscellaneous ──────────────────────────────────────
    "window shade": {
        "name": "Window / Curtain",
        "category": "Home Furnishing",
        "features": [
            {"title": "Insulation", "detail": "Curtains can reduce heat loss through windows by 25-40%. Thermal curtains have insulating backing that blocks cold air transfer."},
            {"title": "Light Control", "detail": "Blackout curtains block 99% of light using tightly woven fabric or special coating. Important for sleep quality."},
            {"title": "Physics", "detail": "Windows lose heat through conduction, convection, and radiation. The air gap between curtain and glass acts as an insulating layer."},
            {"title": "Fun Fact", "detail": "Ancient Egyptians hung wet reeds over doorways — the first 'curtains'. As water evaporated, it cooled the air coming in!"},
        ],
    },
    "toilet tissue": {
        "name": "Toilet Paper / Tissue",
        "category": "Everyday Object",
        "features": [
            {"title": "Material", "detail": "Made from virgin wood pulp or recycled paper. The fibers are softened by creping — scraping the paper off the manufacturing drum."},
            {"title": "History", "detail": "Modern toilet paper was invented in 1857 in the US. Before that, people used leaves, corn cobs, wool, or water."},
            {"title": "Manufacturing", "detail": "The embossed patterns aren't just decorative — they increase surface area and softness while helping the paper absorb more."},
            {"title": "Fun Fact", "detail": "The average person uses about 100 rolls (20,000 sheets) of toilet paper per year! That's 384 trees in a lifetime."},
        ],
    },
    "paper towel": {
        "name": "Paper Towel",
        "category": "Everyday Object",
        "features": [
            {"title": "Absorption", "detail": "Paper towels absorb water through capillary action — water molecules are attracted to cellulose fibers and climb into tiny spaces between them."},
            {"title": "Strength", "detail": "Wet strength comes from special resins bonding the fibers. Without these resins, paper disintegrates when wet."},
            {"title": "History", "detail": "Invented accidentally by Arthur Scott in 1907 when a toilet paper roll was made too thick. He cut it into towels instead of tossing it."},
            {"title": "Fun Fact", "detail": "Bouncing water off a surface with a paper towel demonstrates hydrophobic properties some brands add to their towels!"},
        ],
    },
    "water jug": {
        "name": "Water Jug / Pitcher",
        "category": "Kitchen Item",
        "features": [
            {"title": "Material", "detail": "Can be glass, ceramic, plastic, or stainless steel. Glass is non-reactive and won't leach chemicals into water."},
            {"title": "Filtration", "detail": "Filter jugs use activated carbon (charcoal) which has millions of tiny pores. One gram has the surface area of 4 tennis courts!"},
            {"title": "Water Science", "detail": "Water is called the 'universal solvent' because its polar molecules can dissolve more substances than any other liquid."},
            {"title": "Fun Fact", "detail": "Hot water freezes faster than cold water in some conditions — this is called the Mpemba effect, and it's still not fully explained!"},
        ],
    },
    "toothbrush": {
        "name": "Toothbrush",
        "category": "Personal Care",
        "features": [
            {"title": "Bristles", "detail": "Modern bristles are nylon (invented 1938). Before that, pig hair, horse hair, or bird feathers!"},
            {"title": "Teeth", "detail": "Tooth enamel is the hardest substance in your body — harder than steel! But it can't regenerate once damaged."},
            {"title": "Hygiene", "detail": "Your mouth has 700+ species of bacteria. Brushing removes plaque — the sticky biofilm bacteria form on teeth."},
            {"title": "Fun Fact", "detail": "The first toothbrush was invented in China in 1498 using bamboo and boar bristles!"},
        ],
    },
    "hand towel": {
        "name": "Towel",
        "category": "Everyday Object",
        "features": [
            {"title": "Material", "detail": "Terry cloth towels have tiny loops (called pile) that increase surface area dramatically, allowing them to absorb 27x their weight in water."},
            {"title": "Absorption", "detail": "Cotton fibers are hollow and hydrophilic — they attract water through capillary action, pulling moisture into the fiber structure."},
            {"title": "Hygiene", "detail": "Damp towels can grow bacteria rapidly. Wash them every 3-4 uses and hang to dry between uses to prevent microbial growth."},
            {"title": "Fun Fact", "detail": "Towel Day is celebrated annually on May 25th — a tribute to Douglas Adams' 'The Hitchhiker's Guide to the Galaxy' where towels are essential!"},
        ],
    },
}

# ── Aliases: map various MobileNet labels to the same features ──

ALIASES = {
    # Technology
    "notebook computer": "laptop",
    "portable computer": "laptop",
    "hand-held computer": "cell phone",
    "smartphone": "cell phone",
    "dial telephone": "cell phone",
    "telephone": "cell phone",
    "computer keyboard": "keyboard",
    "typewriter keyboard": "keyboard",
    "computer mouse": "mouse",
    "trackball": "mouse",
    "joystick": "mouse",
    "computer monitor": "monitor",
    "crt screen": "monitor",
    "lcd screen": "monitor",
    "flat panel": "monitor",
    "display": "screen",
    "pc": "desktop computer",
    "web site": "screen",
    # Fan
    "propeller": "electric fan",
    "fan": "electric fan",
    # Lighting
    "lamp": "table lamp",
    "floor lamp": "table lamp",
    "chandelier": "table lamp",
    "torch": "table lamp",
    "candle": "table lamp",
    "spotlight": "table lamp",
    # Time
    "stopwatch": "clock",
    "timer": "clock",
    "hourglass": "clock",
    "sundial": "clock",
    # Food
    "granny smith": "apple",
    "custard apple": "apple",
    "fig": "apple",
    "pineapple": "apple",
    "strawberry": "apple",
    "pomegranate": "orange",
    "jackfruit": "orange",
    "mango": "orange",
    "ice cream": "pizza",
    "cheeseburger": "pizza",
    "hotdog": "pizza",
    "french loaf": "pizza",
    "pretzel": "pizza",
    "bagel": "pizza",
    "dough": "pizza",
    "espresso": "coffee mug",
    "teapot": "coffee mug",
    "coffeepot": "coffee mug",
    # Containers
    "pop bottle": "bottle",
    "beer bottle": "bottle",
    "wine bottle": "bottle",
    "beer glass": "cup",
    "goblet": "cup",
    "pitcher": "water jug",
    "vase": "water jug",
    "measuring cup": "cup",
    # Clothing / Footwear
    "shoe": "running shoe",
    "sneaker": "running shoe",
    "clog": "running shoe",
    "sandal": "running shoe",
    "cowboy boot": "running shoe",
    "sock": "running shoe",
    "sunglass": "sunglasses",
    # Furniture  
    "studio couch": "chair",
    "dining table": "chair",
    "desk": "chair",
    "throne": "chair",
    "park bench": "chair",
    "barber chair": "chair",
    "swivel chair": "chair",
    # School/writing
    "ballpoint pen": "ballpoint",
    "fountain pen": "ballpoint",
    "quill": "ballpoint",
    "pen": "ballpoint",
    "pencil sharpener": "pencil",
    "rubber eraser": "pencil",
    "eraser": "pencil",
    "notebook": "book",
    "binder": "book",
    # Home
    "pillow": "pillow",
    "quilt": "pillow",
    "sleeping bag": "pillow",
    "shower curtain": "window shade",
    "window screen": "window shade",
    "curtain": "window shade",
    "bath towel": "hand towel",
    "washcloth": "hand towel",
    "napkin": "paper towel",
    "diaper": "toilet tissue",
    "tissue": "toilet tissue",
    "toilet seat": "toilet tissue",
    # Misc
    "envelope": "book",
    "packet": "backpack",
    "mailbag": "backpack",
    "purse": "backpack",
    "wallet": "backpack",
}

# ── Quiz questions ──────────────────────────────────────────

OBJECT_QUIZZES: Dict[str, List[dict]] = {
    "bottle": [
        {"question": "What is the chemical formula of water?", "options": ["CO₂", "H₂O", "O₂", "NaCl"], "correct": 1, "explanation": {"correct": "Correct! Water is H₂O — two hydrogen atoms bonded to one oxygen atom.", "wrong": "It's H₂O — two hydrogen (H) atoms and one oxygen (O) atom bonded together."}},
        {"question": "At what temperature does water boil?", "options": ["50°C", "100°C", "150°C", "200°C"], "correct": 1, "explanation": {"correct": "Correct! Water boils at 100°C (212°F) at sea level.", "wrong": "Water boils at 100°C (212°F) at standard atmospheric pressure."}},
    ],
    "laptop": [
        {"question": "What does CPU stand for?", "options": ["Central Processing Unit", "Computer Power Unit", "Central Power Utility", "Core Processing Unit"], "correct": 0, "explanation": {"correct": "Correct! CPU = Central Processing Unit — the 'brain' of your computer.", "wrong": "CPU stands for Central Processing Unit — it executes instructions and processes data."}},
        {"question": "Which component stores data permanently?", "options": ["RAM", "CPU", "SSD/Hard Drive", "GPU"], "correct": 2, "explanation": {"correct": "Correct! SSDs and hard drives retain data even when powered off.", "wrong": "SSD/Hard Drive stores data permanently. RAM loses data when power is off."}},
    ],
    "cell phone": [
        {"question": "What type of waves does WiFi use?", "options": ["Sound waves", "Radio waves", "X-rays", "Light waves"], "correct": 1, "explanation": {"correct": "Correct! WiFi uses radio waves at 2.4 GHz or 5 GHz frequency.", "wrong": "WiFi uses radio waves — same type as FM radio, just at different frequencies."}},
    ],
    "cellular telephone": [
        {"question": "What type of waves does WiFi use?", "options": ["Sound waves", "Radio waves", "X-rays", "Light waves"], "correct": 1, "explanation": {"correct": "Correct! WiFi uses radio waves at 2.4 GHz or 5 GHz.", "wrong": "WiFi uses radio waves, similar to FM radio but at different frequencies."}},
    ],
    "ceiling fan": [
        {"question": "How does a fan cool you down?", "options": ["It makes cold air", "It removes heat from air", "It speeds up sweat evaporation", "It lowers room temperature"], "correct": 2, "explanation": {"correct": "Correct! Fans create airflow that speeds up sweat evaporation, providing a wind-chill effect.", "wrong": "Fans don't actually cool air — they create wind-chill by speeding up sweat evaporation from your skin."}},
        {"question": "How much energy does a ceiling fan use vs an AC?", "options": ["Same amount", "50x less", "2x less", "10x more"], "correct": 1, "explanation": {"correct": "Correct! Ceiling fans use only 15-75 watts vs 1500-3000 watts for AC — about 50x less!", "wrong": "A ceiling fan uses only 15-75 watts compared to 1500-3000 watts for an air conditioner — about 50x less energy!"}},
    ],
    "electric fan": [
        {"question": "A fan actually cools you by...", "options": ["Lowering air temperature", "Producing cold air", "Speeding up sweat evaporation", "Filtering warm air"], "correct": 2, "explanation": {"correct": "Correct! The wind-chill effect from airflow speeds up evaporation of sweat from your skin.", "wrong": "Fans create a wind-chill effect — moving air speeds up sweat evaporation, making you feel cooler without actually lowering the air temperature."}},
    ],
    "banana": [
        {"question": "Which mineral are bananas famous for?", "options": ["Iron", "Calcium", "Potassium", "Zinc"], "correct": 2, "explanation": {"correct": "Correct! Bananas have ~422mg potassium, essential for nerve and muscle function.", "wrong": "Bananas are rich in potassium — about 422mg per banana."}},
    ],
    "apple": [
        {"question": "Why do apples float in water?", "options": ["They're hollow", "They're 25% air", "They have wax coating", "They repel water"], "correct": 1, "explanation": {"correct": "Correct! Apples are about 25% air, making them less dense than water.", "wrong": "Apples are approximately 25% air due to tiny pockets between cells."}},
    ],
    "potted plant": [
        {"question": "What gas do plants absorb during photosynthesis?", "options": ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], "correct": 2, "explanation": {"correct": "Correct! Plants absorb CO₂ and use it with sunlight and water to make glucose.", "wrong": "Plants absorb Carbon Dioxide (CO₂) and use it + sunlight + water to produce glucose and oxygen."}},
    ],
    "person": [
        {"question": "How many bones does an adult human have?", "options": ["106", "206", "306", "406"], "correct": 1, "explanation": {"correct": "Correct! Adults have 206 bones. Babies have ~270 that fuse together.", "wrong": "Adults have 206 bones. Babies are born with ~270, many of which fuse during growth."}},
    ],
    "scissors": [
        {"question": "What type of simple machine are scissors?", "options": ["Pulley", "Wedge", "Lever", "Wheel"], "correct": 2, "explanation": {"correct": "Correct! Scissors are two Class 1 levers joined at a fulcrum.", "wrong": "Scissors are a type of lever — two Class 1 levers joined at a pivot point."}},
    ],
    "clock": [
        {"question": "How many times does a quartz crystal vibrate per second?", "options": ["100", "1,000", "32,768", "1,000,000"], "correct": 2, "explanation": {"correct": "Correct! Quartz crystals vibrate exactly 32,768 times per second when voltage is applied.", "wrong": "Quartz crystals vibrate exactly 32,768 times per second — this frequency is used to keep precise time."}},
    ],
    "table lamp": [
        {"question": "How much less energy does an LED use vs incandescent?", "options": ["10% less", "25% less", "50% less", "75% less"], "correct": 3, "explanation": {"correct": "Correct! LEDs use 75% less energy than incandescent bulbs while producing the same brightness.", "wrong": "LED bulbs use 75% less energy — a 10W LED equals a 60W incandescent in brightness!"}},
    ],
    "book": [
        {"question": "When was the first printed book made?", "options": ["1055", "1255", "1455", "1655"], "correct": 2, "explanation": {"correct": "Correct! The Gutenberg Bible (1455) was the first major book printed with movable type.", "wrong": "The Gutenberg Bible was printed in 1455, marking the start of mass-produced books in Europe."}},
    ],
    "microwave": [
        {"question": "How was the microwave invented?", "options": ["Carefully designed", "By accident", "Military project", "Science fair"], "correct": 1, "explanation": {"correct": "Correct! Percy Spencer noticed a candy bar melted in his pocket near a radar magnetron in 1945.", "wrong": "The microwave was invented by accident in 1945 when engineer Percy Spencer noticed a chocolate bar melted near a radar device."}},
    ],
}

# Also add quiz aliases
QUIZ_ALIASES = {
    "notebook computer": "laptop",
    "portable computer": "laptop",
    "cellular telephone": "cell phone",
    "smartphone": "cell phone",
    "hand-held computer": "cell phone",
    "fan": "electric fan",
    "propeller": "electric fan",
    "lamp": "table lamp",
    "desk lamp": "table lamp",
    "lampshade": "table lamp",
    "wall clock": "clock",
    "analog clock": "clock",
    "digital clock": "clock",
    "stopwatch": "clock",
    "granny smith": "apple",
    "water bottle": "bottle",
    "pop bottle": "bottle",
    "wine bottle": "bottle",
    "coffee mug": "cup",
    "espresso": "cup",
    "flowerpot": "potted plant",
    "book jacket": "book",
    "running shoe": "person",
    "ballpoint": "book",
    "pencil": "book",
}


# ── Service Functions ──────────────────────────────────────────


def _resolve_alias(name: str) -> str:
    """Resolve an object name through aliases to find matching features."""
    lower = name.lower().strip()
    if lower in ALIASES:
        return ALIASES[lower]
    return lower


def get_object_features(object_name: str) -> dict:
    """Return pre-built educational features for a detected object."""
    resolved = _resolve_alias(object_name)

    # Direct match
    if resolved in OBJECT_FEATURES:
        data = OBJECT_FEATURES[resolved]
        return {
            "found": True,
            "name": data["name"],
            "category": data["category"],
            "features": data["features"],
        }

    # Partial / substring match
    for key, data in OBJECT_FEATURES.items():
        if key in resolved or resolved in key:
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
    resolved = _resolve_alias(object_name)

    # Direct match in quizzes
    if resolved in OBJECT_QUIZZES:
        quiz = random.choice(OBJECT_QUIZZES[resolved])
        return {
            "question": quiz["question"],
            "options": quiz["options"],
            "correct_index": quiz["correct"],
            "explanations": quiz["explanation"],
        }

    # Check quiz-specific aliases
    lower = object_name.lower().strip()
    if lower in QUIZ_ALIASES:
        alias_key = QUIZ_ALIASES[lower]
        if alias_key in OBJECT_QUIZZES:
            quiz = random.choice(OBJECT_QUIZZES[alias_key])
            return {
                "question": quiz["question"],
                "options": quiz["options"],
                "correct_index": quiz["correct"],
                "explanations": quiz["explanation"],
            }

    # Partial match
    for key, quizzes in OBJECT_QUIZZES.items():
        if key in resolved or resolved in key:
            quiz = random.choice(quizzes)
            return {
                "question": quiz["question"],
                "options": quiz["options"],
                "correct_index": quiz["correct"],
                "explanations": quiz["explanation"],
            }

    return None


# Backward compatibility
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
