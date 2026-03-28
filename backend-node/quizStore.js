/**
 * Module 2 — Quiz Store
 * SQLite persistence for quiz questions, attempts, and mastery updates.
 * Re-uses the SAME database (knowledge_graph.db) created by Module 1.
 */

import Database from 'better-sqlite3';
import { DB_PATH } from './graphDb.js';

const QUIZ_SCHEMA = `
CREATE TABLE IF NOT EXISTS quiz_questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    concept_slug    TEXT NOT NULL,
    question_text   TEXT NOT NULL,
    option_a        TEXT NOT NULL,
    option_b        TEXT NOT NULL,
    option_c        TEXT NOT NULL,
    option_d        TEXT NOT NULL,
    correct_option  TEXT NOT NULL CHECK(correct_option IN ('a','b','c','d')),
    difficulty      INTEGER DEFAULT 3 CHECK(difficulty BETWEEN 1 AND 5),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      TEXT NOT NULL,
    concept_slug    TEXT NOT NULL,
    question_id     INTEGER REFERENCES quiz_questions(id),
    selected_option TEXT NOT NULL,
    is_correct      INTEGER DEFAULT 0 CHECK(is_correct IN (0, 1)),
    time_taken_sec  INTEGER DEFAULT 30,
    hint_used       INTEGER DEFAULT 0 CHECK(hint_used IN (0, 1)),
    attempted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_concept ON quiz_attempts(concept_slug);
CREATE INDEX IF NOT EXISTS idx_attempts_student_concept ON quiz_attempts(student_id, concept_slug);
`;

