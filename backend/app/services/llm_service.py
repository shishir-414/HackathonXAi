"""
LLM Service - Uses Ollama or Pollinations.ai for script generation.
Priority: Ollama (local) → Pollinations.ai (free online) → hardcoded fallback.
"""

import httpx
import json
import logging
import re
from typing import List, Optional

from app.config import settings

logger = logging.getLogger(__name__)

# ── Shared system prompts ─────────────────────────────────────────

SCRIPT_SYSTEM_PROMPT = (
    "You are an expert educational content creator who provides ACCURATE, FACTUAL information. "
    "Your primary goal is to DIRECTLY and PRECISELY answer the user's question with correct facts, data, and explanations. "
    "Rules you MUST follow:\n"
    "1. DIRECTLY answer the specific question asked — do NOT give generic or vague content.\n"
    "2. Include SPECIFIC facts, numbers, dates, names, and real-world examples relevant to the question.\n"
    "3. Keep the script between 100-180 words (for a 40-70 second video).\n"
    "4. Use simple, clear language suitable for students (grades 5-10).\n"
    "5. Write ONLY the spoken narration text — NO stage directions, camera notes, headings, labels, or markdown.\n"
    "6. Start by directly addressing the question. End with a key takeaway.\n"
    "7. Ensure every sentence adds factual value — avoid filler phrases like 'great question' or 'let's explore'.\n"
    "8. If the question asks 'what is X', define X precisely. If it asks 'how', explain the process step by step. "
    "If it asks 'why', give the actual reason with evidence."
)

SCRIPT_USER_PROMPT_TEMPLATE = (
    "Question: {question}\n\n"
    "Write a short, ACCURATE educational video script that DIRECTLY answers the above question. "
    "Focus on providing the correct, factual answer with specific details. "
    "Do not include any greetings, labels, section headers, or markdown — only plain narration text."
)


def _clean_llm_output(text: str) -> str:
    """Strip markdown formatting, headers, labels, and stage directions from LLM output."""
    # Remove markdown bold/italic
    text = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', text)
    # Remove markdown headers
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Remove lines that look like labels/headers (e.g. "Title:", "[INTRO]", "---")
    lines = text.strip().split('\n')
    cleaned = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Skip separator lines
        if re.match(r'^[-=_~]{3,}$', line):
            continue
        # Skip bracketed stage directions like [INTRO], [Scene 1]
        if re.match(r'^\[.*\]$', line):
            continue
        # Skip label-only lines like "Narrator:", "Script:", "Title:"
        if re.match(r'^[A-Za-z\s]{1,20}:\s*$', line):
            continue
        # Remove leading label from content lines (e.g., "Narrator: The sun...")
        line = re.sub(r'^(?:Narrator|Script|Voiceover|Speaker|Host|Title)\s*:\s*', '', line, flags=re.IGNORECASE)
        cleaned.append(line)
    return ' '.join(cleaned).strip()


# ── Ollama (local LLM) ───────────────────────────────────────────

