"""Quick-revision sheets (formulas and aviation facts). One line per fact: 'Label :: value'."""

NOTES = [
    # (subject_slug, category, title, body)
    ("physics", "formula", "Mechanics", """
Equations of motion :: v = u + at ; s = ut + ½at² ; v² = u² + 2as
Projectile range :: R = u² sin2θ / g (max at 45°)
Max height :: H = u² sin²θ / 2g
Newton's second law :: F = ma = dp/dt
Impulse :: J = FΔt = Δp
Work :: W = F·s·cosθ
Kinetic energy :: KE = ½mv² = p²/2m
Power :: P = W/t = F·v
Centripetal force :: F = mv²/r
Moment of inertia :: ring MR² ; disc ½MR² ; solid sphere ⅖MR² ; rod (centre) ML²/12
Angular momentum :: L = Iω (conserved when no external torque)
Gravitation :: F = Gm₁m₂/r² ; g = GM/R²
g at height h :: g' = g(1 − 2h/R) for h ≪ R ; g' = gR²/(R + h)²
Escape velocity :: vₑ = √(2gR) ≈ 11.2 km/s
Orbital velocity :: v₀ = √(gR) ≈ 7.9 km/s
"""),
    ("physics", "formula", "Fluids, Heat & Oscillations", """
Hydrostatic pressure :: P = ρgh
Bernoulli :: P + ½ρv² + ρgh = constant
Young's modulus :: Y = (F/A)/(ΔL/L)
First law of thermodynamics :: ΔQ = ΔU + ΔW
Isothermal (ideal gas) :: ΔU = 0 ; W = nRT ln(V₂/V₁)
Adiabatic :: PV^γ = constant ; Q = 0
Carnot efficiency :: η = 1 − T₂/T₁
RMS speed :: v_rms = √(3RT/M)
Simple pendulum :: T = 2π√(l/g)
Spring–mass :: T = 2π√(m/k)
Wave speed :: v = fλ
"""),
    ("physics", "formula", "Electricity & Magnetism", """
Coulomb's law :: F = kq₁q₂/r², k = 9 × 10⁹ N m²/C²
Gauss's law :: Φ = q/ε₀
Capacitance (parallel plate) :: C = ε₀A/d
Capacitors :: series 1/C = Σ1/Cᵢ ; parallel C = ΣCᵢ
Energy in capacitor :: U = ½CV²
Ohm's law :: V = IR
Resistors :: series R = ΣRᵢ ; parallel 1/R = Σ1/Rᵢ
Electric power :: P = VI = I²R = V²/R
Field at centre of loop :: B = μ₀I/2R
Field of long straight wire :: B = μ₀I/2πr
Solenoid :: B = μ₀nI
Lorentz force :: F = qvB sinθ
Faraday's law :: e = −dΦ/dt
AC :: V_rms = V₀/√2 ; resonance f = 1/(2π√LC) ; power factor cosφ = R/Z
Transformer :: Vs/Vp = Ns/Np
"""),
    ("physics", "formula", "Optics & Modern Physics", """
Mirror formula :: 1/v + 1/u = 1/f ; f = R/2
Lens formula :: 1/v − 1/u = 1/f
Power of lens :: P = 1/f (f in metres), unit dioptre
Refractive index :: n = c/v
Snell's law :: n₁ sinθ₁ = n₂ sinθ₂
YDSE fringe width :: β = λD/d
Photon energy :: E = hν = hc/λ
Photoelectric equation :: K_max = hν − φ
de Broglie :: λ = h/p ; electron: λ = 1.227/√V nm
Bohr energy (H) :: Eₙ = −13.6/n² eV
Radioactive decay :: N = N₀(½)^(t/T½)
Mass–energy :: E = mc² ; 1 u = 931.5 MeV
Constants :: c = 3×10⁸ m/s ; h = 6.63×10⁻³⁴ J s ; e = 1.6×10⁻¹⁹ C
"""),
    ("mathematics", "formula", "Algebra & Trigonometry", """
Quadratic roots :: x = [−b ± √(b² − 4ac)]/2a ; α+β = −b/a ; αβ = c/a
AP :: aₙ = a + (n−1)d ; Sₙ = n/2 [2a + (n−1)d]
GP :: aₙ = arⁿ⁻¹ ; S∞ = a/(1 − r), |r| < 1
Binomial :: T(r+1) = ⁿCᵣ aⁿ⁻ʳ bʳ ; (n + 1) terms
Combinations :: ⁿCᵣ = n!/[r!(n−r)!] ; ⁿPᵣ = n!/(n−r)!
Complex :: |a + ib| = √(a² + b²) ; i⁴ = 1
Identities :: sin²θ + cos²θ = 1 ; 1 + tan²θ = sec²θ
Compound angles :: sin(A±B) = sinA cosB ± cosA sinB
Double angle :: sin2A = 2 sinA cosA ; cos2A = 1 − 2sin²A
a sinx + b cosx :: range [−√(a²+b²), √(a²+b²)]
Inverse trig :: sin⁻¹x + cos⁻¹x = π/2 ; tan⁻¹x + cot⁻¹x = π/2
Determinants :: |kA| = kⁿ|A| ; |adj A| = |A|ⁿ⁻¹ ; A⁻¹ = adj A / |A|
"""),
    ("mathematics", "formula", "Calculus", """
Standard limit :: lim sinx/x = 1 (x→0) ; lim (eˣ − 1)/x = 1
Derivatives :: d(xⁿ) = nxⁿ⁻¹ ; d(sinx) = cosx ; d(eˣ) = eˣ ; d(ln x) = 1/x
Inverse trig derivatives :: d(tan⁻¹x) = 1/(1+x²) ; d(sin⁻¹x) = 1/√(1−x²)
Product / quotient :: (uv)′ = u′v + uv′ ; (u/v)′ = (u′v − uv′)/v²
Integration by parts :: ∫u dv = uv − ∫v du
Standard integrals :: ∫1/x dx = ln|x| ; ∫eˣ dx = eˣ ; ∫1/(1+x²) dx = tan⁻¹x
Definite property :: ∫₀ᵃ f(x)dx = ∫₀ᵃ f(a − x)dx
Odd/even :: ∫₋ₐᵃ odd = 0 ; ∫₋ₐᵃ even = 2∫₀ᵃ
Area between curves :: ∫ₐᵇ [f(x) − g(x)] dx
Linear DE :: dy/dx + Py = Q → IF = e^(∫P dx)
"""),
    ("mathematics", "formula", "Coordinate Geometry, Vectors & Probability", """
Slope :: m = (y₂ − y₁)/(x₂ − x₁)
Point–line distance :: |ax₁ + by₁ + c|/√(a² + b²)
Circle :: x² + y² + 2gx + 2fy + c = 0 → centre (−g, −f), r = √(g² + f² − c)
Parabola y² = 4ax :: focus (a, 0), directrix x = −a
Ellipse :: e = √(1 − b²/a²)
Hyperbola :: e = √(1 + b²/a²)
Dot product :: a·b = |a||b|cosθ
Cross product :: |a×b| = |a||b|sinθ
Point–plane distance :: |ax₁ + by₁ + cz₁ + d|/√(a² + b² + c²)
Probability :: P(A∪B) = P(A) + P(B) − P(A∩B)
Independent :: P(A∩B) = P(A)P(B)
Bayes :: P(Eᵢ|A) = P(Eᵢ)P(A|Eᵢ) / ΣP(Eⱼ)P(A|Eⱼ)
Variance :: σ² = Σ(x − x̄)²/n
"""),
    ("quant", "formula", "Arithmetic Shortcuts", """
Percentage change :: (new − old)/old × 100
Successive change :: a + b + ab/100
Profit % :: (SP − CP)/CP × 100
Discount :: SP = MP × (1 − d/100)
Simple interest :: SI = PRT/100
Compound interest :: A = P(1 + R/100)ᵀ
Ratio share :: part = (its ratio / sum of ratios) × total
Average :: sum / count
Time & work :: A and B together = ab/(a + b) days
Pipes :: net rate = fill rate − empty rate
Speed :: km/h × 5/18 = m/s
Train crossing :: time = (train length + object length)/relative speed
Boats :: stream = (down − up)/2 ; boat = (down + up)/2
Alligation :: cheaper : dearer = (dearer − mean) : (mean − cheaper)
Partnership :: profit ∝ capital × time
"""),
    ("ga-aviation", "aviation_fact", "Organisations", """
ICAO :: UN agency, HQ Montreal; created by the Chicago Convention, 7 Dec 1944
IATA :: Trade association of airlines, founded 1945 in Havana
ACI :: Airports Council International — association of airport operators
DGCA :: India's civil aviation regulator (safety, licensing, airworthiness)
BCAS :: Regulator for civil aviation security in India
AAI :: Formed 1 April 1995 under the AAI Act 1994; manages airports and air navigation services
AERA :: Sets tariffs for aeronautical services at major airports (AERA Act 2008)
CISF :: Provides security at many Indian airports
MoCA :: Ministry of Civil Aviation — parent ministry of DGCA, BCAS, AAI
"""),
    ("ga-aviation", "aviation_fact", "Airport Codes & Airports", """
DEL :: Delhi — Indira Gandhi International (ICAO VIDP)
BOM :: Mumbai — Chhatrapati Shivaji Maharaj International (VABB)
MAA :: Chennai International (VOMM)
CCU :: Kolkata — Netaji Subhas Chandra Bose International (VECC)
BLR :: Bengaluru — Kempegowda International
HYD :: Hyderabad — Rajiv Gandhi International
COK :: Kochi — Cochin International (first fully solar-powered airport)
AMD :: Ahmedabad — Sardar Vallabhbhai Patel International
GAU :: Guwahati — Lokpriya Gopinath Bordoloi International
LKO :: Lucknow — Chaudhary Charan Singh International
ICAO prefix :: Indian ICAO location indicators start with V
"""),
    ("ga-aviation", "aviation_fact", "Abbreviations & ATC", """
ATC :: Air Traffic Control
CNS/ATM :: Communication, Navigation, Surveillance / Air Traffic Management
ILS :: Instrument Landing System — localizer (lateral) + glide slope (vertical)
VOR :: VHF Omnidirectional Range
DME :: Distance Measuring Equipment
NDB :: Non-Directional Beacon
METAR :: Routine aerodrome weather report
TAF :: Terminal Aerodrome Forecast
NOTAM :: Notice to Airmen
ETA / ETD :: Estimated Time of Arrival / Departure
Squawk codes :: 7500 hijack ; 7600 radio failure ; 7700 emergency
ICAO Annexes :: 9 Facilitation ; 14 Aerodromes ; 17 Security ; 19 Safety Management
"""),
    ("ga-aviation", "aviation_fact", "Airport Processes & Areas", """
Passenger flow :: Check-in → security screening → (immigration) → boarding gate → aircraft
Airside / landside :: Airside is beyond security screening; landside is open to the public
Apron :: Area for parking, loading, refuelling and boarding
Taxiway :: Path linking runways with aprons and hangars
Runway numbering :: Magnetic heading ÷ 10; opposite ends differ by 18 (09/27)
Aerobridge :: Passenger boarding bridge from gate to aircraft door
Customs :: Green Channel = nothing to declare ; Red Channel = goods to declare
Baggage :: Hold (checked) baggage in the cargo hold ; cabin baggage with the passenger
Four forces of flight :: Lift ↔ weight ; thrust ↔ drag
Flight recorders :: CVR + FDR, painted bright orange
UDAN :: Regional Connectivity Scheme under the National Civil Aviation Policy 2016
"""),
]