// ─── SEED QUESTIONS ────────────────────────────────────────────────────────────
const SEED_QUESTIONS = [
  {slug:"arithmetic",q:"What is the remainder when 234 is divided by 7?",a:"1",b:"2",c:"3",d:"4",ans:"c",diff:1},
  {slug:"arithmetic",q:"What is the GCD of 48 and 18?",a:"2",b:"6",c:"12",d:"8",ans:"b",diff:1},
  {slug:"arithmetic",q:"Simplify: 15% of 200 + 40",a:"70",b:"50",c:"60",d:"80",ans:"a",diff:1},
  {slug:"trigonometry",q:"Value of sin^2(x) + cos^2(x) is:",a:"0",b:"sin(2x)",c:"1",d:"tan(x)",ans:"c",diff:1},
  {slug:"trigonometry",q:"What is the value of tan(45 degrees)?",a:"0",b:"1",c:"0.5",d:"Infinity",ans:"b",diff:1},
  {slug:"trigonometry",q:"The value of cos(90) is:",a:"1",b:"0",c:"-1",d:"0.5",ans:"b",diff:1},
  {slug:"complex-numbers",q:"The value of i^2 is:",a:"1",b:"-1",c:"0",d:"i",ans:"b",diff:1},
  {slug:"complex-numbers",q:"What is the modulus of 3 + 4i?",a:"7",b:"5",c:"25",d:"1",ans:"b",diff:2},
  {slug:"complex-numbers",q:"The polar form of a complex number is z = r(cos θ + i sin θ). What is r called?",a:"Argument",b:"Modulus",c:"Conjugate",d:"Phase",ans:"b",diff:1},
  {slug:"matrices-determinants",q:"If A is a square matrix, A + A^T is always:",a:"Skew-symmetric",b:"Symmetric",c:"Identity",d:"Singular",ans:"b",diff:2},
  {slug:"matrices-determinants",q:"The determinant of a matrix with two identical rows is:",a:"1",b:"0",c:"Sum of rows",d:"Infinity",ans:"b",diff:1},
  {slug:"matrices-determinants",q:"What is the trace of a matrix?",a:"Product of diagonal elements",b:"Sum of diagonal elements",c:"Determinant",d:"Rank",ans:"b",diff:1},
  {slug:"ode",q:"The order of d^2y/dx^2 + (dy/dx)^3 = y is:",a:"1",b:"2",c:"3",d:"0",ans:"b",diff:1},
  {slug:"ode",q:"A differential equation is linear if the dependent variable and its derivatives appear only in:",a:"First degree",b:"Second degree",c:"Higher degrees",d:"Squares",ans:"a",diff:2},
  {slug:"ode",q:"Integrating factor for dy/dx + Py = Q is:",a:"e^P",b:"e^∫Pdx",c:"∫Pdx",d:"e^Q",ans:"b",diff:2},
  {slug:"laplace-transform",q:"Laplace transform of 1 is:",a:"s",b:"1/s",c:"1/s^2",d:"e^s",ans:"b",diff:1},
  {slug:"laplace-transform",q:"L{e^(at)} = ?",a:"1/(s+a)",b:"1/(s-a)",c:"a/s",d:"s/a",ans:"b",diff:2},
  {slug:"laplace-transform",q:"L{sin(at)} = ?",a:"s/(s^2+a^2)",b:"a/(s^2+a^2)",c:"a/(s^2-a^2)",d:"s/(s^2-a^2)",ans:"b",diff:2},
  {slug:"fourier-series",q:"Fourier series is used to represent:",a:"Continuous functions",b:"Periodic functions",c:"Linear functions",d:"Polynomials",ans:"b",diff:1},
  {slug:"fourier-series",q:"The constant term a0 in Fourier series is related to the:",a:"Peak value",b:"Average value",c:"RMS value",d:"Frequency",ans:"b",diff:2},
  {slug:"fourier-series",q:"In an even function f(x), which Fourier coefficients are zero?",a:"an",b:"bn",c:"a0",d:"None",ans:"b",diff:3},
  {slug:"numerical-methods",q:"Newton-Raphson method is used for:",a:"Integration",b:"Finding roots of equations",c:"Interpolation",d:"Solving ODEs",ans:"b",diff:2},
  {slug:"numerical-methods",q:"Simpson's 1/3 rule requires the number of intervals to be:",a:"Even",b:"Odd",c:"Prime",d:"Any",ans:"a",diff:2},
  {slug:"numerical-methods",q:"Trapezoidal rule is based on approximating the curve by:",a:"Parabolas",b:"Straight lines",c:"Hyperbolas",d:"Circles",ans:"b",diff:2},
  {slug:"graph-theory",q:"A tree with N nodes has how many edges?",a:"N",b:"N-1",c:"N+1",d:"2N",ans:"b",diff:2},
  {slug:"graph-theory",q:"A graph is bipartite if it can be colored with how many colors?",a:"1",b:"2",c:"3",d:"N",ans:"b",diff:3},
  {slug:"graph-theory",q:"Dijkstra's algorithm is used for:",a:"Sorting",b:"Shortest path",c:"Minimum spanning tree",d:"Maximum flow",ans:"b",diff:2},
  {slug:"charge-current-voltage",q:"Unit of charge is:",a:"Ampere",b:"Coulomb",c:"Volt",d:"Ohm",ans:"b",diff:1},
  {slug:"charge-current-voltage",q:"1 Ampere is equal to:",a:"1 Coulomb/Sec",b:"1 Joule/Sec",c:"1 Volt/Ohm",d:"Both a and c",ans:"d",diff:2},
  {slug:"charge-current-voltage",q:"Voltage is also known as:",a:"Current",b:"Potential Difference",c:"Power",d:"Energy",ans:"b",diff:1},
  {slug:"phasor-analysis",q:"A phasor represents a complex number in terms of:",a:"Mass and velocity",b:"Magnitude and phase",c:"Resistance and reactance",d:"Time and distance",ans:"b",diff:2},
  {slug:"phasor-analysis",q:"The imaginary part of a phasor jX represents:",a:"Resistance",b:"Reactance",c:"Admittance",d:"Conductance",ans:"b",diff:2},
  {slug:"phasor-analysis",q:"Impedance Z in a series R-L circuit is:",a:"R + jωL",b:"R - j/ωC",c:"jωL",d:"R",ans:"a",diff:3},
  {slug:"ac-circuit-analysis",q:"In a purely capacitive circuit, current ______ voltage by 90 degrees.",a:"Lags",b:"Leads",c:"Is in phase with",d:"Opposes",ans:"b",diff:2},
  {slug:"ac-circuit-analysis",q:"Power factor of a purely resistive circuit is:",a:"0",b:"1",c:"0.5",d:"Infinity",ans:"b",diff:1},
  {slug:"ac-circuit-analysis",q:"Resonance occurs in an RLC circuit when:",a:"XL > XC",b:"XL = XC",c:"R = 0",d:"V = 0",ans:"b",diff:3},
  {slug:"diodes-rectifiers",q:"A diode allows current to flow in:",a:"Both directions",b:"One direction only",c:"Circular path",d:"None of these",ans:"b",diff:1},
  {slug:"diodes-rectifiers",q:"Efficiency of a half-wave rectifier is approximately:",a:"81.2%",b:"40.6%",c:"100%",d:"20.3%",ans:"b",diff:2},
  {slug:"diodes-rectifiers",q:"Which component is used to filter out ripples in a rectifier?",a:"Resistor",b:"Capacitor",c:"Transistor",d:"Transformer",ans:"b",diff:2},
  {slug:"bjt-transistors",q:"BJT stands for:",a:"Binary Junction Transistor",b:"Bipolar Junction Transistor",c:"Basic Junction Transistor",d:"Blocked Junction Transistor",ans:"b",diff:1},
  {slug:"bjt-transistors",q:"In a transistor, the base is:",a:"Heavily doped",b:"Thin and lightly doped",c:"Large and moderately doped",d:"None",ans:"b",diff:2},
  {slug:"bjt-transistors",q:"Common Emitter (CE) configuration provides:",a:"Current gain only",b:"Voltage gain only",c:"Both current and voltage gain",d:"No gain",ans:"c",diff:3},
  {slug:"fet-mosfet",q:"FET is a _______ controlled device.",a:"Current",b:"Voltage",c:"Power",d:"Light",ans:"b",diff:2},
  {slug:"fet-mosfet",q:"In an n-channel MOSFET, the majority carriers are:",a:"Holes",b:"Electrons",c:"Protons",d:"Neutrons",ans:"b",diff:1},
  {slug:"fet-mosfet",q:"CMOS technology uses:",a:"Only n-channel",b:"Only p-channel",c:"Both n-channel and p-channel",d:"BJTs",ans:"c",diff:2},
  {slug:"opamp-fundamentals",q:"An ideal Op-Amp has _________ input impedance.",a:"Zero",b:"Infinite",c:"Moderate",d:"Negative",ans:"b",diff:2},
  {slug:"opamp-fundamentals",q:"The CMRR of an ideal Op-Amp is:",a:"0",b:"Infinity",c:"1",d:"100",ans:"b",diff:3},
  {slug:"opamp-fundamentals",q:"Slew rate is defined as the maximum rate of change of:",a:"Input voltage",b:"Output voltage",c:"Supply voltage",d:"Gain",ans:"b",diff:3},
  {slug:"active-filter-design",q:"Active filters use _______ components.",a:"R and L only",b:"R, C and an amplifier (like Op-Amp)",c:"Only inductors",d:"Only transformers",ans:"b",diff:2},
  {slug:"active-filter-design",q:"Butterworth filter is known for its _______ response.",a:"Sharp cutoff",b:"Flat passband",c:"Rippled passband",d:"Phase linearity",ans:"b",diff:3},
  {slug:"active-filter-design",q:"A low-pass filter allows frequencies _______ the cutoff frequency.",a:"Above",b:"Below",c:"Equal to",d:"None",ans:"b",diff:1},
  {slug:"signals-systems",q:"A system is causal if output depends only on:",a:"Future inputs",b:"Present and past inputs",c:"Random values",d:"None",ans:"b",diff:3},
  {slug:"signals-systems",q:"Unit impulse function δ(t) is zero everywhere except at:",a:"t = 1",b:"t = 0",c:"t = infinity",d:"Always 1",ans:"b",diff:2},
  {slug:"signals-systems",q:"Convolution in time domain is ________ in frequency domain.",a:"Addition",b:"Multiplication",c:"Division",d:"Subtraction",ans:"b",diff:3},
  {slug:"digital-logic",q:"A NAND gate is a combination of:",a:"AND and OR",b:"AND and NOT",c:"OR and NOT",d:"XOR and NOT",ans:"b",diff:1},
  {slug:"digital-logic",q:"How many outputs does a full adder have?",a:"1",b:"2",c:"3",d:"4",ans:"b",diff:2},
  {slug:"digital-logic",q:"Which flip-flop is free from race-around condition?",a:"SR",b:"JK Master-Slave",c:"D",d:"T",ans:"b",diff:3},
  {slug:"microcontrollers",q:"The 8051 microcontroller has ________ bits of address bus.",a:"8",b:"16",c:"32",d:"4",ans:"b",diff:2},
  {slug:"microcontrollers",q:"Which register is the primary accumulator in 8051?",a:"B",b:"A",c:"DPTR",d:"PC",ans:"b",diff:2},
  {slug:"microcontrollers",q:"How many external interrupts does basic 8051 have?",a:"1",b:"2",c:"3",d:"5",ans:"b",diff:3},
  {slug:"communication-systems",q:"Modulation is the process of _______ onto a high frequency carrier.",a:"Adding noise",b:"Superimposing information",c:"Removing signal",d:"Filtering",ans:"b",diff:1},
  {slug:"communication-systems",q:"In Amplitude Modulation (AM), which parameter of carrier is varied?",a:"Frequency",b:"Amplitude",c:"Phase",d:"Time",ans:"b",diff:2},
  {slug:"communication-systems",q:"FM is more robust against ________ compared to AM.",a:"Interference",b:"Noise",c:"Distortion",d:"Distance",ans:"b",diff:3},
  {slug:"probability-statistics",q:"If P(A) = 0.3 and P(B) = 0.5 and A, B are independent, P(A and B) = ?",a:"0.80",b:"0.15",c:"0.20",d:"0.35",ans:"b",diff:2},
  {slug:"probability-statistics",q:"The mean of {2, 4, 6, 8, 10} is:",a:"5",b:"6",c:"7",d:"8",ans:"b",diff:1},
  {slug:"probability-statistics",q:"Standard deviation measures:",a:"Central tendency",b:"Spread of data",c:"Skewness",d:"Kurtosis",ans:"b",diff:2},
  {slug:"probability-statistics",q:"For a normal distribution, approximately what % of data lies within 1 standard deviation of the mean?",a:"50%",b:"68%",c:"95%",d:"99.7%",ans:"b",diff:3},
  {slug:"linear-algebra",q:"The rank of a 3x3 identity matrix is:",a:"0",b:"1",c:"2",d:"3",ans:"d",diff:2},
  {slug:"linear-algebra",q:"If A is a 2x3 matrix and B is a 3x4 matrix, the product AB has dimensions:",a:"2x4",b:"3x3",c:"2x3",d:"3x4",ans:"a",diff:2},
  {slug:"linear-algebra",q:"The eigenvalues of a diagonal matrix are:",a:"All zeros",b:"All ones",c:"The diagonal entries",d:"The off-diagonal entries",ans:"c",diff:3},
  {slug:"linear-algebra",q:"A matrix A is singular if:",a:"det(A) = 1",b:"det(A) = 0",c:"A is symmetric",d:"A is diagonal",ans:"b",diff:2},
  {slug:"python-programming",q:"What is the output of: print(type([]))?",a:"<class 'tuple'>",b:"<class 'list'>",c:"<class 'dict'>",d:"<class 'set'>",ans:"b",diff:1},
  {slug:"python-programming",q:"Which keyword is used to define a function in Python?",a:"func",b:"define",c:"def",d:"function",ans:"c",diff:1},
  {slug:"python-programming",q:"What does 'len([1,2,3])' return?",a:"1",b:"2",c:"3",d:"Error",ans:"c",diff:1},
  {slug:"python-programming",q:"Which of the following is immutable in Python?",a:"list",b:"dict",c:"set",d:"tuple",ans:"d",diff:1},
  {slug:"python-programming",q:"What is the result of 3 ** 2?",a:"6",b:"9",c:"5",d:"None",ans:"b",diff:1},
  {slug:"ds-data-structures",q:"Which data structure follows LIFO (Last In First Out)?",a:"Queue",b:"Stack",c:"Array",d:"Tree",ans:"b",diff:1},
  {slug:"ds-data-structures",q:"Complexity of searching in a balanced Binary Search Tree (BST) is:",a:"O(1)",b:"O(n)",c:"O(log n)",d:"O(n^2)",ans:"c",diff:2},
  {slug:"ds-data-structures",q:"A linked list is a ________ memory allocation structure.",a:"Static",b:"Dynamic",c:"Fixed",d:"None",ans:"b",diff:1},
  {slug:"dbms",q:"ACID properties in DBMS stand for:",a:"Atomicity, Consistency, Isolation, Durability",b:"Access, Control, Input, Data",c:"Auto, Check, Index, Delete",d:"All-in-one, Cloud, Instant, Database",ans:"a",diff:2},
  {slug:"dbms",q:"A primary key must be:",a:"Null",b:"Unique and Not Null",c:"Duplicate",d:"Optional",ans:"b",diff:1},
  {slug:"dbms",q:"Which normal form deals with partial functional dependency?",a:"1NF",b:"2NF",c:"3NF",d:"BCNF",ans:"b",diff:3},
  {slug:"sql-databases",q:"Which SQL command is used to retrieve data?",a:"INSERT",b:"UPDATE",c:"SELECT",d:"DELETE",ans:"c",diff:1},
  {slug:"sql-databases",q:"The JOIN clause is used to:",a:"Combine rows from two or more tables",b:"Delete tables",c:"Index a table",d:"Create a schema",ans:"a",diff:2},
  {slug:"sql-databases",q:"What does SQL stand for?",a:"Static Query Language",b:"Structured Query Language",c:"Simple Query Language",d:"Standard Query Language",ans:"b",diff:1},
  {slug:"nosql-databases",q:"MongoDB is a ________ oriented NoSQL database.",a:"Column",b:"Document",c:"Graph",d:"Key-Value",ans:"b",diff:2},
  {slug:"nosql-databases",q:"NoSQL databases are generally:",a:"Vertically scalable",b:"Horizontally scalable",c:"Not scalable",d:"Only for small data",ans:"b",diff:3},
  {slug:"nosql-databases",q:"Which of these is a Graph database?",a:"Redis",b:"Neo4j",c:"Cassandra",d:"HBase",ans:"b",diff:3},
  {slug:"ml-fundamentals",q:"Which of the following is a supervised learning algorithm?",a:"K-Means",b:"PCA",c:"Random Forest",d:"DBSCAN",ans:"c",diff:3},
  {slug:"ml-fundamentals",q:"Overfitting occurs when:",a:"Model performs well on training and test data",b:"Model performs well on training but poorly on test data",c:"Model performs poorly on all data",d:"Model has too few parameters",ans:"b",diff:3},
  {slug:"ml-fundamentals",q:"The bias-variance tradeoff refers to:",a:"Balancing speed and accuracy",b:"Balancing underfitting and overfitting",c:"Choosing learning rate",d:"Selecting features",ans:"b",diff:3},
  {slug:"ml-fundamentals",q:"Cross-validation is primarily used to:",a:"Train the model faster",b:"Reduce dataset size",c:"Estimate model generalisation performance",d:"Increase training accuracy",ans:"c",diff:3},
  {slug:"deep-learning",q:"What does CNN stand for in computer vision?",a:"Circular Neural Network",b:"Convolutional Neural Network",c:"Combined Neural Network",d:"Central Neural Network",ans:"b",diff:2},
  {slug:"deep-learning",q:"Which activation function is commonly used in hidden layers?",a:"Sigmoid",b:"ReLU",c:"Softmax",d:"Linear",ans:"b",diff:2},
  {slug:"deep-learning",q:"An epoch in neural network training refers to:",a:"One forward pass",b:"One backward pass",c:"One pass through the entire dataset",d:"One weight update",ans:"c",diff:3},
  {slug:"nlp",q:"What does NLP stand for?",a:"Natural Logic Processing",b:"Natural Language Processing",c:"Network Language Protocol",d:"New Language Program",ans:"b",diff:1},
  {slug:"nlp",q:"Tokenization is the process of:",a:"Removing noise",b:"Breaking text into words or sentences",c:"Translating text",d:"Correcting grammar",ans:"b",diff:2},
  {slug:"nlp",q:"Which model is the base for ChatGPT?",a:"RNN",b:"CNN",c:"Transformer",d:"SVM",ans:"c",diff:4},
  {slug:"c-programming",q:"Who is the father of C language?",a:"Bjarne Stroustrup",b:"Dennis Ritchie",c:"James Gosling",d:"Guido van Rossum",ans:"b",diff:1},
  {slug:"c-programming",q:"Which operator is used for finding the address of a variable?",a:"*",b:"&",c:"%",d:"->",ans:"b",diff:1},
  {slug:"c-programming",q:"What is the size of 'int' in a 32-bit system?",a:"2 bytes",b:"4 bytes",c:"8 bytes",d:"1 byte",ans:"b",diff:1},
  {slug:"dsa",q:"Which sorting algorithm has the best average case complexity O(n log n)?",a:"Bubble Sort",b:"Merge Sort",c:"Insertion Sort",d:"Selection Sort",ans:"b",diff:2},
  {slug:"dsa",q:"In a queue, insertion is done at the:",a:"Front",b:"Rear",c:"Middle",d:"Anywhere",ans:"b",diff:1},
  {slug:"dsa",q:"A graph with no cycles is called a:",a:"Path",b:"Acyclic Graph",c:"Complete Graph",d:"Loop",ans:"b",diff:2},
  {slug:"operating-systems",q:"Which scheduling algorithm can cause starvation?",a:"FCFS",b:"Round Robin",c:"SJF (non-preemptive)",d:"FIFO",ans:"c",diff:3},
  {slug:"operating-systems",q:"A deadlock requires all of the following conditions EXCEPT:",a:"Mutual exclusion",b:"Hold and wait",c:"Preemption",d:"Circular wait",ans:"c",diff:3},
  {slug:"operating-systems",q:"Virtual memory uses which hardware support?",a:"Cache",b:"MMU (Memory Management Unit)",c:"ALU",d:"GPU",ans:"b",diff:3},
  {slug:"web-technology",q:"What does HTML stand for?",a:"HyperText Markup Language",b:"HighText Machine Language",c:"Hyperlink Text Management Language",d:"Home Tool Markup Language",ans:"a",diff:1},
  {slug:"web-technology",q:"Which CSS property is used to change background color?",a:"color",b:"background-color",c:"bg-color",d:"hex-color",ans:"b",diff:1},
  {slug:"web-technology",q:"JavaScript is a ________ side scripting language.",a:"Server",b:"Client",c:"Both",d:"None",ans:"c",diff:2},
  {slug:"java-programming",q:"Java is a _______ language.",a:"Platform dependent",b:"Platform independent",c:"Hardware dependent",d:"Scripting",ans:"b",diff:1},
  {slug:"java-programming",q:"Which keyword is used to inherit a class in Java?",a:"implements",b:"extends",c:"inherits",d:"using",ans:"b",diff:2},
  {slug:"java-programming",q:"JVM stands for:",a:"Java Variable Machine",b:"Java Virtual Machine",c:"Java Visual Machine",d:"Java Verified Machine",ans:"b",diff:1},
  {slug:"cybersecurity",q:"HTTPS uses ________ for secure communication.",a:"SSH",b:"SSL/TLS",c:"FTP",d:"UDP",ans:"b",diff:2},
  {slug:"cybersecurity",q:"A 'Brute Force' attack is used to:",a:"Crack passwords by trying all combinations",b:"Infect with virus",c:"Crash a server",d:"Steal hardware",ans:"a",diff:2},
  {slug:"cybersecurity",q:"Salting is used with ________ to improve security.",a:"Encryption",b:"Hashing",c:"Encoding",d:"Compression",ans:"b",diff:3},
  {slug:"cloud-computing",q:"SaaS stands for:",a:"System as a Service",b:"Software as a Service",c:"Storage as a Service",d:"Server as a Service",ans:"b",diff:1},
  {slug:"cloud-computing",q:"Which of these is a public cloud provider?",a:"AWS",b:"Azure",c:"Google Cloud",d:"All of these",ans:"d",diff:1},
  {slug:"cloud-computing",q:"Edge computing refers to processing data:",a:"In the central cloud",b:"Near the source of data",c:"Offline",d:"In space",ans:"b",diff:3},
  {slug:"iot",q:"IoT stands for:",a:"Input Output Technology",b:"Internet of Things",c:"Internet of Tools",d:"Interconnected objects Talk",ans:"b",diff:1},
  {slug:"iot",q:"Which protocol is commonly used in IoT for low power communication?",a:"HTTP",b:"MQTT",c:"FTP",d:"Telnet",ans:"b",diff:3},
  {slug:"iot",q:"RFID stands for:",a:"Radio Frequency Identification",b:"Remote Frequency ID",c:"Rapid Frequency ID",d:"Radio Flow ID",ans:"a",diff:2},
  {slug:"blockchain",q:"A blockchain is essentially a:",a:"Centralized database",b:"Distributed ledger",c:"Local file system",d:"Encrypted email",ans:"b",diff:2},
  {slug:"blockchain",q:"Proof of Work (PoW) is a ________ mechanism.",a:"Encryption",b:"Consensus",c:"Storage",d:"Mining",ans:"b",diff:3},
  {slug:"blockchain",q:"Ethereum introduced the concept of:",a:"Digital currency",b:"Smart contracts",c:"Encryption",d:"Private keys",ans:"b",diff:3},
  {slug:"thermodynamics",q:"The first law of thermodynamics is essentially the law of:",a:"Conservation of mass",b:"Conservation of energy",c:"Conservation of momentum",d:"Entropy",ans:"b",diff:2},
  {slug:"thermodynamics",q:"In an isothermal process:",a:"Pressure is constant",b:"Volume is constant",c:"Temperature is constant",d:"Entropy is constant",ans:"c",diff:2},
  {slug:"thermodynamics",q:"The efficiency of a Carnot engine operating between 500K and 300K is:",a:"20%",b:"40%",c:"60%",d:"80%",ans:"b",diff:3},
  {slug:"thermodynamics",q:"Entropy of an isolated system:",a:"Always decreases",b:"Remains constant or increases",c:"Always remains constant",d:"Can decrease or increase",ans:"b",diff:3},
  {slug:"thermodynamics",q:"Which property remains constant in an adiabatic process?",a:"Heat",b:"Temperature",c:"Entropy",d:"Pressure",ans:"a",diff:2},
  {slug:"control-systems",q:"The transfer function of a system is the ratio of:",a:"Input to output in time domain",b:"Laplace transform of output to input (zero initial conditions)",c:"Output to input in frequency domain only",d:"Steady state output to input",ans:"b",diff:3},
  {slug:"control-systems",q:"A system is stable if all poles of its transfer function lie in the:",a:"Right half of s-plane",b:"Left half of s-plane",c:"On the imaginary axis",d:"At the origin",ans:"b",diff:3},
  {slug:"control-systems",q:"The Routh-Hurwitz criterion is used to determine:",a:"Gain margin",b:"Phase margin",c:"Stability without finding roots",d:"Steady state error",ans:"c",diff:4},
  {slug:"control-systems",q:"A unity feedback system has open loop gain G(s) = 10/s. The steady state error to unit step is:",a:"0",b:"0.1",c:"Infinity",d:"1",ans:"a",diff:3},
  {slug:"strength-of-materials",q:"Stress is defined as:",a:"Force x Area",b:"Force / Area",c:"Force / Length",d:"Force x Length",ans:"b",diff:2},
  {slug:"strength-of-materials",q:"Young's modulus is the ratio of:",a:"Shear stress to shear strain",b:"Lateral strain to longitudinal strain",c:"Longitudinal stress to longitudinal strain",d:"Volumetric stress to volumetric strain",ans:"c",diff:2},
  {slug:"strength-of-materials",q:"Poisson's ratio is the ratio of:",a:"Longitudinal strain to lateral strain",b:"Lateral strain to longitudinal strain",c:"Stress to strain",d:"Shear stress to normal stress",ans:"b",diff:3},
  {slug:"strength-of-materials",q:"The point in a stress-strain curve where plastic deformation begins is:",a:"Elastic limit",b:"Yield point",c:"Ultimate strength",d:"Fracture point",ans:"b",diff:2},
  {slug:"engineering-mechanics",q:"A force is a _______ quantity.",a:"Scalar",b:"Vector",c:"Tensor",d:"None",ans:"b",diff:1},
  {slug:"engineering-mechanics",q:"Moment of a force is:",a:"Force x perpendicular distance",b:"Force / distance",c:"Mass x acceleration",d:"Energy / time",ans:"a",diff:1},
  {slug:"engineering-mechanics",q:"Lami's theorem is applicable for ________ forces.",a:"Two",b:"Three coplanar",c:"Four concurrent",d:"Any number of",ans:"b",diff:3},
  {slug:"fluid-mechanics",q:"Viscosity is the property of a fluid to resist:",a:"Flow",b:"Compression",c:"Tension",d:"Heat",ans:"a",diff:1},
  {slug:"fluid-mechanics",q:"Bernoulli's equation is based on the principle of conservation of:",a:"Mass",b:"Momentum",c:"Energy",d:"Pressure",ans:"c",diff:2},
  {slug:"fluid-mechanics",q:"Surface tension has the units of:",a:"N/m",b:"N/m^2",c:"J/m",d:"W/m",ans:"a",diff:2},
  {slug:"rcc-design",q:"Concrete is strong in ________ but weak in ________.",a:"Tension, Compression",b:"Compression, Tension",c:"Shear, Bending",d:"Bending, Torsion",ans:"b",diff:1},
  {slug:"rcc-design",q:"The minimum grade of concrete for RCC as per IS 456 is:",a:"M10",b:"M15",c:"M20",d:"M25",ans:"c",diff:2},
  {slug:"rcc-design",q:"The modular ratio is denoted by:",a:"m = Es/Ec",b:"m = Ec/Es",c:"m = σst/σcb",d:"m = d/b",ans:"a",diff:2},
  {slug:"surveying",q:"The curvature of the earth is taken into account in:",a:"Plane surveying",b:"Geodetic surveying",c:"Topographic surveying",d:"Cadastral surveying",ans:"b",diff:2},
  {slug:"surveying",q:"A theodolite is used for measuring:",a:"Distances only",b:"Horizontal and vertical angles",c:"Bearings only",d:"Elevations only",ans:"b",diff:1},
  {slug:"surveying",q:"The scale 1:1000 means:",a:"1 cm = 10 m",b:"1 cm = 100 m",c:"1 mm = 10 m",d:"1 m = 1 km",ans:"a",diff:1},
  {slug:"theory-of-machines",q:"A kinematic link is also known as a:",a:"Pair",b:"Element",c:"Joint",d:"Mechanism",ans:"b",diff:1},
  {slug:"theory-of-machines",q:"A slider crank mechanism is a ______ bar chain.",a:"3",b:"4",c:"5",d:"6",ans:"b",diff:2},
  {slug:"theory-of-machines",q:"Governor is used to control _______ of an engine.",a:"Speed",b:"Power",c:"Fuel",d:"Temperature",ans:"a",diff:2},
  {slug:"heat-transfer",q:"Heat transfer by actual movement of molecules is called:",a:"Conduction",b:"Convection",c:"Radiation",d:"Evaporation",ans:"b",diff:1},
  {slug:"heat-transfer",q:"Fourier's law is related to:",a:"Conduction",b:"Convection",c:"Radiation",d:"Diffraction",ans:"a",diff:1},
  {slug:"heat-transfer",q:"The emissivity of a black body is:",a:"0",b:"1",c:"0.5",d:"Infinity",ans:"b",diff:1},
  {slug:"basic-electrical-engg",q:"Three-phase power is given by P = ________.",a:"VI cosΦ",b:"√3 VI cosΦ",c:"3 VI sinΦ",d:"V/I",ans:"b",diff:2},
  {slug:"basic-electrical-engg",q:"The frequency of AC supply in India is:",a:"60 Hz",b:"50 Hz",c:"100 Hz",d:"25 Hz",ans:"b",diff:1},
  {slug:"basic-electrical-engg",q:"A transformer works on the principle of:",a:"Self induction",b:"Mutual induction",c:"Static electricity",d:"Magnetic levitation",ans:"b",diff:1},
  {slug:"ac-machines",q:"Synchronous speed Ns is given by:",a:"120f / P",b:"120P / f",c:"P / 120f",d:"f / 120P",ans:"a",diff:2},
  {slug:"ac-machines",q:"In a transformer, the core is laminated to reduce:",a:"Copper loss",b:"Eddy current loss",c:"Hysteresis loss",d:"Weight",ans:"b",diff:2},
  {slug:"ac-machines",q:"Slip of an induction motor is s = ________.",a:"(Ns - N) / Ns",b:"(N - Ns) / Ns",c:"Ns / N",d:"N / Ns",ans:"a",diff:2},
  {slug:"power-systems-1",q:"The string efficiency of insulators can be improved by:",a:"Increasing cross arm length",b:"Using guard ring",c:"Using longer insulators",d:"Both a and b",ans:"d",diff:3},
  {slug:"power-systems-1",q:"Corona loss is reduced in transmission lines by:",a:"Using thinner conductors",b:"Increasing conductor size",c:"Increasing voltage",d:"Reducing spacing",ans:"b",diff:3},
  {slug:"power-systems-1",q:"Which of these is a base load plant?",a:"Nuclear power plant",b:"Gas turbine",c:"Pumped storage",d:"Diesel plant",ans:"a",diff:2},
  {slug:"integral-calculus",q:"Integration of cos(x) is:",a:"sin(x) + C",b:"-sin(x) + C",c:"tan(x) + C",d:"sec(x) + C",ans:"a",diff:1},
  {slug:"integral-calculus",q:"The integral ∫ (1/x) dx is equal to:",a:"ln(x) + C",b:"x^2/2 + C",c:"-1/x^2 + C",d:"1 + C",ans:"a",diff:1},
  {slug:"integral-calculus",q:"Which rule is used for integration by parts?",a:"BODMAS",b:"LIATE",c:"L'Hopital",d:"Cramer's",ans:"b",diff:1},
  {slug:"vector-calculus",q:"The gradient of a scalar field is a:",a:"Scalar",b:"Vector",c:"Unitless quantity",d:"Zero always",ans:"b",diff:2},
  {slug:"vector-calculus",q:"Divergence of a vector field A is zero if the field is:",a:"Irrotational",b:"Solenoidal",c:"Conservative",d:"Harmonic",ans:"b",diff:3},
  {slug:"vector-calculus",q:"The curl of the gradient of any scalar field is always:",a:"1",b:"0",c:"Infinite",d:"Variable",ans:"b",diff:3},
  {slug:"stats-ds",q:"Variance is the square of:",a:"Mean",b:"Standard deviation",c:"Mode",d:"Range",ans:"b",diff:1},
  {slug:"stats-ds",q:"P-value is used in statistics for:",a:"Hypothesis testing",b:"Calculating average",c:"Data cleaning",d:"Visualization",ans:"a",diff:2},
  {slug:"stats-ds",q:"The median of {1, 3, 3, 6, 7, 8, 9} is:",a:"3",b:"6",c:"5",d:"7",ans:"b",diff:1},
  {slug:"software-engineering",q:"Waterfall model is a ________ software lifecycle model.",a:"Iterative",b:"Linear sequential",c:"Incremental",d:"Agile",ans:"b",diff:1},
  {slug:"software-engineering",q:"Which diagram is used to represent the static structure of a system in UML?",a:"Sequence diagram",b:"Class diagram",c:"Activity diagram",d:"Use case diagram",ans:"b",diff:2},
  {slug:"software-engineering",q:"Refactoring is done to improve:",a:"System features",b:"Internal code structure",c:"Performance speed",d:"UI design",ans:"b",diff:2},
  {slug:"compiler-design",q:"Lexical analysis is performed by:",a:"Parser",b:"Scanner",c:"Linker",d:"Optimizer",ans:"b",diff:1},
  {slug:"compiler-design",q:"A syntax tree is generated during which phase?",a:"Lexical analysis",b:"Syntax analysis",c:"Code generation",d:"Intermediate code",ans:"b",diff:2},
  {slug:"compiler-design",q:"Symbol table is managed by:",a:"Compiler",b:"Interpreter",c:"All phases of compiler",d:"Assembler",ans:"c",diff:3},
  {slug:"distributed-systems",q:"CAP theorem stands for:",a:"Capacity, Availability, Partition",b:"Consistency, Availability, Partition tolerance",c:"Connectivity, Access, Privacy",d:"Control, Automate, Plan",ans:"b",diff:2},
  {slug:"distributed-systems",q:"RPC stands for:",a:"Remote Process Communication",b:"Remote Procedure Call",c:"Remote Parallel Control",d:"Root Process Core",ans:"b",diff:1},
  {slug:"distributed-systems",q:"In a distributed system, clocks are synchronized using:",a:"CPU cycles",b:"NTP (Network Time Protocol)",c:"Manual time",d:"Local watches",ans:"b",diff:3},
  {slug:"structural-analysis-1",q:"A beam fixed at one end and free at other is called:",a:"Simply supported",b:"Cantilever",c:"Fixed",d:"Continuous",ans:"b",diff:1},
  {slug:"structural-analysis-1",q:"Bending moment is maximum where shear force:",a:"Is maximum",b:"Is zero or changes sign",c:"Is constant",d:"Is negative",ans:"b",diff:2},
  {slug:"structural-analysis-1",q:"The unit of bending moment is:",a:"N",b:"N-m",c:"N/m",d:"N/m^2",ans:"b",diff:1},
  {slug:"soil-mechanics",q:"Darcy's law relates flow velocity to:",a:"Pressure",b:"Hydraulic gradient",c:"Density",d:"Temperature",ans:"b",diff:2},
  {slug:"soil-mechanics",q:"The ratio of volume of voids to total volume is:",a:"Void ratio",b:"Porosity",c:"Degree of saturation",d:"Water content",ans:"b",diff:2},
  {slug:"soil-mechanics",q:"Soil compaction is done to increase:",a:"Permerability",b:"Dry density",c:"Void ratio",d:"Settlement",ans:"b",diff:1},
  {slug:"manufacturing-processes",q:"Lathe machine is primarily used for:",a:"Drilling",b:"Turning",c:"Milling",d:"Grinding",ans:"b",diff:1},
  {slug:"manufacturing-processes",q:"Casting involves pouring molten metal into a:",a:"Mould",b:"Furnace",c:"Forging press",d:"Cutter",ans:"a",diff:1},
  {slug:"manufacturing-processes",q:"Which process uses a non-consumable electrode?",a:"MIG welding",b:"TIG welding",c:"Arc welding",d:"Gas welding",ans:"b",diff:2},
  {slug:"machine-design",q:"Factor of safety is the ratio of:",a:"Allowable stress to yield stress",b:"Yield stress to allowable stress",c:"Failure load to working load",d:"Both b and c",ans:"d",diff:2},
  {slug:"machine-design",q:"A key is used to ________ between a shaft and a hub.",a:"Prevent axial movement",b:"Transmit torque",c:"Measure speed",d:"Reduce friction",ans:"b",diff:1},
  {slug:"machine-design",q:"The efficiency of a square threaded screw is maximum when the lead angle is:",a:"45 - φ/2",b:"90 degrees",c:"0 degrees",d:"45 degrees",ans:"a",diff:4},
  {slug:"industrial-engg-mgmt",q:"EOQ stands for:",a:"Economic Order Quantity",b:"Equal Order Quality",c:"Engineered Output Quota",d:"Estimated Output Quantity",ans:"a",diff:1},
  {slug:"industrial-engg-mgmt",q:"CPM and PERT are used for:",a:"Inventory control",b:"Project management",c:"Quality control",d:"Employee hiring",ans:"b",diff:1},
  {slug:"industrial-engg-mgmt",q:"Six Sigma aims to reduce:",a:"Costs",b:"Defects",c:"Time",d:"Employees",ans:"b",diff:2},
  {slug:"power-electronics",q:"An SCR (Silicon Controlled Rectifier) has ________ terminals.",a:"2",b:"3",c:"4",d:"5",ans:"b",diff:1},
  {slug:"power-electronics",q:"The process of turning OFF an SCR is called:",a:"Triggering",b:"Commutation",c:"Rectification",d:"Inversion",ans:"b",diff:2},
  {slug:"power-electronics",q:"Inverters convert:",a:"AC to DC",b:"DC to AC",c:"AC to AC",d:"DC to DC",ans:"b",diff:1},
  {slug:"drives-control",q:"A four-quadrant drive can operate in:",a:"Forward motoring and braking only",b:"All four quadrants of torque-speed plane",c:"Reverse motoring only",d:"Single direction only",ans:"b",diff:3},
  {slug:"drives-control",q:"Variable Frequency Drives (VFD) are primarily used with:",a:"DC motors",b:"Induction motors",c:"Stepper motors",d:"Servos",ans:"b",diff:2},
  {slug:"drives-control",q:"Braking where energy is returned to the source is:",a:"Dynamic braking",b:"Regenerative braking",c:"Plugging",d:"Friction braking",ans:"b",diff:3},
  {slug:"switchgear-protection",q:"A circuit breaker is designed to ________ an electrical circuit.",a:"Protect",b:"Interrupt",c:"Switch",d:"All of these",ans:"d",diff:1},
  {slug:"switchgear-protection",q:"The relay used for protection of transformers from internal faults is:",a:"Buchholz relay",b:"Overcurrent relay",c:"Directional relay",d:"Distance relay",ans:"a",diff:3},
  {slug:"switchgear-protection",q:"In a SF6 circuit breaker, the interrupting medium is:",a:"Air",b:"Oil",c:"Sulfur Hexafluoride gas",d:"Vacuum",ans:"c",diff:2},
  {slug:"high-voltage-engg",q:"Townsend discharge is a phenomenon in:",a:"Vacuum breakdown",b:"Gas breakdown",c:"Solid breakdown",d:"Liquid breakdown",ans:"b",diff:4},
  {slug:"high-voltage-engg",q:"A Cockcroft-Walton circuit is used for:",a:"HV AC generation",b:"HV DC generation",c:"Impulse generation",d:"Filtering",ans:"b",diff:3},
  {slug:"high-voltage-engg",q:"Standard impulse wave has a time-to-crest and time-to-half-value of:",a:"1.2/50 μs",b:"50/1.2 μs",c:"1/100 μs",d:"10/100 μs",ans:"a",diff:4},
  {slug:"renewable-energy",q:"Photovoltaic cells convert light energy into:",a:"Heat",b:"Electrical energy",c:"Kinetic energy",d:"Chemical energy",ans:"b",diff:1},
  {slug:"renewable-energy",q:"Betz limit (59.3%) is the theoretical maximum efficiency of:",a:"Solar panels",b:"Wind turbines",c:"Geothermal plants",d:"Tidal power",ans:"b",diff:3},
  {slug:"renewable-energy",q:"A grid-tied solar system ________ require batteries for daytime use.",a:"Does not necessarily",b:"Always",c:"Never",d:"Randomly",ans:"a",diff:2},
  {slug:"plc-automation",q:"PLC stands for:",a:"Private Line Control",b:"Programmable Logic Controller",c:"Parallel Loop Controller",d:"Process Load Center",ans:"b",diff:1},
  {slug:"plc-automation",q:"The primary programming language used for PLCs is:",a:"C++",b:"Ladder Logic",c:"Assembly",d:"Java",ans:"b",diff:1},
  {slug:"plc-automation",q:"In ladder logic, a parallel branch represents a _______ function.",a:"AND",b:"OR",c:"NOT",d:"NAND",ans:"b",diff:2},
];


