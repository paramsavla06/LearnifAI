/**
 * Module 1 — Concept Knowledge Graph
 * Mumbai University Engineering — All Major Branches
 * ~130 concepts, ~200 prerequisite edges, valid DAG (no cycles)
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DB_PATH = path.join(__dirname, 'knowledge_graph.db');

// ─── SCHEMA ────────────────────────────────────────────────────────────────────
const SCHEMA = `
CREATE TABLE IF NOT EXISTS subjects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS concepts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id      INTEGER NOT NULL REFERENCES subjects(id),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    description     TEXT,
    difficulty      INTEGER DEFAULT 1,
    semester        TEXT,
    library_section TEXT,
    shelf_number    TEXT,
    book_title      TEXT,
    book_isbn       TEXT
);

CREATE TABLE IF NOT EXISTS prerequisites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    concept_id      INTEGER NOT NULL REFERENCES concepts(id),
    prerequisite_id INTEGER NOT NULL REFERENCES concepts(id),
    strength        TEXT DEFAULT 'required',
    UNIQUE(concept_id, prerequisite_id)
);

CREATE TABLE IF NOT EXISTS mastery (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id  TEXT NOT NULL,
    concept_id  INTEGER NOT NULL REFERENCES concepts(id),
    score       REAL DEFAULT 0.0,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, concept_id)
);
`;

// ─── SEED SUBJECTS ─────────────────────────────────────────────────────────────
const SEED_SUBJECTS = [
  { name: 'Mathematics',            description: 'FE/SE Engineering Mathematics (MU common)' },
  { name: 'Electronics',            description: 'Electronics & EXTC branch core' },
  { name: 'CSE-DS',                 description: 'Computer Science with Data Science specialisation' },
  { name: 'Computer Science',       description: 'Computer Engineering branch (MU)' },
  { name: 'Information Technology', description: 'IT branch (MU)' },
  { name: 'Civil Engineering',      description: 'Civil Engineering branch (MU)' },
  { name: 'Mechanical Engineering', description: 'Mechanical Engineering branch (MU)' },
  { name: 'Electrical Engineering', description: 'Electrical Engineering branch (MU)' },
];

// ─── SEED CONCEPTS ─────────────────────────────────────────────────────────────
const SEED_CONCEPTS = [
  // MATHEMATICS
  {subject:"Mathematics",name:"Arithmetic & Number Systems",slug:"arithmetic",difficulty:1,semester:"FE SEM 1",section:"Section A",shelf:"Shelf 1",book:"Elementary Mathematics",isbn:"978-81-000-0001-0"},
  {subject:"Mathematics",name:"Basic Algebra",slug:"basic-algebra",difficulty:1,semester:"FE SEM 1",section:"Section A",shelf:"Shelf 1",book:"Algebra Basics",isbn:"978-81-000-0002-0"},
  {subject:"Mathematics",name:"Trigonometry",slug:"trigonometry",difficulty:2,semester:"FE SEM 1",section:"Section A",shelf:"Shelf 2",book:"Trigonometry Unlocked",isbn:"978-81-000-0003-0"},
  {subject:"Mathematics",name:"Complex Numbers",slug:"complex-numbers",difficulty:2,semester:"FE SEM 1",section:"Section A",shelf:"Shelf 2",book:"Complex Analysis Intro",isbn:"978-81-000-0004-0"},
  {subject:"Mathematics",name:"Matrices & Determinants",slug:"matrices-determinants",difficulty:2,semester:"FE SEM 1",section:"Section A",shelf:"Shelf 3",book:"Engineering Maths Vol 1 (Grewal)",isbn:"978-81-000-0005-0"},
  {subject:"Mathematics",name:"Differential Calculus",slug:"differential-calculus",difficulty:3,semester:"FE SEM 1",section:"Section A",shelf:"Shelf 3",book:"Calculus (Thomas & Finney)",isbn:"978-81-000-0006-0"},
  {subject:"Mathematics",name:"Integral Calculus",slug:"integral-calculus",difficulty:3,semester:"FE SEM 2",section:"Section A",shelf:"Shelf 4",book:"Integral Calculus (Gorakh Prasad)",isbn:"978-81-000-0007-0"},
  {subject:"Mathematics",name:"Vector Calculus",slug:"vector-calculus",difficulty:3,semester:"FE SEM 2",section:"Section A",shelf:"Shelf 4",book:"Vector Analysis (Spiegel)",isbn:"978-81-000-0008-0"},
  {subject:"Mathematics",name:"Linear Algebra",slug:"linear-algebra",difficulty:3,semester:"SE SEM 3",section:"Section B",shelf:"Shelf 1",book:"Linear Algebra (Gilbert Strang)",isbn:"978-81-000-0009-0"},
  {subject:"Mathematics",name:"Ordinary Differential Equations",slug:"ode",difficulty:3,semester:"SE SEM 3",section:"Section B",shelf:"Shelf 1",book:"ODE (Tenenbaum & Pollard)",isbn:"978-81-000-0010-0"},
  {subject:"Mathematics",name:"Probability & Statistics",slug:"probability-statistics",difficulty:3,semester:"SE SEM 3",section:"Section B",shelf:"Shelf 2",book:"Probability & Statistics (Walpole)",isbn:"978-81-000-0011-0"},
  {subject:"Mathematics",name:"Laplace Transform",slug:"laplace-transform",difficulty:4,semester:"SE SEM 4",section:"Section B",shelf:"Shelf 2",book:"Higher Engg Maths (Grewal)",isbn:"978-81-000-0012-0"},
  {subject:"Mathematics",name:"Fourier Series & Transform",slug:"fourier-series",difficulty:4,semester:"SE SEM 4",section:"Section B",shelf:"Shelf 3",book:"Fourier Series & Integrals",isbn:"978-81-000-0013-0"},
  {subject:"Mathematics",name:"Numerical Methods",slug:"numerical-methods",difficulty:3,semester:"SE SEM 4",section:"Section B",shelf:"Shelf 3",book:"Numerical Methods (S.S. Sastry)",isbn:"978-81-000-0014-0"},
  {subject:"Mathematics",name:"Graph Theory",slug:"graph-theory",difficulty:3,semester:"TE SEM 5",section:"Section B",shelf:"Shelf 4",book:"Graph Theory (Narsingh Deo)",isbn:"978-81-000-0015-0"},
  {subject:"Mathematics",name:"Optimization Techniques",slug:"optimization-techniques",difficulty:4,semester:"TE SEM 5",section:"Section B",shelf:"Shelf 4",book:"Operations Research (Taha)",isbn:"978-81-000-0016-0"},

  // ELECTRONICS
  {subject:"Electronics",name:"Charge, Current & Voltage",slug:"charge-current-voltage",difficulty:1,semester:"FE SEM 1",section:"Section C",shelf:"Shelf 1",book:"Fundamentals of Electric Circuits (Alexander)",isbn:"978-81-000-0020-0"},
  {subject:"Electronics",name:"Ohm's Law & Power",slug:"ohms-law",difficulty:1,semester:"FE SEM 1",section:"Section C",shelf:"Shelf 1",book:"Introductory Circuit Analysis (Boylestad)",isbn:"978-81-000-0021-0"},
  {subject:"Electronics",name:"Kirchhoff's Laws",slug:"kirchhoffs-laws",difficulty:2,semester:"FE SEM 2",section:"Section C",shelf:"Shelf 2",book:"Introductory Circuit Analysis (Boylestad)",isbn:"978-81-000-0021-0"},
  {subject:"Electronics",name:"DC Circuit Analysis",slug:"dc-circuit-analysis",difficulty:2,semester:"SE SEM 3",section:"Section C",shelf:"Shelf 2",book:"Electric Circuits (Nilsson & Riedel)",isbn:"978-81-000-0022-0"},
  {subject:"Electronics",name:"Phasor Analysis",slug:"phasor-analysis",difficulty:3,semester:"SE SEM 3",section:"Section C",shelf:"Shelf 3",book:"AC Circuit Analysis (Franklin)",isbn:"978-81-000-0023-0"},
  {subject:"Electronics",name:"AC Circuit Analysis",slug:"ac-circuit-analysis",difficulty:3,semester:"SE SEM 3",section:"Section C",shelf:"Shelf 3",book:"AC Circuit Analysis (Franklin)",isbn:"978-81-000-0023-0"},
  {subject:"Electronics",name:"Diodes & Rectifiers",slug:"diodes-rectifiers",difficulty:2,semester:"SE SEM 3",section:"Section C",shelf:"Shelf 4",book:"Electronic Devices (Floyd)",isbn:"978-81-000-0024-0"},
  {subject:"Electronics",name:"BJT Transistors",slug:"bjt-transistors",difficulty:3,semester:"SE SEM 4",section:"Section C",shelf:"Shelf 4",book:"Electronic Devices (Floyd)",isbn:"978-81-000-0024-0"},
  {subject:"Electronics",name:"FET & MOSFET",slug:"fet-mosfet",difficulty:3,semester:"SE SEM 4",section:"Section D",shelf:"Shelf 1",book:"Microelectronics (Sedra & Smith)",isbn:"978-81-000-0025-0"},
  {subject:"Electronics",name:"Op-Amp Fundamentals",slug:"opamp-fundamentals",difficulty:3,semester:"TE SEM 5",section:"Section D",shelf:"Shelf 1",book:"Op-Amp & Linear ICs (Gayakwad)",isbn:"978-81-000-0026-0"},
  {subject:"Electronics",name:"Op-Amp Applications",slug:"opamp-applications",difficulty:4,semester:"TE SEM 5",section:"Section D",shelf:"Shelf 2",book:"Op-Amp & Linear ICs (Gayakwad)",isbn:"978-81-000-0026-0"},
  {subject:"Electronics",name:"Active Filter Design",slug:"active-filter-design",difficulty:4,semester:"TE SEM 5",section:"Section D",shelf:"Shelf 2",book:"Active Filter Design (Wai-Kai Chen)",isbn:"978-81-000-0027-0"},
  {subject:"Electronics",name:"Signals & Systems",slug:"signals-systems",difficulty:4,semester:"TE SEM 5",section:"Section D",shelf:"Shelf 3",book:"Signals & Systems (Oppenheim)",isbn:"978-81-000-0028-0"},
  {subject:"Electronics",name:"Digital Logic Design",slug:"digital-logic",difficulty:2,semester:"SE SEM 3",section:"Section D",shelf:"Shelf 3",book:"Digital Design (Morris Mano)",isbn:"978-81-000-0029-0"},
  {subject:"Electronics",name:"Microcontrollers (8051/ARM)",slug:"microcontrollers",difficulty:3,semester:"TE SEM 5",section:"Section D",shelf:"Shelf 4",book:"The 8051 Microcontroller (Mazidi)",isbn:"978-81-000-0030-0"},
  {subject:"Electronics",name:"VCO Design",slug:"vco-design",difficulty:4,semester:"TE SEM 6",section:"Section D",shelf:"Shelf 4",book:"RF Circuit Design (Ludwig)",isbn:"978-81-000-0031-0"},
  {subject:"Electronics",name:"PLL Design (IC 565)",slug:"pll-design",difficulty:5,semester:"TE SEM 6",section:"Section E",shelf:"Shelf 1",book:"Phase-Locked Loops (Best)",isbn:"978-81-000-0032-0"},
  {subject:"Electronics",name:"ADC & DAC",slug:"adc-dac",difficulty:4,semester:"TE SEM 6",section:"Section E",shelf:"Shelf 1",book:"Mixed-Signal Design (Razavi)",isbn:"978-81-000-0033-0"},
  {subject:"Electronics",name:"Mixed-Signal ICs",slug:"mixed-signal-ics",difficulty:5,semester:"BE SEM 7",section:"Section E",shelf:"Shelf 2",book:"CMOS Mixed-Signal Circuit Design (Baker)",isbn:"978-81-000-0034-0"},
  {subject:"Electronics",name:"Communication Systems",slug:"communication-systems",difficulty:4,semester:"TE SEM 6",section:"Section E",shelf:"Shelf 2",book:"Communication Systems (Haykin)",isbn:"978-81-000-0035-0"},
  {subject:"Electronics",name:"Antenna & Wave Propagation",slug:"antenna-wave",difficulty:4,semester:"BE SEM 7",section:"Section E",shelf:"Shelf 3",book:"Antenna Theory (Balanis)",isbn:"978-81-000-0036-0"},

  // CSE-DS
  {subject:"CSE-DS",name:"Programming in Python",slug:"python-programming",difficulty:1,semester:"FE SEM 1",section:"Section F",shelf:"Shelf 1",book:"Automate the Boring Stuff with Python",isbn:"978-81-000-0040-0"},
  {subject:"CSE-DS",name:"Data Structures",slug:"ds-data-structures",difficulty:2,semester:"SE SEM 3",section:"Section F",shelf:"Shelf 1",book:"Data Structures (Lipschutz)",isbn:"978-81-000-0041-0"},
  {subject:"CSE-DS",name:"Database Management Systems",slug:"dbms",difficulty:2,semester:"SE SEM 4",section:"Section F",shelf:"Shelf 2",book:"DBMS (Ramakrishnan & Gehrke)",isbn:"978-81-000-0042-0"},
  {subject:"CSE-DS",name:"SQL & Relational Databases",slug:"sql-databases",difficulty:2,semester:"SE SEM 4",section:"Section F",shelf:"Shelf 2",book:"Learning SQL (Alan Beaulieu)",isbn:"978-81-000-0043-0"},
  {subject:"CSE-DS",name:"NoSQL Databases",slug:"nosql-databases",difficulty:3,semester:"TE SEM 5",section:"Section F",shelf:"Shelf 3",book:"NoSQL Distilled (Fowler)",isbn:"978-81-000-0044-0"},
  {subject:"CSE-DS",name:"Statistics for Data Science",slug:"stats-ds",difficulty:2,semester:"SE SEM 3",section:"Section F",shelf:"Shelf 3",book:"Statistics (Walpole, Myers)",isbn:"978-81-000-0045-0"},
  {subject:"CSE-DS",name:"Linear Regression",slug:"linear-regression",difficulty:2,semester:"TE SEM 5",section:"Section F",shelf:"Shelf 4",book:"An Introduction to Statistical Learning",isbn:"978-81-000-0046-0"},
  {subject:"CSE-DS",name:"Machine Learning Fundamentals",slug:"ml-fundamentals",difficulty:3,semester:"TE SEM 5",section:"Section F",shelf:"Shelf 4",book:"Hands-On ML (Aurélien Géron)",isbn:"978-81-000-0047-0"},
  {subject:"CSE-DS",name:"Supervised Learning Algorithms",slug:"supervised-learning",difficulty:3,semester:"TE SEM 5",section:"Section G",shelf:"Shelf 1",book:"Pattern Recognition (Bishop)",isbn:"978-81-000-0048-0"},
  {subject:"CSE-DS",name:"Unsupervised Learning & Clustering",slug:"unsupervised-learning",difficulty:3,semester:"TE SEM 6",section:"Section G",shelf:"Shelf 1",book:"Pattern Recognition (Bishop)",isbn:"978-81-000-0048-0"},
  {subject:"CSE-DS",name:"Deep Learning & Neural Networks",slug:"deep-learning",difficulty:4,semester:"TE SEM 6",section:"Section G",shelf:"Shelf 2",book:"Deep Learning (Goodfellow)",isbn:"978-81-000-0049-0"},
  {subject:"CSE-DS",name:"Natural Language Processing",slug:"nlp",difficulty:4,semester:"BE SEM 7",section:"Section G",shelf:"Shelf 2",book:"Speech & Language Processing (Jurafsky)",isbn:"978-81-000-0050-0"},
  {subject:"CSE-DS",name:"Computer Vision",slug:"computer-vision",difficulty:4,semester:"BE SEM 7",section:"Section G",shelf:"Shelf 3",book:"Computer Vision (Szeliski)",isbn:"978-81-000-0051-0"},
  {subject:"CSE-DS",name:"Big Data Technologies (Hadoop/Spark)",slug:"big-data",difficulty:4,semester:"BE SEM 7",section:"Section G",shelf:"Shelf 3",book:"Learning Spark (Zaharia)",isbn:"978-81-000-0052-0"},
  {subject:"CSE-DS",name:"Data Visualization",slug:"data-visualization",difficulty:2,semester:"TE SEM 5",section:"Section G",shelf:"Shelf 4",book:"Storytelling with Data (Knaflic)",isbn:"978-81-000-0053-0"},
  {subject:"CSE-DS",name:"MLOps & Model Deployment",slug:"mlops",difficulty:4,semester:"BE SEM 8",section:"Section G",shelf:"Shelf 4",book:"Designing ML Systems (Chip Huyen)",isbn:"978-81-000-0054-0"},

  // COMPUTER SCIENCE
  {subject:"Computer Science",name:"C Programming",slug:"c-programming",difficulty:1,semester:"FE SEM 1",section:"Section H",shelf:"Shelf 1",book:"Let Us C (Kanetkar)",isbn:"978-81-000-0060-0"},
  {subject:"Computer Science",name:"Object-Oriented Programming",slug:"oop",difficulty:2,semester:"SE SEM 3",section:"Section H",shelf:"Shelf 1",book:"OOP with C++ (Balaguruswamy)",isbn:"978-81-000-0061-0"},
  {subject:"Computer Science",name:"Data Structures & Algorithms",slug:"dsa",difficulty:2,semester:"SE SEM 3",section:"Section H",shelf:"Shelf 2",book:"Introduction to Algorithms (CLRS)",isbn:"978-81-000-0062-0"},
  {subject:"Computer Science",name:"Algorithm Design & Analysis",slug:"algorithm-design",difficulty:3,semester:"SE SEM 4",section:"Section H",shelf:"Shelf 2",book:"Algorithm Design (Kleinberg)",isbn:"978-81-000-0063-0"},
  {subject:"Computer Science",name:"Operating Systems",slug:"operating-systems",difficulty:3,semester:"SE SEM 4",section:"Section H",shelf:"Shelf 3",book:"Operating System Concepts (Silberschatz)",isbn:"978-81-000-0064-0"},
  {subject:"Computer Science",name:"Computer Networks",slug:"computer-networks",difficulty:3,semester:"TE SEM 5",section:"Section H",shelf:"Shelf 3",book:"Computer Networks (Tanenbaum)",isbn:"978-81-000-0065-0"},
  {subject:"Computer Science",name:"Database Systems",slug:"database-systems",difficulty:3,semester:"TE SEM 5",section:"Section H",shelf:"Shelf 4",book:"DBMS (Ramakrishnan)",isbn:"978-81-000-0066-0"},
  {subject:"Computer Science",name:"Software Engineering",slug:"software-engineering",difficulty:3,semester:"TE SEM 5",section:"Section H",shelf:"Shelf 4",book:"Software Engineering (Pressman)",isbn:"978-81-000-0067-0"},
  {subject:"Computer Science",name:"Theory of Computation",slug:"theory-of-computation",difficulty:4,semester:"TE SEM 5",section:"Section I",shelf:"Shelf 1",book:"Introduction to Theory of Computation (Sipser)",isbn:"978-81-000-0068-0"},
  {subject:"Computer Science",name:"Compiler Design",slug:"compiler-design",difficulty:4,semester:"TE SEM 6",section:"Section I",shelf:"Shelf 1",book:"Compilers — Dragon Book (Aho)",isbn:"978-81-000-0069-0"},
  {subject:"Computer Science",name:"Distributed Systems",slug:"distributed-systems",difficulty:4,semester:"BE SEM 7",section:"Section I",shelf:"Shelf 2",book:"Distributed Systems (Tanenbaum)",isbn:"978-81-000-0070-0"},
  {subject:"Computer Science",name:"Cyber Security & Cryptography",slug:"cybersecurity",difficulty:4,semester:"BE SEM 7",section:"Section I",shelf:"Shelf 2",book:"Cryptography & Network Security (Stallings)",isbn:"978-81-000-0071-0"},
  {subject:"Computer Science",name:"Cloud Computing",slug:"cloud-computing",difficulty:4,semester:"BE SEM 7",section:"Section I",shelf:"Shelf 3",book:"Cloud Computing (Buyya)",isbn:"978-81-000-0072-0"},
  {subject:"Computer Science",name:"Artificial Intelligence",slug:"ai-fundamentals",difficulty:4,semester:"BE SEM 7",section:"Section I",shelf:"Shelf 3",book:"AI — A Modern Approach (Russell & Norvig)",isbn:"978-81-000-0073-0"},

  // IT
  {subject:"Information Technology",name:"Web Technology (HTML/CSS/JS)",slug:"web-technology",difficulty:1,semester:"SE SEM 3",section:"Section J",shelf:"Shelf 1",book:"HTML & CSS (Jon Duckett)",isbn:"978-81-000-0080-0"},
  {subject:"Information Technology",name:"Java Programming",slug:"java-programming",difficulty:2,semester:"SE SEM 3",section:"Section J",shelf:"Shelf 1",book:"Java — The Complete Reference (Schildt)",isbn:"978-81-000-0081-0"},
  {subject:"Information Technology",name:"Advanced Java (J2EE/Spring)",slug:"advanced-java",difficulty:3,semester:"TE SEM 5",section:"Section J",shelf:"Shelf 2",book:"Spring in Action (Walls)",isbn:"978-81-000-0082-0"},
  {subject:"Information Technology",name:"Network Security",slug:"network-security",difficulty:3,semester:"TE SEM 5",section:"Section J",shelf:"Shelf 2",book:"Network Security Essentials (Stallings)",isbn:"978-81-000-0083-0"},
  {subject:"Information Technology",name:"Software Project Management",slug:"software-project-mgmt",difficulty:3,semester:"TE SEM 6",section:"Section J",shelf:"Shelf 3",book:"Software Project Management (Hughes)",isbn:"978-81-000-0084-0"},
  {subject:"Information Technology",name:"Enterprise Resource Planning",slug:"erp",difficulty:3,semester:"TE SEM 6",section:"Section J",shelf:"Shelf 3",book:"ERP Demystified (Alexis Leon)",isbn:"978-81-000-0085-0"},
  {subject:"Information Technology",name:"Mobile Application Development",slug:"mobile-app-dev",difficulty:3,semester:"BE SEM 7",section:"Section J",shelf:"Shelf 4",book:"Android Programming (Bill Phillips)",isbn:"978-81-000-0086-0"},
  {subject:"Information Technology",name:"Internet of Things",slug:"iot",difficulty:3,semester:"BE SEM 7",section:"Section J",shelf:"Shelf 4",book:"IoT — A Hands-On Approach (Bahga)",isbn:"978-81-000-0087-0"},
  {subject:"Information Technology",name:"Business Intelligence & Analytics",slug:"business-intelligence",difficulty:4,semester:"BE SEM 8",section:"Section K",shelf:"Shelf 1",book:"Business Intelligence (Turban)",isbn:"978-81-000-0088-0"},
  {subject:"Information Technology",name:"Blockchain Technology",slug:"blockchain",difficulty:4,semester:"BE SEM 8",section:"Section K",shelf:"Shelf 1",book:"Mastering Blockchain (Bashir)",isbn:"978-81-000-0089-0"},

  // CIVIL
  {subject:"Civil Engineering",name:"Engineering Mechanics (Statics)",slug:"engineering-mechanics",difficulty:2,semester:"FE SEM 1",section:"Section L",shelf:"Shelf 1",book:"Engineering Mechanics (Beer & Johnston)",isbn:"978-81-000-0090-0"},
  {subject:"Civil Engineering",name:"Strength of Materials",slug:"strength-of-materials",difficulty:3,semester:"SE SEM 3",section:"Section L",shelf:"Shelf 1",book:"Strength of Materials (Sadhu Singh)",isbn:"978-81-000-0091-0"},
  {subject:"Civil Engineering",name:"Structural Analysis I",slug:"structural-analysis-1",difficulty:3,semester:"SE SEM 4",section:"Section L",shelf:"Shelf 2",book:"Structural Analysis (Bhavikatti)",isbn:"978-81-000-0092-0"},
  {subject:"Civil Engineering",name:"Structural Analysis II",slug:"structural-analysis-2",difficulty:4,semester:"TE SEM 5",section:"Section L",shelf:"Shelf 2",book:"Structural Analysis (Bhavikatti)",isbn:"978-81-000-0092-0"},
  {subject:"Civil Engineering",name:"Fluid Mechanics",slug:"fluid-mechanics",difficulty:3,semester:"SE SEM 3",section:"Section L",shelf:"Shelf 3",book:"Fluid Mechanics (Modi & Seth)",isbn:"978-81-000-0093-0"},
  {subject:"Civil Engineering",name:"Hydraulics & Hydraulic Machines",slug:"hydraulics",difficulty:3,semester:"SE SEM 4",section:"Section L",shelf:"Shelf 3",book:"Hydraulics (R.K. Bansal)",isbn:"978-81-000-0094-0"},
  {subject:"Civil Engineering",name:"Soil Mechanics & Geotechnics",slug:"soil-mechanics",difficulty:3,semester:"TE SEM 5",section:"Section L",shelf:"Shelf 4",book:"Soil Mechanics (Arora)",isbn:"978-81-000-0095-0"},
  {subject:"Civil Engineering",name:"Foundation Engineering",slug:"foundation-engineering",difficulty:4,semester:"TE SEM 6",section:"Section L",shelf:"Shelf 4",book:"Foundation Engineering (Varghese)",isbn:"978-81-000-0096-0"},
  {subject:"Civil Engineering",name:"Concrete Technology",slug:"concrete-technology",difficulty:2,semester:"SE SEM 3",section:"Section M",shelf:"Shelf 1",book:"Concrete Technology (Gambhir)",isbn:"978-81-000-0097-0"},
  {subject:"Civil Engineering",name:"RCC Design",slug:"rcc-design",difficulty:4,semester:"TE SEM 5",section:"Section M",shelf:"Shelf 1",book:"Limit State Design of RCC (Pillai & Menon)",isbn:"978-81-000-0098-0"},
  {subject:"Civil Engineering",name:"Steel Structure Design",slug:"steel-structure-design",difficulty:4,semester:"TE SEM 6",section:"Section M",shelf:"Shelf 2",book:"Design of Steel Structures (Duggal)",isbn:"978-81-000-0099-0"},
  {subject:"Civil Engineering",name:"Surveying",slug:"surveying",difficulty:2,semester:"SE SEM 3",section:"Section M",shelf:"Shelf 2",book:"Surveying (B.C. Punmia)",isbn:"978-81-000-0100-0"},
  {subject:"Civil Engineering",name:"Transportation Engineering",slug:"transportation-engg",difficulty:3,semester:"TE SEM 6",section:"Section M",shelf:"Shelf 3",book:"Transportation Engineering (L.R. Kadiyali)",isbn:"978-81-000-0101-0"},
  {subject:"Civil Engineering",name:"Environmental Engineering",slug:"environmental-engg",difficulty:3,semester:"TE SEM 6",section:"Section M",shelf:"Shelf 3",book:"Environmental Engineering (Peavy)",isbn:"978-81-000-0102-0"},
  {subject:"Civil Engineering",name:"GIS & Remote Sensing",slug:"gis-remote-sensing",difficulty:3,semester:"BE SEM 7",section:"Section M",shelf:"Shelf 4",book:"Remote Sensing & GIS (Anji Reddy)",isbn:"978-81-000-0103-0"},

  // MECHANICAL
  {subject:"Mechanical Engineering",name:"Engineering Drawing",slug:"engineering-drawing",difficulty:1,semester:"FE SEM 1",section:"Section N",shelf:"Shelf 1",book:"Engineering Drawing (N.D. Bhatt)",isbn:"978-81-000-0110-0"},
  {subject:"Mechanical Engineering",name:"Engineering Mechanics",slug:"mech-engg-mechanics",difficulty:2,semester:"FE SEM 1",section:"Section N",shelf:"Shelf 1",book:"Engineering Mechanics (Beer & Johnston)",isbn:"978-81-000-0111-0"},
  {subject:"Mechanical Engineering",name:"Thermodynamics",slug:"thermodynamics",difficulty:3,semester:"SE SEM 3",section:"Section N",shelf:"Shelf 2",book:"Engineering Thermodynamics (P.K. Nag)",isbn:"978-81-000-0112-0"},
  {subject:"Mechanical Engineering",name:"Fluid Mechanics & Machinery",slug:"mech-fluid-mechanics",difficulty:3,semester:"SE SEM 4",section:"Section N",shelf:"Shelf 2",book:"Fluid Mechanics (R.K. Bansal)",isbn:"978-81-000-0113-0"},
  {subject:"Mechanical Engineering",name:"Manufacturing Processes",slug:"manufacturing-processes",difficulty:2,semester:"SE SEM 3",section:"Section N",shelf:"Shelf 3",book:"Manufacturing Engineering (Kalpakjian)",isbn:"978-81-000-0114-0"},
  {subject:"Mechanical Engineering",name:"Theory of Machines",slug:"theory-of-machines",difficulty:3,semester:"SE SEM 4",section:"Section N",shelf:"Shelf 3",book:"Theory of Machines (Rattan)",isbn:"978-81-000-0115-0"},
  {subject:"Mechanical Engineering",name:"Machine Design",slug:"machine-design",difficulty:4,semester:"TE SEM 5",section:"Section N",shelf:"Shelf 4",book:"Machine Design (Shigley)",isbn:"978-81-000-0116-0"},
  {subject:"Mechanical Engineering",name:"Heat Transfer",slug:"heat-transfer",difficulty:3,semester:"TE SEM 5",section:"Section N",shelf:"Shelf 4",book:"Heat Transfer (Cengel)",isbn:"978-81-000-0117-0"},
  {subject:"Mechanical Engineering",name:"Refrigeration & Air Conditioning",slug:"refrigeration-ac",difficulty:3,semester:"TE SEM 6",section:"Section O",shelf:"Shelf 1",book:"Refrigeration & AC (Stoecker)",isbn:"978-81-000-0118-0"},
  {subject:"Mechanical Engineering",name:"Industrial Engineering & Mgmt",slug:"industrial-engg-mgmt",difficulty:3,semester:"TE SEM 6",section:"Section O",shelf:"Shelf 1",book:"Industrial Engineering (O.P. Khanna)",isbn:"978-81-000-0119-0"},
  {subject:"Mechanical Engineering",name:"Finite Element Analysis",slug:"finite-element-analysis",difficulty:4,semester:"BE SEM 7",section:"Section O",shelf:"Shelf 2",book:"Finite Element Analysis (Chandrupatla)",isbn:"978-81-000-0120-0"},
  {subject:"Mechanical Engineering",name:"CAD/CAM",slug:"cad-cam",difficulty:3,semester:"TE SEM 6",section:"Section O",shelf:"Shelf 2",book:"CAD/CAM (P.N. Rao)",isbn:"978-81-000-0121-0"},
  {subject:"Mechanical Engineering",name:"Mechatronics",slug:"mechatronics",difficulty:4,semester:"BE SEM 7",section:"Section O",shelf:"Shelf 3",book:"Mechatronics (Mahalik)",isbn:"978-81-000-0122-0"},

  // ELECTRICAL
  {subject:"Electrical Engineering",name:"Basic Electrical Engineering",slug:"basic-electrical-engg",difficulty:1,semester:"FE SEM 1",section:"Section P",shelf:"Shelf 1",book:"Basic Electrical Engineering (Kothari & Nagrath)",isbn:"978-81-000-0130-0"},
  {subject:"Electrical Engineering",name:"Circuit Theory",slug:"circuit-theory",difficulty:2,semester:"SE SEM 3",section:"Section P",shelf:"Shelf 1",book:"Network Analysis (Van Valkenburg)",isbn:"978-81-000-0131-0"},
  {subject:"Electrical Engineering",name:"Electromagnetic Fields",slug:"electromagnetic-fields",difficulty:3,semester:"SE SEM 3",section:"Section P",shelf:"Shelf 2",book:"Electromagnetic Fields (Sadiku)",isbn:"978-81-000-0132-0"},
  {subject:"Electrical Engineering",name:"DC Machines",slug:"dc-machines",difficulty:3,semester:"SE SEM 4",section:"Section P",shelf:"Shelf 2",book:"Electrical Machines (Nagrath & Kothari)",isbn:"978-81-000-0133-0"},
  {subject:"Electrical Engineering",name:"AC Machines (Transformers & Induction)",slug:"ac-machines",difficulty:3,semester:"SE SEM 4",section:"Section P",shelf:"Shelf 3",book:"Electrical Machines (Nagrath & Kothari)",isbn:"978-81-000-0133-0"},
  {subject:"Electrical Engineering",name:"Power Systems I",slug:"power-systems-1",difficulty:3,semester:"TE SEM 5",section:"Section P",shelf:"Shelf 3",book:"Power System Engineering (Nagrath & Kothari)",isbn:"978-81-000-0134-0"},
  {subject:"Electrical Engineering",name:"Power Systems II",slug:"power-systems-2",difficulty:4,semester:"TE SEM 6",section:"Section P",shelf:"Shelf 4",book:"Power System Analysis (Stevenson)",isbn:"978-81-000-0135-0"},
  {subject:"Electrical Engineering",name:"Control Systems",slug:"control-systems",difficulty:4,semester:"TE SEM 5",section:"Section P",shelf:"Shelf 4",book:"Control Systems Engineering (Nise)",isbn:"978-81-000-0136-0"},
  {subject:"Electrical Engineering",name:"Power Electronics",slug:"power-electronics",difficulty:4,semester:"TE SEM 6",section:"Section Q",shelf:"Shelf 1",book:"Power Electronics (Rashid)",isbn:"978-81-000-0137-0"},
  {subject:"Electrical Engineering",name:"Drives & Control",slug:"drives-control",difficulty:4,semester:"BE SEM 7",section:"Section Q",shelf:"Shelf 1",book:"Electric Motor Drives (Mohan)",isbn:"978-81-000-0138-0"},
  {subject:"Electrical Engineering",name:"Switchgear & Protection",slug:"switchgear-protection",difficulty:4,semester:"BE SEM 7",section:"Section Q",shelf:"Shelf 2",book:"Switchgear & Protection (Sukhija)",isbn:"978-81-000-0139-0"},
  {subject:"Electrical Engineering",name:"High Voltage Engineering",slug:"high-voltage-engg",difficulty:4,semester:"BE SEM 8",section:"Section Q",shelf:"Shelf 2",book:"High Voltage Engineering (Naidu)",isbn:"978-81-000-0140-0"},
  {subject:"Electrical Engineering",name:"Renewable Energy Systems",slug:"renewable-energy",difficulty:3,semester:"BE SEM 8",section:"Section Q",shelf:"Shelf 3",book:"Renewable Energy (Boyle)",isbn:"978-81-000-0141-0"},
  {subject:"Electrical Engineering",name:"PLC & Industrial Automation",slug:"plc-automation",difficulty:3,semester:"BE SEM 7",section:"Section Q",shelf:"Shelf 3",book:"Programmable Logic Controllers (Petruzella)",isbn:"978-81-000-0142-0"},
];

// ─── PREREQUISITES ─────────────────────────────────────────────────────────────
const SEED_PREREQUISITES = [
  // Maths internal
  ["arithmetic","basic-algebra","required"],["basic-algebra","trigonometry","required"],["basic-algebra","complex-numbers","required"],
  ["basic-algebra","matrices-determinants","required"],["basic-algebra","differential-calculus","required"],["differential-calculus","integral-calculus","required"],
  ["integral-calculus","vector-calculus","required"],["integral-calculus","ode","required"],["differential-calculus","ode","required"],
  ["ode","laplace-transform","required"],["complex-numbers","laplace-transform","recommended"],["laplace-transform","fourier-series","required"],
  ["differential-calculus","numerical-methods","required"],["basic-algebra","linear-algebra","required"],["matrices-determinants","linear-algebra","required"],
  ["basic-algebra","probability-statistics","required"],["linear-algebra","optimization-techniques","required"],["probability-statistics","optimization-techniques","recommended"],
  ["graph-theory","optimization-techniques","recommended"],["basic-algebra","graph-theory","required"],
  // Maths → Electronics
  ["basic-algebra","ohms-law","required"],["trigonometry","phasor-analysis","required"],["complex-numbers","phasor-analysis","required"],
  ["differential-calculus","signals-systems","required"],["laplace-transform","signals-systems","required"],["fourier-series","signals-systems","recommended"],
  ["ode","active-filter-design","recommended"],["complex-numbers","communication-systems","recommended"],
  // Maths → CSE-DS
  ["probability-statistics","stats-ds","required"],["linear-algebra","ml-fundamentals","required"],["probability-statistics","ml-fundamentals","required"],
  ["differential-calculus","ml-fundamentals","required"],["optimization-techniques","ml-fundamentals","recommended"],["graph-theory","ds-data-structures","recommended"],
  ["graph-theory","algorithm-design","recommended"],["numerical-methods","deep-learning","recommended"],
  // Maths → CS
  ["graph-theory","theory-of-computation","required"],["probability-statistics","algorithm-design","recommended"],["linear-algebra","ai-fundamentals","recommended"],
  // Maths → Civil
  ["differential-calculus","strength-of-materials","recommended"],["integral-calculus","fluid-mechanics","required"],["differential-calculus","fluid-mechanics","required"],
  ["vector-calculus","fluid-mechanics","recommended"],["ode","structural-analysis-1","recommended"],
  // Maths → Mechanical
  ["differential-calculus","thermodynamics","recommended"],["integral-calculus","heat-transfer","required"],["ode","heat-transfer","required"],
  ["linear-algebra","finite-element-analysis","required"],["numerical-methods","finite-element-analysis","required"],["ode","theory-of-machines","recommended"],
  // Maths → Electrical
  ["complex-numbers","circuit-theory","required"],["differential-calculus","circuit-theory","required"],["laplace-transform","circuit-theory","required"],
  ["laplace-transform","control-systems","required"],["fourier-series","control-systems","recommended"],["vector-calculus","electromagnetic-fields","required"],
  ["differential-calculus","electromagnetic-fields","required"],
  // Electronics internal
  ["charge-current-voltage","ohms-law","required"],["ohms-law","kirchhoffs-laws","required"],["kirchhoffs-laws","dc-circuit-analysis","required"],
  ["dc-circuit-analysis","phasor-analysis","recommended"],["phasor-analysis","ac-circuit-analysis","required"],["dc-circuit-analysis","diodes-rectifiers","required"],
  ["diodes-rectifiers","bjt-transistors","required"],["bjt-transistors","fet-mosfet","required"],["dc-circuit-analysis","opamp-fundamentals","required"],
  ["opamp-fundamentals","opamp-applications","required"],["opamp-applications","active-filter-design","required"],["ac-circuit-analysis","active-filter-design","required"],
  ["signals-systems","active-filter-design","recommended"],["signals-systems","vco-design","required"],["active-filter-design","vco-design","required"],
  ["vco-design","pll-design","required"],["ac-circuit-analysis","pll-design","recommended"],["digital-logic","microcontrollers","required"],
  ["microcontrollers","adc-dac","required"],["adc-dac","mixed-signal-ics","required"],["pll-design","mixed-signal-ics","required"],
  ["active-filter-design","mixed-signal-ics","recommended"],["dc-circuit-analysis","digital-logic","recommended"],
  ["ac-circuit-analysis","communication-systems","required"],["signals-systems","communication-systems","required"],
  ["communication-systems","antenna-wave","required"],["electromagnetic-fields","antenna-wave","required"],
  // CSE-DS internal
  ["python-programming","ds-data-structures","required"],["python-programming","stats-ds","required"],["ds-data-structures","dbms","required"],
  ["dbms","sql-databases","required"],["sql-databases","nosql-databases","required"],["stats-ds","linear-regression","required"],
  ["linear-regression","ml-fundamentals","required"],["ds-data-structures","ml-fundamentals","recommended"],["ml-fundamentals","supervised-learning","required"],
  ["ml-fundamentals","unsupervised-learning","required"],["supervised-learning","deep-learning","required"],["unsupervised-learning","deep-learning","recommended"],
  ["deep-learning","nlp","required"],["deep-learning","computer-vision","required"],["nosql-databases","big-data","required"],
  ["python-programming","data-visualization","required"],["stats-ds","data-visualization","recommended"],["ml-fundamentals","mlops","required"],
  ["big-data","mlops","recommended"],
  // CSE-DS → IT
  ["nosql-databases","blockchain","recommended"],["sql-databases","business-intelligence","required"],["data-visualization","business-intelligence","recommended"],
  // CS internal
  ["c-programming","oop","required"],["c-programming","dsa","required"],["oop","dsa","recommended"],["dsa","algorithm-design","required"],
  ["c-programming","operating-systems","required"],["algorithm-design","operating-systems","recommended"],["operating-systems","computer-networks","recommended"],
  ["algorithm-design","database-systems","recommended"],["oop","database-systems","recommended"],["oop","software-engineering","required"],
  ["database-systems","software-engineering","recommended"],["algorithm-design","theory-of-computation","required"],["theory-of-computation","compiler-design","required"],
  ["operating-systems","distributed-systems","required"],["computer-networks","distributed-systems","required"],["computer-networks","cybersecurity","required"],
  ["operating-systems","cloud-computing","required"],["distributed-systems","cloud-computing","required"],["algorithm-design","ai-fundamentals","required"],
  ["probability-statistics","ai-fundamentals","required"],
  // CS → IT
  ["c-programming","java-programming","recommended"],["oop","java-programming","required"],["java-programming","advanced-java","required"],
  ["computer-networks","network-security","required"],["software-engineering","software-project-mgmt","required"],["database-systems","erp","recommended"],
  ["operating-systems","mobile-app-dev","recommended"],["computer-networks","iot","required"],["cybersecurity","blockchain","recommended"],
  ["cloud-computing","blockchain","recommended"],
  // IT internal
  ["web-technology","advanced-java","recommended"],["advanced-java","software-project-mgmt","recommended"],["network-security","software-project-mgmt","recommended"],
  ["erp","business-intelligence","required"],["mobile-app-dev","iot","recommended"],
  // Civil internal
  ["engineering-mechanics","strength-of-materials","required"],["strength-of-materials","structural-analysis-1","required"],
  ["structural-analysis-1","structural-analysis-2","required"],["fluid-mechanics","hydraulics","required"],["soil-mechanics","foundation-engineering","required"],
  ["strength-of-materials","soil-mechanics","recommended"],["concrete-technology","rcc-design","required"],["structural-analysis-1","rcc-design","required"],
  ["strength-of-materials","rcc-design","required"],["rcc-design","steel-structure-design","required"],["structural-analysis-2","steel-structure-design","required"],
  ["hydraulics","environmental-engg","recommended"],["surveying","transportation-engg","required"],["soil-mechanics","transportation-engg","recommended"],
  ["surveying","gis-remote-sensing","required"],
  // Mechanical internal
  ["mech-engg-mechanics","strength-of-materials","required"],["mech-engg-mechanics","theory-of-machines","required"],["thermodynamics","mech-fluid-mechanics","required"],
  ["mech-engg-mechanics","mech-fluid-mechanics","required"],["mech-fluid-mechanics","heat-transfer","required"],["thermodynamics","heat-transfer","required"],
  ["thermodynamics","refrigeration-ac","required"],["heat-transfer","refrigeration-ac","required"],["manufacturing-processes","machine-design","recommended"],
  ["strength-of-materials","machine-design","required"],["theory-of-machines","machine-design","required"],["machine-design","finite-element-analysis","recommended"],
  ["engineering-drawing","cad-cam","required"],["manufacturing-processes","cad-cam","recommended"],["theory-of-machines","mechatronics","required"],
  ["microcontrollers","mechatronics","required"],["manufacturing-processes","industrial-engg-mgmt","recommended"],
  // Electrical internal
  ["basic-electrical-engg","circuit-theory","required"],["circuit-theory","electromagnetic-fields","recommended"],["circuit-theory","dc-machines","required"],
  ["electromagnetic-fields","dc-machines","required"],["dc-machines","ac-machines","required"],["circuit-theory","ac-machines","required"],
  ["ac-machines","power-systems-1","required"],["circuit-theory","power-systems-1","required"],["power-systems-1","power-systems-2","required"],
  ["power-systems-2","switchgear-protection","required"],["circuit-theory","control-systems","required"],["ac-machines","power-electronics","required"],
  ["dc-machines","power-electronics","required"],["power-electronics","drives-control","required"],["control-systems","drives-control","required"],
  ["power-systems-2","high-voltage-engg","required"],["power-systems-1","renewable-energy","recommended"],["digital-logic","plc-automation","required"],
  ["control-systems","plc-automation","recommended"],["drives-control","plc-automation","recommended"],
  // Cross-branch
  ["ohms-law","basic-electrical-engg","required"],["kirchhoffs-laws","basic-electrical-engg","required"],["pll-design","drives-control","recommended"],
  ["digital-logic","mechatronics","required"],["microcontrollers","mechatronics","required"],
];


// ─── BUILD DATABASE ────────────────────────────────────────────────────────────
export function buildDatabase(reset = false) {
  if (reset && fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);

  // Insert subjects
  const insertSubject = db.prepare('INSERT OR IGNORE INTO subjects (name, description) VALUES (?, ?)');
  for (const s of SEED_SUBJECTS) insertSubject.run(s.name, s.description);

  // Build subject ID map
  const subjectIdMap = {};
  for (const s of SEED_SUBJECTS) {
    const row = db.prepare('SELECT id FROM subjects WHERE name=?').get(s.name);
    subjectIdMap[s.name] = row.id;
  }

  // Insert concepts
  const insertConcept = db.prepare(`
    INSERT OR IGNORE INTO concepts
      (subject_id, name, slug, difficulty, semester, library_section, shelf_number, book_title, book_isbn)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);
  for (const c of SEED_CONCEPTS) {
    insertConcept.run(subjectIdMap[c.subject], c.name, c.slug, c.difficulty, c.semester || '', c.section || '', c.shelf || '', c.book || '', c.isbn || '');
  }

  // Build slug-to-id map
  const slugIdMap = {};
  for (const c of SEED_CONCEPTS) {
    const row = db.prepare('SELECT id FROM concepts WHERE slug=?').get(c.slug);
    if (row) slugIdMap[c.slug] = row.id;
  }

  // Insert prerequisites
  const insertPrereq = db.prepare('INSERT OR IGNORE INTO prerequisites (concept_id, prerequisite_id, strength) VALUES (?,?,?)');
  let inserted = 0, skipped = 0;
  for (const [fromSlug, toSlug, strength] of SEED_PREREQUISITES) {
    const cid = slugIdMap[toSlug];
    const pid = slugIdMap[fromSlug];
    if (cid && pid) { insertPrereq.run(cid, pid, strength); inserted++; }
    else { skipped++; }
  }

  db.close();
  console.log(`[OK] Database built: ${DB_PATH}`);
  console.log(`    Subjects: ${SEED_SUBJECTS.length}  Concepts: ${SEED_CONCEPTS.length}  Prerequisites: ${inserted} (skipped: ${skipped})`);
}


// ─── D3 EXPORT ─────────────────────────────────────────────────────────────────
export function exportD3Graph(studentId = null, subjectFilter = null) {
  const db = new Database(DB_PATH, { readonly: true });

  let concepts;
  if (subjectFilter) {
    concepts = db.prepare(`SELECT c.*, s.name AS subject FROM concepts c JOIN subjects s ON s.id=c.subject_id WHERE s.name=?`).all(subjectFilter);
  } else {
    concepts = db.prepare(`SELECT c.*, s.name AS subject FROM concepts c JOIN subjects s ON s.id=c.subject_id`).all();
  }

  const masteryMap = {};
  if (studentId) {
    const rows = db.prepare('SELECT concept_id, score FROM mastery WHERE student_id=?').all(studentId);
    for (const r of rows) masteryMap[r.concept_id] = r.score;
  }

  const slugSet = new Set(concepts.map(c => c.slug));
  const idToSlug = {};
  const nodes = concepts.map(c => {
    idToSlug[c.id] = c.slug;
    return {
      id: c.slug, db_id: c.id, name: c.name, subject: c.subject, difficulty: c.difficulty,
      semester: c.semester, mastery: masteryMap[c.id] ?? -1,
      library_section: c.library_section, shelf_number: c.shelf_number,
      book_title: c.book_title, book_isbn: c.book_isbn,
    };
  });

  const edges = db.prepare('SELECT prerequisite_id AS source_id, concept_id AS target_id, strength FROM prerequisites').all();
  const links = [];
  for (const e of edges) {
    const src = idToSlug[e.source_id];
    const tgt = idToSlug[e.target_id];
    if (src && tgt && slugSet.has(src) && slugSet.has(tgt)) {
      links.push({ source: src, target: tgt, strength: e.strength });
    }
  }

  db.close();
  return { nodes, links };
}

export function getDb() {
  return new Database(DB_PATH);
}
