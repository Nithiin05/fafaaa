# Reference analysis: AAI JE (Operations) past papers

Source used for analysis only: Youth Competition Times, *AAI Junior Executive ATC/Airport Operations Solved Papers*.
Nothing from the book (questions, options, solutions) is copied into the question bank. This file records
patterns only, to calibrate the syllabus, weightage and difficulty of original questions.

## Papers reviewed (Airport Operations)

| Paper | Part A | Part B |
|---|---|---|
| 26.03.2021 Shift I | GK 15, Reasoning 15, Aptitude 15, English 15 | Maths 24, Physics 24, Management 12 |
| 26.03.2021 Shift II | same | same |
| 29.11.2018 | same | 60 mixed (Physics + Maths + ~12 Management) |
| 17.09.2016 | same (GK non-aviation) | Physics 30, Maths 30, no Management |

The 2021 papers match the 2026 structure in the platform spec exactly (15/15/15/15 + 24/24/12 = 120).
The 2016 paper predates Management in Part B; treat it as Physics/Maths practice only.

ATC papers in the book overlap on Part A (but ATC has 20 English and 10 GK) and on Physics/Maths.
They have no Management section.

## Findings that change the build

1. **GA section is mostly aviation.** About 11–12 of 15 GA questions in 2018 and both 2021 shifts were
   aviation (ICAO/IATA/DGCA/BCAS/AERA facts, apron/runway/taxiway definitions, ILS, CNS, METAR, forces
   on an aircraft, altimeter, aerofoil, airlines and manufacturers, airport codes/names, UDAN, customs
   green channel). Only 3–4 were static GK (history, geography, polity, health).
   → Mock generator should draw GA as roughly 11 aviation + 4 static GK.
2. **Part B Maths is Class 11–12 standard, not JEE Advanced.** Typical: limits, derivatives, definite
   integrals (Walli's type), area between curves, DEs (variable separable, integrating factor),
   determinants/adjoint/inverse, 3D lines and planes, vectors, conditional probability/Bayes, inverse
   trig, conics (focus, tangency), AP, relations/functions.
3. **Part B Physics is NCERT-level and formula-driven.** YDSE, mirror/lens formula, refractive index,
   Gauss/Coulomb, capacitors, current electricity, magnetic field of coils/solenoid, EMI, AC (LCR power,
   resonance), EM waves, photoelectric effect, de Broglie, Bohr, radioactivity, semiconductors and
   logic gates, units/dimensions/errors, SHM, pressure, elasticity.
   2016/2018 papers also had B.Sc-style items (lasers, ultrasonics, relativity) — lower priority.
4. **Management is theory recall.** Taylor, Fayol's 14 principles, Weber, Mayo/Hawthorne, McGregor X/Y,
   Ouchi Z, Mintzberg roles, Drucker MBO, Prahalad-Hamel core competence, levels of management,
   delegation, planning, strategy, HR functions, MIS, grapevine communication.
5. **English adds three topics missing from the spec:** idioms & phrases, one-word substitution,
   spelling. Reading comprehension appears as one passage with 4 questions.
6. **Reasoning adds:** mathematical operations (sign interchange), inequalities, letter-number-symbol
   series, statement & arguments, logical word order, mirror/water images, figure counting, dice.
7. **Quant adds:** mixture & alligation, partnership, problems on ages, discount (under profit & loss).
8. **The book's answer key has errors.** Several solutions are marked "official answer differs" or
   disagree with their own working. → Every question in our bank carries `is_verified`, and only
   verified questions go into full mocks.
