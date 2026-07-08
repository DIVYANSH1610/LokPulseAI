# Ayushman Bharat Health Infrastructure Mission (ABHIM)

Category: Health

ABHIM funds construction and upgrade of Primary Health Centres (PHCs),
Community Health Centres (CHCs), and block-level public health units,
with priority given to underserved rural wards. Eligible works include
new PHC construction, diagnostic lab additions, and telemedicine hubs.

Typical funding norms: a new PHC serving a population of 20,000-30,000
is costed in the range of ₹1.5-3 crore depending on bed capacity and
whether it includes a maternal health wing. Sanctioned works must show
population served, distance to the next-nearest facility, and existing
health index data as justification — this maps directly onto the
`ward_profiles.population`, `nearest_phc_km`, and `health_index` fields
already tracked by LokPulse AI.

Priority is explicitly higher for wards flagged flood-prone or with
health indices below the district average, since these populations
face compounding access barriers during monsoon season.