// ─── Database helpers ──────────────────────────────────────────────────────────
function getConn() { const db = new Database(DB_PATH); db.pragma('foreign_keys = ON'); return db; }

export function initQuizSchema(seedQuestions = true) {
  const db = getConn();
  db.exec(QUIZ_SCHEMA);
  if (seedQuestions) {
    const insert = db.prepare(`INSERT OR IGNORE INTO quiz_questions (concept_slug, question_text, option_a, option_b, option_c, option_d, correct_option, difficulty) VALUES (?,?,?,?,?,?,?,?)`);
    for (const q of SEED_QUESTIONS) insert.run(q.slug, q.q, q.a, q.b, q.c, q.d, q.ans, q.diff);
    const count = db.prepare('SELECT COUNT(*) AS cnt FROM quiz_questions').get().cnt;
    console.log(`    Quiz questions seeded: ${count} total`);
  }
  db.close();
}

export function getQuestionsForConcept(slug, limit = 3) {
  const db = getConn();
  const rows = db.prepare('SELECT * FROM quiz_questions WHERE concept_slug=? LIMIT ?').all(slug, limit);
  db.close();
  return rows;
}

export function getQuestionsForConcepts(slugs, perConcept = 3) {
  const all = [];
  for (const slug of slugs) all.push(...getQuestionsForConcept(slug, perConcept));
  return all;
}

