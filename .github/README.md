# Car Dealership Inventory System (TDD Kata)

This project is a full-stack Car Dealership Inventory System built with a React/Tailwind CSS frontend, a Python FastAPI backend, and an isolated SQLite database.

## Project Setup
*(Add your installation and startup commands here, like `pip install...` and `npm start`)*

* **Step-1** go to backend folder or open it into cmd
then,activate the virtual enviroment and after run the test case using the "pytest filename.py"
after the test case run the backend using this below given command,
**uvicorn main:app --reload --port 8000**

* **Step-2** go to frontend folder or open it into the cmd
then, run the frontend using the below given command
**npm start**

* **step-3** there is predefined admin in the system
login into admin panel using the below given admin details
email: admin@dealership.com
password: admin123

---

## My AI Usage

### 🛠️ AI Tools Used
* **Gemini (Google AI)** - Used as the primary architectural collaborator, backend engineer, and debugger throughout the development lifecycle.

### 📝 How AI Was Utilized
* **Architecture Design:** I used Gemini to map out the system requirements from the Kata prompt, translating the physical system rules into distinct User roles and predefined hardcoded Admin structures.
* **Backend Development:** Gemini generated the initial FastAPI database schemas, configured the persistent SQLite storage layer, and implemented the token-based JWT route guards.
* **Debugging & Optimization:** When encountering a `405 Method Not Allowed` on vehicle edits and a `404 Not Found` during the vehicle restock phase, I used Gemini to isolate routing strictness issues regarding trailing slashes and parameter mismatches in FastAPI.
* **TDD & Testing Layer:** Gemini built a robust, comprehensive `pytest` suite covering edge cases for successful/failed stock checkouts, validation checks, and role access restrictions.

### 💭 Reflection on Workflow Impact
Integrating AI significantly accelerated my productivity. Instead of spending hours boilerplate-mapping the REST endpoints and configuring SQLite parameters manually, the AI provided structurally sound scaffolding instantly. This allowed me to focus heavily on the TDD workflow—analyzing failing test cases, understanding route strictness errors, and ensuring that user flows perfectly matched the constraints of the Kata document. It transformed the development process from tedious structural setup to high-level system design and rigorous validation.