# AccessGraph — AI Development Contract

## 1. Project Overview

AccessGraph is an accessible diagram-based STEM learning platform.

The initial MVP focuses on introductory DC circuits and is designed to help
blind and low-vision students independently:

1. Explore circuit components and connections.
2. Make predictions about circuit behaviour.
3. Modify supported circuit properties/connections.
4. Run deterministic electrical simulations.
5. Compare predictions with observed results.
6. Reconstruct circuits without depending on visual layout.
7. Receive structural mismatch feedback.
8. Allow teachers to review learning evidence.

The core learning flow is:

Explore → Predict → Modify → Simulate → Compare → Reconstruct → Assess

---

# 2. Safe MVP Scope

The safe MVP supports ONLY:

- Resistors
- Ideal independent DC voltage sources
- Electrical nodes / wires
- Small introductory DC circuits

Do NOT add the following during the safe MVP:

- AI or LLM features
- AI agents
- multimodal models
- OCR
- arbitrary image recognition
- arbitrary SVG interpretation
- capacitors
- inductors
- transistors
- AC simulation
- dependent electrical sources
- arbitrary electrical-equivalence proofs
- authentication
- cloud infrastructure
- unnecessary backend services
- drag-and-drop as a required interaction

These may be considered only after the safe MVP works end-to-end.

---

# 3. Core Architectural Principle

There is ONE canonical Circuit model.

The same Circuit representation must power:

- Teacher review
- Student exploration
- Student editing
- Screen-reader descriptions
- Electrical simulation
- Reconstruction
- Structural verification
- Evidence recording

Do NOT create alternative circuit schemas inside different modules.

Visual position is NOT electrical connectivity.

Assessment must evaluate circuit structure, not drawing coordinates.

---

# 4. Shared Contract Files

The following files are project-wide contracts:

src/shared/types.ts
src/shared/demoCircuit.ts

Treat these files as FROZEN unless the human team explicitly agrees to modify
them.

An AI agent MUST NOT independently redesign these files.

If an agent believes the shared schema must change:

1. Stop implementation.
2. Explain the required change.
3. Explain why existing types are insufficient.
4. Wait for human approval.

Never silently modify the shared schema.

---

# 5. Golden Test Circuit

All developers must use the SAME golden circuit for integration testing.

Components:

V1 = ideal 6 V DC voltage source
R1 = 100 ohm resistor
R2 = 200 ohm resistor

Nodes:

A
B

Connections:

V1 positive → A
V1 negative → B

R1:
A ↔ B

R2:
A ↔ B

Expected initial electrical behaviour:

R1 current = 60 mA
R2 current = 30 mA
Total source current magnitude = 90 mA

After R1 is disconnected:

R1 current = 0 mA
R2 current remains 30 mA

These values must be CALCULATED by the simulation engine.

Do not hard-code simulation results into UI components.

---

# 6. Technology Stack

Use the existing project stack.

Primary stack:

- React
- TypeScript
- Vite
- Zod for validation where appropriate
- mathjs for matrix / numerical operations where appropriate
- Vitest
- Testing Library
- browser localStorage for MVP evidence persistence
- semantic HTML
- ARIA where appropriate

Do not introduce another framework unless clearly required and approved.

Avoid unnecessary dependencies.

---

# 7. Directory Ownership

The project is being developed by four developers working in parallel.

## Developer 1 — Circuit Core + Teacher

Primary ownership:

src/core/
src/teacher/

Responsibilities:

- Circuit validation
- Circuit utilities
- Structured teacher editing
- Teacher circuit review
- Circuit approval

---

## Developer 2 — Accessible Student Experience

Primary ownership:

src/student/

Responsibilities:

- Circuit overview
- Component exploration
- Connection exploration
- Keyboard-accessible interaction
- Prediction capture
- Structured circuit modification
- Simulation result presentation
- Reconstruction UI
- Accessible verifier feedback presentation

---

## Developer 3 — Electrical Simulation

Primary ownership:

src/simulation/

Responsibilities:

- Modified Nodal Analysis
- Node voltage calculation
- Resistor current calculation
- Voltage-source handling
- Invalid/unsolvable circuit detection
- Simulation unit tests

Primary API concept:

simulateCircuit(circuit)

The implementation must remain UI-independent.

---

## Developer 4 — Verification + Evidence

Primary ownership:

src/verification/
src/evidence/

Responsibilities:

- Structural circuit equivalence
- Node-renaming-independent matching
- Component/value/connectivity/polarity checking
- Explainable mismatch feedback
- Learning event logging
- localStorage persistence
- Teacher evidence timeline

Primary API concept:

verifyCircuit(reference, student)

---

# 8. Cross-Team Editing Rule

Do NOT casually modify another developer's owned directory.

If integration requires a change in another subsystem:

1. Identify the required interface.
2. Explain the change.
3. Prefer consuming the existing public API.
4. Avoid duplicating that subsystem's functionality.

Examples:

Student UI must NOT implement MNA.

Simulation code must NOT implement React UI.

Verification code must NOT calculate circuit simulation results.

Teacher validation must NOT implement structural graph equivalence.

---

# 9. Accessibility Requirements

Accessibility is a core product requirement, not decoration.

