'use strict';
/**
 * 32 Indian scholarship schemes with structured eligibility rules.
 * IMPORTANT: verified:false on every entry. Amounts, income caps and deadlines are
 * approximations compiled from memory of past cycles and MUST be checked against the
 * official portal (scholarships.gov.in or the state portal in `url`) before use.
 * Deadlines are indicative placeholders for the 2026-27 cycle.
 */
const fmt = n => '₹' + n.toLocaleString('en-IN');
const inc = n => ({ field: 'annualIncome', operator: '<=', value: n, label: `Family income up to ${fmt(n)}` });
const cat = a => ({ field: 'category', operator: 'in', value: a, label: `Category: ${a.join(' / ')}` });
const gen = g => ({ field: 'gender', operator: '=', value: g, label: `Gender: ${g}` });
const dom = a => ({ field: 'domicile', operator: 'in', value: a, label: `Domicile: ${a.join(' / ')}` });
const deg = a => ({ field: 'degree', operator: 'in', value: a, label: `Degree: ${a.join(' / ')}` });
const lvl = a => ({ field: 'level', operator: 'in', value: a, label: `Level: ${a.join(' / ')}` });
const pct = n => ({ field: 'percentage', operator: '>=', value: n, label: `At least ${n}% marks` });
const yr = a => ({ field: 'academicYear', operator: 'in', value: a, label: `Academic year: ${a.join(' / ')}` });
const flag = (f, label) => ({ field: f, operator: '=', value: 'yes', label });
const all = (...x) => ({ all: x });
const any = (...x) => ({ any: x });
const NSP = 'https://scholarships.gov.in';
const NE = ['Arunachal Pradesh', 'Assam', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'];
const REQ = ['Income certificate', 'Caste certificate', 'Previous marksheet', 'Bonafide certificate', 'Bank passbook', 'Passport photo'];

let n = 0;
function S(name, provider, type, amount, deadline, rule, o = {}) {
  n += 1;
  return { id: 'S' + String(n).padStart(2, '0'), name, provider, type, amount, deadline, rule,
    documents: o.docs || ['Income certificate', 'Previous marksheet', 'Bonafide certificate', 'Bank passbook'],
    renewal: o.renewal || 'Renew yearly; minimum passing marks and attendance usually required.',
    exclusiveGroup: o.group || null, meta: o.meta || {}, url: o.url || NSP, verified: false };
}

module.exports = [
  S('Post-Matric Scholarship for SC Students', 'Ministry of Social Justice (NSP)', 'Government', 13500, '2026-12-31',
    all(cat(['SC']), inc(250000), lvl(['UG', 'PG', 'Diploma'])), { group: 'central-post-matric', docs: REQ, meta: { incomeMax: 250000 } }),
  S('Post-Matric Scholarship for ST Students', 'Ministry of Tribal Affairs (NSP)', 'Government', 13500, '2026-12-31',
    all(cat(['ST']), inc(250000), lvl(['UG', 'PG', 'Diploma'])), { group: 'central-post-matric', docs: REQ, meta: { incomeMax: 250000 } }),
  S('PM YASASVI Post-Matric for OBC/EBC/DNT', 'Ministry of Social Justice (NSP)', 'Government', 12000, '2026-12-31',
    all(cat(['OBC', 'BC']), inc(250000), lvl(['UG', 'PG', 'Diploma'])), { group: 'central-post-matric', docs: REQ, meta: { incomeMax: 250000 } }),
  S('Top Class Education for SC Students', 'Ministry of Social Justice (NSP)', 'Government', 200000, '2026-11-30',
    all(cat(['SC']), inc(800000), pct(60)), { docs: REQ, meta: { incomeMax: 800000, minPercent: 60 } }),
  S('Central Sector Scheme of Scholarship for College & University Students', 'Dept. of Higher Education (NSP)', 'Government', 12000, '2026-12-31',
    all(inc(450000), pct(80), lvl(['UG', 'PG'])), { meta: { incomeMax: 450000, minPercent: 80 }, renewal: 'Renew yearly with 50% marks and attendance.' }),
  S('Pragati Scholarship for Girls (Technical Education)', 'AICTE', 'Government', 50000, '2026-12-31',
    all(gen('Female'), inc(800000), deg(['Engineering', 'Pharmacy', 'Architecture']), yr([1, 2])),
    { meta: { incomeMax: 800000 }, url: 'https://www.aicte-india.org', renewal: 'Renewed yearly on passing; max 2 girls per family.' }),
  S('Saksham Scholarship for Specially-Abled Students', 'AICTE', 'Government', 50000, '2026-12-31',
    all(flag('disability', 'Has 40%+ benchmark disability'), inc(800000), deg(['Engineering', 'Pharmacy', 'Architecture'])),
    { docs: ['Disability certificate', 'Income certificate', 'Admission proof', 'Bank passbook'], meta: { incomeMax: 800000 }, url: 'https://www.aicte-india.org' }),
  S('Swanath Scholarship for Orphans & Wards of Deceased Parents', 'AICTE', 'Government', 50000, '2026-12-31',
    all(flag('orphan', 'Orphan or ward of deceased/disabled parent'), deg(['Engineering', 'Pharmacy', 'Architecture'])),
    { docs: ['Death certificate of parent', 'Admission proof', 'Bank passbook'], url: 'https://www.aicte-india.org' }),
  S('Reliance Foundation Undergraduate Scholarship', 'Reliance Foundation', 'Private', 200000, '2026-10-31',
    all(inc(1500000), yr([1]), lvl(['UG']), pct(60)), { meta: { incomeMax: 1500000, minPercent: 60 }, url: 'https://www.reliancefoundation.org', renewal: 'Renewable with satisfactory yearly performance.' }),
  S('Reliance Foundation Postgraduate Scholarship', 'Reliance Foundation', 'Private', 600000, '2026-10-31',
    all(lvl(['PG']), yr([1]), { field: 'percentage', operator: '>=', value: 7.5 * 10 - 5, label: 'Strong academic record (GATE/CGPA ~7.5+)' }),
    { url: 'https://www.reliancefoundation.org', meta: { minPercent: 70 } }),
  S('Telangana ePASS Post-Matric Scholarship', 'Telangana Govt (ePASS)', 'State', 25000, '2027-01-31',
    all(dom(['Telangana']), any(all(cat(['SC', 'ST']), inc(250000)), all(cat(['BC', 'EWS', 'OBC']), inc(200000)))),
    { group: 'state-post-matric', docs: REQ, meta: { incomeMax: 250000 }, url: 'https://telanganaepass.cgg.gov.in', renewal: 'Renew yearly; 75% attendance.' }),
  S('Jagananna Vidya Deevena (Fee Reimbursement)', 'Andhra Pradesh Govt', 'State', 30000, '2027-01-31',
    all(dom(['Andhra Pradesh']), inc(250000), cat(['SC', 'ST', 'BC', 'OBC', 'EWS'])),
    { group: 'state-post-matric', docs: REQ, meta: { incomeMax: 250000 }, url: 'https://jnanabhumi.ap.gov.in' }),
  S('Karnataka SSP Post-Matric Scholarship', 'Karnataka Govt (SSP)', 'State', 20000, '2027-01-15',
    all(dom(['Karnataka']), cat(['SC', 'ST', 'OBC', 'BC']), inc(250000)),
    { group: 'state-post-matric', docs: REQ, meta: { incomeMax: 250000 }, url: 'https://ssp.postmatric.karnataka.gov.in' }),
  S('Pudhumai Penn Assistance Scheme', 'Tamil Nadu Govt', 'State', 12000, '2027-02-28',
    all(gen('Female'), dom(['Tamil Nadu']), lvl(['UG', 'Diploma'])), { docs: ['Aadhaar-free ID proof (college ID)', 'Bonafide certificate', 'Bank passbook'], url: 'https://www.tn.gov.in' }),
  S('Rajarshi Shahu Maharaj Scholarship (Fee Concession)', 'Maharashtra Govt', 'State', 40000, '2027-01-31',
    all(dom(['Maharashtra']), inc(800000), cat(['OBC', 'BC', 'EWS', 'General'])), { group: 'state-post-matric', meta: { incomeMax: 800000 }, url: 'https://mahadbt.maharashtra.gov.in' }),
  S('Kerala E-Grantz', 'Kerala Govt', 'State', 15000, '2027-01-31',
    all(dom(['Kerala']), cat(['SC', 'ST', 'OBC', 'BC', 'EWS']), inc(250000)), { group: 'state-post-matric', meta: { incomeMax: 250000 }, url: 'https://egrantz.kerala.gov.in' }),
  S('Swami Vivekananda Merit-cum-Means (SVMCM)', 'West Bengal Govt', 'State', 60000, '2026-12-15',
    all(dom(['West Bengal']), inc(250000), pct(60)), { meta: { incomeMax: 250000, minPercent: 60 }, url: 'https://svmcm.wbhed.gov.in' }),
  S('UP Post-Matric Scholarship', 'Uttar Pradesh Govt', 'State', 18000, '2027-01-31',
    all(dom(['Uttar Pradesh']), inc(250000), cat(['SC', 'ST', 'OBC', 'BC', 'General', 'EWS'])), { group: 'state-post-matric', meta: { incomeMax: 250000 }, url: 'https://scholarship.up.gov.in' }),
  S('Bihar Post-Matric Scholarship', 'Bihar Govt', 'State', 15000, '2027-01-31',
    all(dom(['Bihar']), cat(['SC', 'ST', 'OBC', 'BC']), inc(250000)), { group: 'state-post-matric', meta: { incomeMax: 250000 }, url: 'https://pmsonline.bihar.gov.in' }),
  S('Rajasthan Post-Matric Scholarship', 'Rajasthan Govt', 'State', 15000, '2027-01-31',
    all(dom(['Rajasthan']), cat(['SC', 'ST', 'OBC', 'BC']), inc(250000)), { group: 'state-post-matric', meta: { incomeMax: 250000 }, url: 'https://sjmsnew.rajasthan.gov.in' }),
  S('HDFC Parivartan ECSS (Badhte Kadam)', 'HDFC Bank Parivartan', 'Private', 75000, '2026-12-31',
    all(inc(600000), pct(55), lvl(['UG', 'PG', 'Diploma'])), { meta: { incomeMax: 600000, minPercent: 55 }, url: 'https://www.buddy4study.com' }),
  S('Tata Capital Pankh Scholarship', 'Tata Capital', 'Private', 40000, '2026-12-20',
    all(inc(400000), pct(60), yr([1, 2, 3, 4])), { meta: { incomeMax: 400000, minPercent: 60 }, url: 'https://www.buddy4study.com' }),
  S('Kotak Kanya Scholarship', 'Kotak Education Foundation', 'Private', 150000, '2026-12-31',
    all(gen('Female'), inc(600000), pct(75), deg(['Engineering', 'Medicine']), yr([1])),
    { meta: { incomeMax: 600000, minPercent: 75 }, url: 'https://www.kotakeducation.org' }),
  S('LIC Golden Jubilee Scholarship', 'LIC of India', 'Private', 20000, '2026-12-31',
    all(inc(250000), pct(60), lvl(['UG', 'PG', 'Diploma']), yr([1])), { meta: { incomeMax: 250000, minPercent: 60 }, url: 'https://licindia.in' }),
  S('Infosys Foundation STEM Stars (Girls)', 'Infosys Foundation', 'Private', 100000, '2026-11-30',
    all(gen('Female'), deg(['Engineering', 'Science']), inc(800000), pct(65)), { meta: { incomeMax: 800000, minPercent: 65 }, url: 'https://www.infosys.org' }),
  S('Ishan Uday Special Scholarship (North East)', 'UGC', 'Government', 84000, '2026-12-31',
    all(dom(NE), inc(450000), lvl(['UG']), pct(50)), { meta: { incomeMax: 450000, minPercent: 50 }, url: 'https://ugc.gov.in' }),
  S('UGC Single Girl Child Scholarship (PG)', 'UGC', 'Government', 36200, '2026-12-31',
    all(gen('Female'), lvl(['PG']), flag('singleGirlChild', 'Only girl child of parents')), { url: 'https://ugc.gov.in' }),
  S('Sitaram Jindal Foundation Scholarship', 'Sitaram Jindal Foundation', 'Private', 24000, '2027-01-31',
    all(inc(300000), pct(60)), { meta: { incomeMax: 300000, minPercent: 60 }, url: 'https://www.sitaramjindalfoundation.org' }),
  S('Aditya Birla Capital Scholarship', 'Aditya Birla Group', 'Private', 60000, '2026-12-31',
    all(inc(500000), pct(70), deg(['Engineering', 'Management', 'Commerce', 'Law'])), { meta: { incomeMax: 500000, minPercent: 70 }, url: 'https://www.buddy4study.com' }),
  S('EWS & General Category Merit Scholarship (Indicative)', 'Various institutions', 'Private', 25000, '2027-01-31',
    all(any(cat(['EWS']), cat(['General'])), inc(800000), pct(75)), { meta: { incomeMax: 800000, minPercent: 75 }, url: 'https://www.buddy4study.com' }),
  S('Minority-Excluded Merit Scheme (NOT-rule demo)', 'Demo scheme', 'Private', 18000, '2027-01-31',
    all(pct(65), { not: cat(['SC', 'ST']), label: 'Not already covered by SC/ST schemes' }), { meta: { minPercent: 65 }, url: NSP })
];