async def check_ollama_available() -> bool:
    """Check if Ollama is running and accessible."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False


async def generate_with_ollama(prompt: str, system_prompt: str = "") -> str:
    """Generate text using Ollama API."""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            payload = {
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "system": system_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.4,
                    "top_p": 0.85,
                    "num_predict": 1024,
                }
            }
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json=payload
            )
            if resp.status_code == 200:
                data = resp.json()
                return _clean_llm_output(data.get("response", ""))
            else:
                logger.error(f"Ollama error: {resp.status_code} - {resp.text}")
                return ""
    except Exception as e:
        logger.error(f"Ollama connection error: {e}")
        return ""


# ── Pollinations.ai (free online LLM, no API key) ────────────────

POLLINATIONS_TEXT_URL = "https://text.pollinations.ai/"


async def generate_with_pollinations(prompt: str, system_prompt: str = "") -> str:
    """Generate text using Pollinations.ai free text API (OpenAI-compatible)."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            payload = {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "model": "openai",
                "seed": 42,
                "jsonMode": False,
            }
            resp = await client.post(
                POLLINATIONS_TEXT_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                text = resp.text.strip()
                # Pollinations returns raw text (not JSON-wrapped)
                return _clean_llm_output(text)
            else:
                logger.error(f"Pollinations text error: {resp.status_code} - {resp.text[:200]}")
                return ""
    except Exception as e:
        logger.error(f"Pollinations text connection error: {e}")
        return ""


# ── Hardcoded fallback (last resort) ─────────────────────────────

def fallback_generate_script(question: str) -> str:
    """Generate a simple educational script without any LLM (last resort)."""
    question_lower = question.lower().strip().rstrip("?")

    # Simple educational content templates
    topics = {
        "photosynthesis": (
            "Photosynthesis is the process by which plants make their own food. "
            "Plants use sunlight, water, and carbon dioxide to create glucose and oxygen. "
            "This happens mainly in the leaves, where chlorophyll captures sunlight. "
            "The chemical equation is: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2. "
            "Without photosynthesis, life on Earth would not be possible. "
            "It provides food for plants and oxygen for all living beings."
        ),
        "gravity": (
            "Gravity is a fundamental force that attracts objects with mass toward each other. "
            "Sir Isaac Newton discovered gravity when he saw an apple fall from a tree. "
            "The Earth's gravity pulls everything toward its center. "
            "Gravity keeps the Moon orbiting Earth and Earth orbiting the Sun. "
            "The gravitational force depends on mass and distance between objects. "
            "On the Moon, you would weigh only one-sixth of your Earth weight."
        ),
        "water cycle": (
            "The water cycle describes how water moves continuously on Earth. "
            "It has four main stages: evaporation, condensation, precipitation, and collection. "
            "The Sun heats water in oceans and rivers, turning it into water vapor. "
            "Water vapor rises and cools, forming clouds through condensation. "
            "When clouds get heavy enough, water falls as rain or snow. "
            "This water collects in rivers, lakes, and oceans, starting the cycle again."
        ),
        "cell": (
            "A cell is the basic unit of life in all living organisms. "
            "There are two main types: plant cells and animal cells. "
            "Every cell has a cell membrane that controls what enters and leaves. "
            "The nucleus is the control center, containing DNA with genetic instructions. "
            "Mitochondria are the powerhouses that produce energy for the cell. "
            "Humans have about 37 trillion cells working together in their body."
        ),
        "cat": (
            "Cats are one of the most popular pets in the world. "
            "They are carnivorous mammals that belong to the family Felidae. "
            "Cats have excellent night vision and can see six times better than humans in the dark. "
            "They have retractable claws, sharp teeth, and powerful muscles for hunting. "
            "A cat's whiskers help it sense its surroundings and judge tight spaces. "
            "Domestic cats can sleep up to 16 hours a day and purr when they are content."
        ),
        "dog": (
            "Dogs are known as man's best friend and are the most loyal pets. "
            "They are descendants of wolves and were the first animals domesticated by humans. "
            "Dogs have an incredible sense of smell, about 40 times better than ours. "
            "There are over 340 different dog breeds, from tiny Chihuahuas to giant Great Danes. "
            "Dogs communicate through barking, body language, and tail wagging. "
            "They are used as guide dogs, police dogs, and therapy animals because of their intelligence."
        ),
        "solar system": (
            "Our solar system consists of the Sun and everything that orbits around it. "
            "There are eight planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. "
            "The Sun is a massive star that contains 99.8 percent of the solar system's total mass. "
            "Jupiter is the largest planet, so big that all other planets could fit inside it. "
            "Earth is the only planet known to support life because of liquid water and atmosphere. "
            "The solar system is about 4.6 billion years old and is located in the Milky Way galaxy."
        ),
        "atom": (
            "An atom is the smallest unit of matter that retains the properties of an element. "
            "Every atom has three main parts: protons, neutrons, and electrons. "
            "Protons carry a positive charge and neutrons have no charge, both sit in the nucleus. "
            "Electrons are tiny negative particles that orbit the nucleus in energy levels. "
            "Atoms are incredibly small — about 10 million atoms could fit across a single millimeter. "
            "Different elements have different numbers of protons, which gives them unique properties."
        ),
        "volcano": (
            "A volcano is an opening in the Earth's surface where magma escapes from below. "
            "When magma reaches the surface, it is called lava and can reach temperatures over 1000 degrees. "
            "There are three main types: shield volcanoes, cinder cones, and stratovolcanoes. "
            "The Ring of Fire in the Pacific Ocean contains about 75 percent of the world's active volcanoes. "
            "Volcanic eruptions can create new islands, fertile soil, and even affect global climate. "
            "Famous volcanoes include Mount Vesuvius, Mount Fuji, and Mount Etna."
        ),
        "moon": (
            "The Moon is Earth's only natural satellite and our closest neighbor in space. "
            "It is about 384,400 kilometers away from Earth and takes 27.3 days to orbit us. "
            "The Moon has no atmosphere, no weather, and no liquid water on its surface. "
            "We always see the same side of the Moon because it rotates at the same speed as it orbits. "
            "The Moon's gravity causes ocean tides on Earth, creating high and low tides daily. "
            "In 1969, Neil Armstrong became the first human to walk on the Moon during Apollo 11."
        ),
        "electricity": (
            "Electricity is the flow of tiny particles called electrons through a conductor. "
            "It is a form of energy that powers everything from light bulbs to smartphones. "
            "There are two types of electricity: static electricity and current electricity. "
            "Current electricity flows through circuits made of conductors like copper wire. "
            "Voltage pushes electrons, current measures their flow, and resistance slows them down. "
            "Electricity can be generated from solar panels, wind turbines, and hydroelectric dams."
        ),
        "dinosaur": (
            "Dinosaurs were incredible reptiles that ruled the Earth for over 160 million years. "
            "They first appeared about 230 million years ago during the Triassic period. "
            "The largest dinosaur, Argentinosaurus, was over 30 meters long and weighed 70 tons. "
            "The fearsome Tyrannosaurus Rex had teeth as long as bananas and a massive bite force. "
            "Dinosaurs went extinct about 66 million years ago when a huge asteroid hit Earth. "
            "Birds are actually living dinosaurs, as they evolved from small feathered dinosaurs."
        ),
        "ocean": (
            "Oceans cover about 71 percent of Earth's surface and contain 97 percent of all water. "
            "There are five major oceans: Pacific, Atlantic, Indian, Southern, and Arctic. "
            "The Pacific Ocean is the largest and deepest, covering more area than all land combined. "
            "The deepest point is the Mariana Trench at nearly 11,000 meters below sea level. "
            "Oceans are home to millions of species, from tiny plankton to the massive blue whale. "
            "They regulate our climate, produce over half the world's oxygen, and absorb carbon dioxide."
        ),
        "dna": (
            "DNA stands for deoxyribonucleic acid, and it contains the instructions for life. "
            "It has a famous double helix shape, like a twisted ladder, discovered by Watson and Crick. "
            "DNA is made of four chemical bases: Adenine, Thymine, Guanine, and Cytosine. "
            "The human genome contains about 3 billion base pairs and around 20,000 genes. "
            "Every cell in your body contains the same DNA, yet cells become different types. "
            "DNA is passed from parents to children, which is why family members look alike."
        ),
        "computer": (
            "A computer is an electronic device that processes information at incredible speeds. "
            "Modern computers have four main parts: input, processing, memory, and output. "
            "The CPU is the brain of the computer, performing billions of calculations per second. "
            "Computers understand only binary code, which uses just two digits: zero and one. "
            "RAM is temporary fast memory, while hard drives store data permanently. "
            "From smartphones to supercomputers, these machines have transformed how we live and learn."
        ),
    }

    # Check for matching topic
    for topic, content in topics.items():
        if topic in question_lower:
            return content

    # Generic response — try harder to give useful content based on keywords
    q_clean = question_lower.replace("what is", "").replace("what are", "").replace("how does", "").replace("how do", "").replace("why is", "").replace("why do", "").replace("explain", "").replace("describe", "").replace("tell me about", "").strip()
    subject = q_clean if q_clean else question
    return (
        f"{subject.capitalize()} is a fascinating subject worth understanding in detail. "
        f"To answer the question — {question} — we need to look at the core facts. "
        f"{subject.capitalize()} involves specific principles, processes, or characteristics that define it. "
        f"Scientists and researchers have studied {subject} extensively to understand how it works. "
        f"The most important thing to know is that {subject} plays a significant role in its field. "
        f"Understanding {subject} helps us connect it to broader concepts in science, history, or everyday life. "
        f"Keep exploring and researching {subject} to deepen your knowledge!"
    )


async def generate_video_script(question: str) -> str:
    """
    Generate an educational video script from a question.
    Priority: Ollama → Pollinations.ai → hardcoded fallback.
    """
    prompt = SCRIPT_USER_PROMPT_TEMPLATE.format(question=question)

    # 1. Try Ollama (local LLM)
    if await check_ollama_available():
        script = await generate_with_ollama(prompt, SCRIPT_SYSTEM_PROMPT)
        if script and len(script) > 50:
            logger.info("Script generated via Ollama")
            return script

    # 2. Try Pollinations.ai (free online LLM, no API key)
    logger.info("Ollama unavailable, trying Pollinations.ai text API...")
    script = await generate_with_pollinations(prompt, SCRIPT_SYSTEM_PROMPT)
    if script and len(script) > 50:
        logger.info("Script generated via Pollinations.ai")
        return script

    # 3. Last resort: hardcoded fallback
    logger.info("Using hardcoded fallback script generation")
    return fallback_generate_script(question)


async def extract_questions_from_text(text: str, num_questions: int = 5) -> List[str]:
    """Extract educational questions from document text."""
    system_prompt = (
        "You are an educational assistant. Extract or generate important questions from the given text. "
        "Questions should be suitable for school students (grades 5-10). "
        "Return ONLY a JSON array of question strings, nothing else. "
        "Example: [\"What is photosynthesis?\", \"How do plants make food?\"]"
    )

    prompt = f"Extract {num_questions} important educational questions from this text:\n\n{text[:2000]}"

    # Try Ollama first, then Pollinations
    result = ""
    if await check_ollama_available():
        result = await generate_with_ollama(prompt, system_prompt)

    if not result:
        logger.info("Trying Pollinations.ai for question extraction...")
        result = await generate_with_pollinations(prompt, system_prompt)

    if result:
        try:
            # Try to parse as JSON array
            questions = json.loads(result)
            if isinstance(questions, list):
                return [q for q in questions if isinstance(q, str)][:num_questions]
        except json.JSONDecodeError:
            # Try to extract questions line by line
            lines = result.strip().split("\n")
            questions = []
            for line in lines:
                line = line.strip().lstrip("0123456789.-) ")
                if line and "?" in line:
                    questions.append(line)
            if questions:
                return questions[:num_questions]

    # Fallback: generate generic questions from text
    logger.info("Using fallback question extraction")
    words = text.split()
    sentences = text.replace("!", ".").replace("?", ".").split(".")
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

    questions = []
    if sentences:
        questions.append(f"What is the main topic discussed in this text?")
        if len(sentences) > 1:
            questions.append(f"Can you explain the key concept: {sentences[0][:60]}?")
        if len(sentences) > 2:
            questions.append(f"Why is {sentences[1][:40]} important?")
        questions.append("What are the main points covered in this material?")
        questions.append("How would you summarize this content in your own words?")

    return questions[:num_questions]