All essential student actions must work without:

- mouse precision
- dragging
- reading a graphical canvas
- color-only information

Prefer native semantic controls.

Use:

- proper headings
- labelled form controls
- native buttons
- semantic forms
- logical tab order
- visible keyboard focus
- aria-live only where dynamic announcements are useful

Do not add unnecessary custom keyboard systems when native browser behaviour is
sufficient.

A sighted developer using keyboard-only interaction does NOT constitute full
validation with blind or low-vision users.

Do not claim otherwise.

---

# 10. Simulation Rules

Circuit correctness must be deterministic.

The simulator must use electrical equations such as Modified Nodal Analysis.

Do NOT use:

- LLM reasoning
- AI-generated answers
- hard-coded demo outputs

Unsupported or unsolvable circuits must return useful errors rather than
fabricated measurements.

---

# 11. Structural Verification Rules

The reconstruction verifier checks STRUCTURAL equivalence.

Preserve:

- supported component types
- component counts
- required component values
- electrical connectivity
- voltage-source polarity
- designated terminal relationships where applicable

Ignore:

- node names
- x/y coordinates
- component drawing position
- wire bends
- visual layout

Example:

Reference nodes:

A, B

Student nodes:

X, Y

If connectivity is otherwise equivalent, the reconstruction may PASS.

Two circuits with the same equivalent resistance but different topology do NOT
automatically pass structural reconstruction.

---

# 12. Evidence Rules

Record meaningful learning events such as:

- initial prediction
- circuit edit
- simulation result
- reconstruction attempt
- verification result

Do NOT overwrite the learner's original prediction after the experiment.

Do NOT invent arbitrary mastery percentages for the safe MVP.

Prefer transparent event history.

---

# 13. Coding Rules

Before editing:

1. Inspect existing code.
2. Understand current types.
3. Reuse existing interfaces.
4. Check imports.
5. Check existing tests.

While implementing:

- Keep functions focused.
- Prefer readable TypeScript.
- Avoid unnecessary abstractions.
- Avoid duplicate logic.
- Do not leave dead experimental code.
- Do not suppress TypeScript errors without justification.
- Do not silently catch important errors.
- Do not replace working code simply because another implementation is possible.

---

# 14. Testing Rules

Every subsystem must have relevant tests.

At minimum, before declaring work complete:

Run the project's available test command.

Run:

npm run build

Fix all TypeScript/build errors caused by the change.

Never claim a feature works without testing it.

---

# 15. Git Rules

Branches:

feat/circuit-core
feat/student-accessibility
feat/simulation
feat/verification-evidence

Do not directly develop on main.

Prefer:

feature branch
→ review
→ develop
→ integration testing
→ main

Do not merge other developers' branches autonomously.

Human developers control integration and merges.

---

# 16. Integration Priority

The final MVP must work as ONE pipeline:

Teacher opens circuit
→
Teacher reviews/approves circuit
→
Student explores circuit
→
Student records prediction
→
Student modifies R1
→
Simulation recalculates circuit
→
Student sees result
→
Student reconstructs circuit
→
Structural verifier checks reconstruction
→
Useful feedback is returned
→
Teacher reviews evidence

A partially working collection of separate features is NOT considered a
finished MVP.

---

# 17. Safe MVP Acceptance Criteria

Before adding advanced functionality, verify:

- Teacher can open/review the sample circuit.
- Invalid teacher circuits cannot be approved.
- Student can navigate using keyboard-accessible controls.
- Circuit descriptions are generated from the Circuit model.
- Prediction is saved before simulation.
- Student can disconnect R1.
- Simulation recalculates actual electrical values.
- R2 remains approximately 30 mA after R1 is disconnected.
- Student can construct a structured reconstruction.
- Equivalent node renaming does not cause false rejection.
- Wrong connection is rejected.
- Wrong resistor value is rejected.
- Reversed source polarity is rejected.
- Mismatch feedback is understandable.
- Teacher can inspect learning evidence.
- Reset/reload behaviour is reliable.
- Build and tests pass.

Only after these conditions are satisfied should advanced AI features be
considered.

---

# 18. Deferred Phase 2 Features

DO NOT implement these during the safe MVP unless humans explicitly approve:

- multimodal circuit interpretation
- circuit image understanding
- tool-using AI assistant
- natural-language circuit manipulation
- AI-generated teacher activities
- AI-generated explanations
- structured SVG ingestion
- backend/database
- voice interaction
- additional electrical component families
- Edge AI
- multi-agent AI architecture

Future AI must assist the deterministic core, not replace it.

Electrical correctness continues to come from simulation algorithms.

Structural correctness continues to come from deterministic graph logic.

---

# 19. Rule for AI Agents

When starting any task:

1. Read this AGENTS.md.
2. Read src/shared/types.ts.
3. Read src/shared/demoCircuit.ts.
4. Inspect files relevant to your assigned subsystem.
5. Run/build the existing project when appropriate.
6. Create an implementation plan.
7. Avoid editing outside your ownership.
8. Preserve compatibility with all other modules.

If project instructions and your assumptions conflict:

THIS FILE WINS.

If the human developer gives an explicit newer instruction, follow the human
instruction and mention the conflict.