export function saveAttempt(studentId, conceptSlug, questionId, selectedOption, isCorrect, timeTakenSec = 30, hintUsed = false) {
  const db = getConn();
  const info = db.prepare(`INSERT INTO quiz_attempts (student_id, concept_slug, question_id, selected_option, is_correct, time_taken_sec, hint_used) VALUES (?,?,?,?,?,?,?)`).run(
    studentId, conceptSlug, questionId, selectedOption, isCorrect ? 1 : 0, timeTakenSec, hintUsed ? 1 : 0
  );
  db.close();
  return info.lastInsertRowid;
}

export function getAttempts(studentId, conceptSlug = null) {
  const db = getConn();
  let rows;
  if (conceptSlug) {
    rows = db.prepare('SELECT * FROM quiz_attempts WHERE student_id=? AND concept_slug=? ORDER BY attempted_at ASC').all(studentId, conceptSlug);
  } else {
    rows = db.prepare('SELECT * FROM quiz_attempts WHERE student_id=? ORDER BY attempted_at ASC').all(studentId);
  }
  db.close();
  return rows;
}

export function upsertMastery(studentId, conceptSlug, score) {
  const db = getConn();
  const row = db.prepare('SELECT id FROM concepts WHERE slug=?').get(conceptSlug);
  if (!row) { db.close(); return false; }
  const conceptId = row.id;
  const existing = db.prepare('SELECT id FROM mastery WHERE student_id=? AND concept_id=?').get(studentId, conceptId);
  if (existing) {
    db.prepare('UPDATE mastery SET score=?, updated_at=CURRENT_TIMESTAMP WHERE student_id=? AND concept_id=?').run(score, studentId, conceptId);
  } else {
    db.prepare('INSERT INTO mastery (student_id, concept_id, score) VALUES (?,?,?)').run(studentId, conceptId, score);
  }
  db.close();
  return true;
}

export function getAllMastery(studentId) {
  const db = getConn();
  const rows = db.prepare(`
    SELECT c.slug, c.name, c.difficulty, c.semester, s.name AS subject, m.score, m.updated_at
    FROM mastery m JOIN concepts c ON c.id=m.concept_id JOIN subjects s ON s.id=c.subject_id
    WHERE m.student_id=? ORDER BY s.name, c.name
  `).all(studentId);
  db.close();
  return rows;
}
