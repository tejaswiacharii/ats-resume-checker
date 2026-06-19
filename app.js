/* ============================================
   ATS Resume Score Checker — Core Engine
   ============================================ */

// --- PDF.js Worker ---
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ========== DOM ELEMENTS ==========
const resumeDropzone = document.getElementById('resume-dropzone');
const resumeFileInput = document.getElementById('resume-input');
const resumeFileInfo = document.getElementById('resume-file-info');
const resumeFileName = document.getElementById('resume-file-name');
const resumeFileSize = document.getElementById('resume-file-size');
const resumeFileRemove = document.getElementById('resume-file-remove');
const resumeTextarea = document.getElementById('resume-textarea');
const jdTextarea = document.getElementById('jd-textarea');
const btnAnalyze = document.getElementById('btn-analyze');
const btnReanalyze = document.getElementById('btn-reanalyze');
const uploadSection = document.getElementById('upload-section');
const resultsSection = document.getElementById('results-section');
const heroSection = document.getElementById('hero-section');
const navResults = document.getElementById('nav-results');

// ========== STATE ==========
let resumeText = '';
let resumeFile = null;

// ========== CONSTANTS ==========
const ACTION_VERBS = [
    'achieved','administered','analyzed','applied','assembled','assessed','budgeted',
    'built','calculated','captured','coached','collaborated','communicated','completed',
    'composed','conceived','conducted','consolidated','contracted','contributed',
    'controlled','converted','coordinated','created','cultivated','customized',
    'decreased','defined','delivered','demonstrated','designed','developed','devised',
    'diagnosed','directed','discovered','doubled','drove','earned','edited','educated',
    'eliminated','enabled','encouraged','engineered','enhanced','ensured','established',
    'evaluated','examined','exceeded','executed','expanded','expedited','facilitated',
    'finalized','forecasted','formulated','founded','generated','governed','grew','guided',
    'headed','identified','illustrated','implemented','improved','improvised','increased',
    'influenced','informed','initiated','innovated','inspected','installed','instituted',
    'integrated','interpreted','introduced','invented','investigated','launched','led',
    'leveraged','maintained','managed','mapped','marketed','maximized','measured',
    'mediated','mentored','minimized','modernized','modified','monitored','motivated',
    'navigated','negotiated','operated','optimized','orchestrated','organized','outpaced',
    'overhauled','oversaw','partnered','performed','piloted','pioneered','planned',
    'prepared','presented','prioritized','processed','produced','programmed','projected',
    'promoted','proposed','provided','published','purchased','raised','ranked',
    'recommended','reconciled','redesigned','reduced','refined','regulated','rehabilitated',
    'remodeled','reorganized','represented','researched','resolved','restored','restructured',
    'revamped','reviewed','revitalized','scheduled','secured','simplified','solved',
    'spearheaded','standardized','steered','stimulated','streamlined','strengthened',
    'structured','supervised','surpassed','sustained','synchronized','systematized',
    'targeted','trained','transformed','translated','tripled','troubleshot','unified',
    'upgraded','utilized','validated','verified','volunteered','won'
];

const ESSENTIAL_SECTIONS = {
    contact: {
        patterns: [/\b[\w.+-]+@[\w-]+\.[\w.]+\b/i, /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, /\+\d{1,3}[-.\s]?\d+/],
        keywords: ['email', 'phone', 'tel', 'mobile', 'address', 'linkedin', 'github', 'portfolio', 'website']
    },
    summary: {
        keywords: ['summary', 'objective', 'professional summary', 'career objective', 'profile', 'about me', 'career summary', 'professional profile']
    },
    experience: {
        keywords: ['experience', 'work experience', 'professional experience', 'employment', 'work history', 'career history', 'positions held', 'relevant experience']
    },
    education: {
        keywords: ['education', 'academic', 'qualification', 'degree', 'university', 'college', 'school', 'certification', 'certifications', 'bachelor', 'master', 'phd', 'diploma']
    },
    skills: {
        keywords: ['skills', 'technical skills', 'core competencies', 'competencies', 'proficiencies', 'expertise', 'technologies', 'tools', 'programming languages', 'soft skills', 'key skills']
    }
};

const FILLER_WORDS = [
    'responsible for', 'duties included', 'helped with', 'assisted in', 'worked on',
    'was responsible', 'in charge of', 'participated in', 'involved in', 'tasked with'
];

const ATS_UNFRIENDLY = [
    'header', 'footer', 'table', 'column', 'text box', 'image',
    'chart', 'graph', 'infographic', 'icon', 'logo'
];


// ========== FILE HANDLING ==========

// Upload tabs
document.querySelectorAll('.upload-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const parent = tab.closest('.card');
        parent.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
        parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.target).classList.add('active');
        updateAnalyzeButton();
    });
});

// Nav pills
document.querySelectorAll('.nav-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        const section = pill.dataset.section;
        if (section === 'upload') {
            showUpload();
        } else if (section === 'results') {
            showResults();
        }
    });
});

// Dropzone events
resumeDropzone.addEventListener('click', () => resumeFileInput.click());

resumeDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    resumeDropzone.classList.add('dragover');
});

resumeDropzone.addEventListener('dragleave', () => {
    resumeDropzone.classList.remove('dragover');
});

resumeDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    resumeDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

resumeFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

resumeFileRemove.addEventListener('click', () => {
    resumeFile = null;
    resumeText = '';
    resumeFileInput.value = '';
    resumeFileInfo.classList.add('hidden');
    resumeDropzone.classList.remove('hidden');
    updateAnalyzeButton();
});

// Text input listener
resumeTextarea.addEventListener('input', updateAnalyzeButton);
jdTextarea.addEventListener('input', updateAnalyzeButton);

function handleFile(file) {
    const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
    ];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(file.type) && !['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
        alert('Please upload a PDF, DOCX, or TXT file.');
        return;
    }
    resumeFile = file;
    resumeFileName.textContent = file.name;
    resumeFileSize.textContent = formatFileSize(file.size);
    resumeDropzone.classList.add('hidden');
    resumeFileInfo.classList.remove('hidden');
    updateAnalyzeButton();
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function updateAnalyzeButton() {
    const hasFile = resumeFile !== null;
    const hasText = resumeTextarea.value.trim().length > 50;
    btnAnalyze.disabled = !(hasFile || hasText);
}


// ========== FILE PARSING ==========

async function extractTextFromFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'txt') {
        return await file.text();
    }
    
    if (ext === 'pdf') {
        return await extractTextFromPDF(file);
    }
    
    if (ext === 'docx' || ext === 'doc') {
        return await extractTextFromDOCX(file);
    }
    
    throw new Error('Unsupported file format');
}

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
}

async function extractTextFromDOCX(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}


// ========== ANALYSIS ENGINE ==========

function analyzeResume(text, jobDescription = '') {
    const lower = text.toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);

    const results = {
        totalScore: 0,
        categories: {},
        remarks: [],
        actions: [],
        keywordsFound: [],
        keywordsMissing: []
    };

    // 1. CONTACT INFORMATION (15 pts)
    const contactScore = analyzeContact(text, lower, results);
    results.categories.contact = contactScore;

    // 2. SECTION STRUCTURE (15 pts)
    const structureScore = analyzeStructure(lower, results);
    results.categories.structure = structureScore;

    // 3. WORK EXPERIENCE QUALITY (15 pts)
    const experienceScore = analyzeExperience(text, lower, words, results);
    results.categories.experience = experienceScore;

    // 4. ACTION VERBS & LANGUAGE (10 pts)
    const languageScore = analyzeLanguage(text, lower, words, results);
    results.categories.language = languageScore;

    // 5. QUANTIFIABLE ACHIEVEMENTS (10 pts)
    const achievementsScore = analyzeAchievements(text, results);
    results.categories.achievements = achievementsScore;

    // 6. SKILLS SECTION (10 pts)
    const skillsScore = analyzeSkills(text, lower, results);
    results.categories.skills = skillsScore;

    // 7. FORMATTING & LENGTH (10 pts)
    const formattingScore = analyzeFormatting(text, wordCount, lines, results);
    results.categories.formatting = formattingScore;

    // 8. ATS COMPATIBILITY (15 pts)
    const atsScore = analyzeATSCompatibility(text, lower, results);
    results.categories.ats = atsScore;

    // 9. KEYWORD MATCHING (bonus analysis if JD provided)
    if (jobDescription.trim().length > 20) {
        analyzeKeywords(text, lower, jobDescription, results);
    }

    // Calculate total
    results.totalScore = Math.round(
        contactScore.score + structureScore.score + experienceScore.score +
        languageScore.score + achievementsScore.score + skillsScore.score +
        formattingScore.score + atsScore.score
    );

    // Clamp
    results.totalScore = Math.min(100, Math.max(0, results.totalScore));

    // Sort actions by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    results.actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return results;
}


function analyzeContact(text, lower, results) {
    let score = 0;
    const maxScore = 15;
    const issues = [];
    const found = [];

    // Email
    const emailMatch = text.match(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/);
    if (emailMatch) {
        score += 4;
        found.push('Email address');
    } else {
        issues.push('No email address found');
    }

    // Phone
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) {
        score += 4;
        found.push('Phone number');
    } else {
        issues.push('No phone number found');
    }

    // Name (assume first non-empty line that is short)
    const firstLines = text.split('\n').filter(l => l.trim()).slice(0, 3);
    const hasName = firstLines.some(l => l.trim().length > 2 && l.trim().length < 60 && !/[@]/.test(l));
    if (hasName) {
        score += 3;
        found.push('Name detected');
    } else {
        issues.push('Name may not be clearly positioned at the top');
    }

    // LinkedIn
    if (lower.includes('linkedin.com') || lower.includes('linkedin')) {
        score += 2;
        found.push('LinkedIn profile');
    } else {
        issues.push('No LinkedIn profile URL found');
    }

    // Location
    const locationWords = ['city', 'state', 'country', 'location', ','];
    const hasLocation = firstLines.some(l => {
        const lLine = l.toLowerCase();
        return locationWords.some(w => lLine.includes(w)) || /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/.test(l);
    });
    if (hasLocation) {
        score += 2;
        found.push('Location');
    }

    score = Math.min(maxScore, score);

    const status = score >= 12 ? 'pass' : score >= 8 ? 'warn' : 'fail';
    const remark = {
        category: 'Contact Information',
        status,
        title: status === 'pass' ? 'Contact information is complete' : 'Contact information needs improvement',
        text: found.length ? `Found: ${found.join(', ')}.` : 'Very little contact information detected.',
        suggestion: issues.length ? `Add the following: ${issues.join('; ')}.` : ''
    };
    results.remarks.push(remark);

    if (issues.length > 0) {
        results.actions.push({
            priority: score < 8 ? 'critical' : 'high',
            text: `<strong>Add missing contact info:</strong> ${issues.join(', ')}. ATS systems rely on this to create your candidate profile.`
        });
    }

    return { score, maxScore, label: 'Contact Info', emoji: '📋', remark: found.join(', ') || 'Missing' };
}


function analyzeStructure(lower, results) {
    let score = 0;
    const maxScore = 15;
    const foundSections = [];
    const missingSections = [];

    const sectionChecks = {
        summary: { weight: 2, label: 'Summary/Objective' },
        experience: { weight: 5, label: 'Work Experience' },
        education: { weight: 4, label: 'Education' },
        skills: { weight: 4, label: 'Skills' }
    };

    for (const [key, config] of Object.entries(sectionChecks)) {
        const sectionDef = ESSENTIAL_SECTIONS[key];
        const found = sectionDef.keywords.some(kw => lower.includes(kw));
        if (found) {
            score += config.weight;
            foundSections.push(config.label);
        } else {
            missingSections.push(config.label);
        }
    }

    score = Math.min(maxScore, score);

    const status = score >= 12 ? 'pass' : score >= 8 ? 'warn' : 'fail';
    results.remarks.push({
        category: 'Section Structure',
        status,
        title: missingSections.length === 0 ? 'All essential sections present' : `Missing sections: ${missingSections.join(', ')}`,
        text: `Found sections: ${foundSections.join(', ') || 'None'}. ATS systems specifically look for standard section headers to parse your resume correctly.`,
        suggestion: missingSections.length ? `Add these sections with clear headers: ${missingSections.join(', ')}. Use standard naming conventions (e.g., "Work Experience" instead of "Where I've Been").` : 'Great job! All key sections are present.'
    });

    if (missingSections.length > 0) {
        results.actions.push({
            priority: missingSections.includes('Work Experience') ? 'critical' : 'high',
            text: `<strong>Add missing sections:</strong> ${missingSections.join(', ')}. Use clear, standard section headers that ATS systems can easily recognize.`
        });
    }

    return { score, maxScore, label: 'Structure', emoji: '🏗️', remark: `${foundSections.length}/4 sections found` };
}


function analyzeExperience(text, lower, words, results) {
    let score = 0;
    const maxScore = 15;
    const issues = [];

    // Check for date patterns (indication of timeline)
    const datePatterns = [
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}/gi,
        /\b\d{4}\s*[-–—]\s*(present|\d{4})/gi,
        /\b\d{2}\/\d{4}/g
    ];
    
    let dateCount = 0;
    for (const pattern of datePatterns) {
        const matches = text.match(pattern);
        if (matches) dateCount += matches.length;
    }

    if (dateCount >= 4) {
        score += 5;
    } else if (dateCount >= 2) {
        score += 3;
        issues.push('Limited date/timeline information');
    } else {
        issues.push('No employment dates found — ATS systems need clear timelines');
    }

    // Check for job titles / company names (uppercase lines or lines with specific patterns)
    const titlePatterns = /\b(engineer|developer|manager|analyst|designer|director|coordinator|specialist|consultant|intern|associate|lead|senior|junior|architect|administrator)\b/gi;
    const titleMatches = text.match(titlePatterns);
    if (titleMatches && titleMatches.length >= 1) {
        score += 4;
    } else {
        score += 1;
        issues.push('Job titles are not clearly identifiable');
    }

    // Check for bullet points or structured content
    const bulletPatterns = /^[\s]*[•\-\*\►\▪\●\○\➤\→]/gm;
    const bulletMatches = text.match(bulletPatterns);
    const bulletCount = bulletMatches ? bulletMatches.length : 0;

    if (bulletCount >= 6) {
        score += 4;
    } else if (bulletCount >= 3) {
        score += 2;
        issues.push('Limited use of bullet points');
    } else {
        issues.push('No bullet points detected — use bullets to list achievements and responsibilities');
    }

    // Check for filler words
    const fillerCount = FILLER_WORDS.filter(f => lower.includes(f)).length;
    if (fillerCount === 0) {
        score += 2;
    } else if (fillerCount <= 2) {
        score += 1;
        issues.push(`Found ${fillerCount} weak/filler phrases`);
    } else {
        issues.push(`Found ${fillerCount} weak/filler phrases like "responsible for" — replace with action verbs`);
    }

    score = Math.min(maxScore, score);

    const status = score >= 12 ? 'pass' : score >= 8 ? 'warn' : 'fail';
    results.remarks.push({
        category: 'Work Experience',
        status,
        title: status === 'pass' ? 'Work experience section is well-structured' : 'Work experience needs improvement',
        text: `Detected ${dateCount} date references, ${bulletCount} bullet points, and ${titleMatches ? titleMatches.length : 0} job title references.`,
        suggestion: issues.length ? issues.join('. ') + '.' : 'Your work experience section looks solid.'
    });

    if (issues.length > 0) {
        results.actions.push({
            priority: dateCount < 2 ? 'critical' : 'medium',
            text: `<strong>Improve experience section:</strong> ${issues.join('. ')}.`
        });
    }

    return { score, maxScore, label: 'Experience', emoji: '💼', remark: `${bulletCount} bullet points, ${dateCount} dates` };
}


function analyzeLanguage(text, lower, words, results) {
    let score = 0;
    const maxScore = 10;
    
    // Count action verbs used
    const usedVerbs = ACTION_VERBS.filter(v => {
        const regex = new RegExp(`\\b${v}(d|ed|ing|s)?\\b`, 'i');
        return regex.test(text);
    });

    if (usedVerbs.length >= 12) {
        score += 6;
    } else if (usedVerbs.length >= 6) {
        score += 4;
    } else if (usedVerbs.length >= 3) {
        score += 2;
    } else {
        score += 1;
    }

    // Check for first-person pronouns (should be avoided)
    const pronouns = text.match(/\b(I|me|my|myself|we|our)\b/g);
    const pronounCount = pronouns ? pronouns.length : 0;
    if (pronounCount === 0) {
        score += 2;
    } else if (pronounCount <= 3) {
        score += 1;
    }

    // Check sentence variety and professional tone
    const avgWordsPerSentence = words.length / Math.max(1, text.split(/[.!?]+/).filter(s => s.trim().length > 5).length);
    if (avgWordsPerSentence > 5 && avgWordsPerSentence < 25) {
        score += 2;
    } else if (avgWordsPerSentence <= 5) {
        score += 1;
    }

    score = Math.min(maxScore, score);

    const issues = [];
    if (usedVerbs.length < 6) issues.push(`Only ${usedVerbs.length} action verbs found — aim for 10+`);
    if (pronounCount > 3) issues.push(`${pronounCount} personal pronouns found — avoid "I", "me", "my" in resumes`);
    
    const status = score >= 8 ? 'pass' : score >= 5 ? 'warn' : 'fail';
    results.remarks.push({
        category: 'Language & Action Verbs',
        status,
        title: `${usedVerbs.length} action verbs detected`,
        text: `Action verbs used: ${usedVerbs.slice(0, 15).join(', ')}${usedVerbs.length > 15 ? '...' : ''}. ${pronounCount > 0 ? `Found ${pronounCount} personal pronouns.` : 'No personal pronouns — good!'}`,
        suggestion: usedVerbs.length < 8 ? 
            `Start bullet points with strong action verbs like: achieved, developed, implemented, optimized, led, designed, increased, streamlined.` :
            'Your language choices are strong. Consider varying your verb usage for maximum impact.'
    });

    if (usedVerbs.length < 6) {
        results.actions.push({
            priority: 'high',
            text: `<strong>Use more action verbs:</strong> Replace passive language with verbs like "implemented," "optimized," "spearheaded," "delivered." Currently only ${usedVerbs.length} action verbs detected.`
        });
    }

    if (pronounCount > 3) {
        results.actions.push({
            priority: 'medium',
            text: `<strong>Remove personal pronouns:</strong> Found ${pronounCount} instances of "I/me/my." Start sentences directly with action verbs instead.`
        });
    }

    return { score, maxScore, label: 'Language', emoji: '✍️', remark: `${usedVerbs.length} action verbs` };
}


function analyzeAchievements(text, results) {
    let score = 0;
    const maxScore = 10;

    // Check for numbers and metrics
    const numberPatterns = /\b\d+[%$Kk]?\b/g;
    const numbers = text.match(numberPatterns);
    const numCount = numbers ? numbers.length : 0;

    // Check for percentage mentions
    const percentages = text.match(/\d+(\.\d+)?%/g);
    const pctCount = percentages ? percentages.length : 0;

    // Check for dollar amounts
    const dollars = text.match(/\$[\d,]+\.?\d*/g);
    const dollarCount = dollars ? dollars.length : 0;

    // Check for quantifier words
    const quantifiers = text.match(/\b(increased|decreased|reduced|improved|grew|saved|generated|boosted|expanded|cut|raised|lowered|achieved|surpassed|exceeded|delivered)\b/gi);
    const quantCount = quantifiers ? quantifiers.length : 0;

    // Score calculation
    if (numCount >= 8) score += 4;
    else if (numCount >= 4) score += 3;
    else if (numCount >= 2) score += 1;

    if (pctCount >= 3) score += 3;
    else if (pctCount >= 1) score += 2;

    if (dollarCount >= 1) score += 1;
    if (quantCount >= 3) score += 2;
    else if (quantCount >= 1) score += 1;

    score = Math.min(maxScore, score);

    const status = score >= 8 ? 'pass' : score >= 5 ? 'warn' : 'fail';
    results.remarks.push({
        category: 'Quantifiable Achievements',
        status,
        title: score >= 8 ? 'Strong use of metrics and numbers' : 'Add more quantifiable achievements',
        text: `Found ${numCount} numerical values, ${pctCount} percentages, and ${dollarCount} dollar amounts. Quantified achievements make your resume 40% more likely to pass ATS screening.`,
        suggestion: score < 8 ? 
            'Add specific metrics like "Increased sales by 25%", "Managed a team of 12", "Reduced costs by $50K annually", or "Processed 200+ customer requests daily."' : 
            'Excellent use of quantifiable metrics. Your achievements are well-supported with data.'
    });

    if (score < 5) {
        results.actions.push({
            priority: 'high',
            text: `<strong>Quantify your achievements:</strong> Add numbers, percentages, and dollar values. Example: "Improved system performance by 30%" instead of "Improved system performance."`
        });
    }

    return { score, maxScore, label: 'Achievements', emoji: '🏆', remark: `${pctCount} percentages, ${numCount} metrics` };
}


function analyzeSkills(text, lower, results) {
    let score = 0;
    const maxScore = 10;

    const hasSkillsSection = ESSENTIAL_SECTIONS.skills.keywords.some(kw => lower.includes(kw));
    
    if (hasSkillsSection) {
        score += 4;
    }

    // Extract skills-like content (words/phrases near skills section or common tech terms)
    const techSkills = [
        'python', 'javascript', 'java', 'c++', 'c#', 'react', 'angular', 'vue', 'node',
        'sql', 'mongodb', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'linux',
        'html', 'css', 'typescript', 'ruby', 'php', 'swift', 'kotlin', 'rust', 'go',
        'machine learning', 'deep learning', 'data analysis', 'agile', 'scrum', 'jira',
        'figma', 'photoshop', 'excel', 'powerpoint', 'tableau', 'power bi',
        'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn', 'spark', 'hadoop',
        'rest api', 'graphql', 'microservices', 'ci/cd', 'devops', 'terraform',
        'salesforce', 'sap', 'oracle', 'mysql', 'postgresql', 'redis', 'elasticsearch'
    ];

    const softSkills = [
        'leadership', 'communication', 'teamwork', 'problem solving', 'analytical',
        'project management', 'time management', 'critical thinking', 'collaboration',
        'adaptability', 'creativity', 'decision making', 'negotiation', 'presentation',
        'strategic planning', 'stakeholder management', 'conflict resolution'
    ];

    const foundTech = techSkills.filter(s => lower.includes(s));
    const foundSoft = softSkills.filter(s => lower.includes(s));
    const totalSkills = foundTech.length + foundSoft.length;

    if (totalSkills >= 10) score += 4;
    else if (totalSkills >= 5) score += 3;
    else if (totalSkills >= 2) score += 1;

    // Check for skill listing format (comma separated, bullet points)
    const skillListPatterns = /(?:[\w\s/#+.]+,\s*){2,}/;
    if (skillListPatterns.test(text)) {
        score += 2;
    }

    score = Math.min(maxScore, score);

    const status = score >= 8 ? 'pass' : score >= 5 ? 'warn' : 'fail';
    results.remarks.push({
        category: 'Skills Section',
        status,
        title: hasSkillsSection ? `${totalSkills} identifiable skills found` : 'No clear skills section detected',
        text: `Technical skills: ${foundTech.slice(0, 10).join(', ') || 'None detected'}. Soft skills: ${foundSoft.slice(0, 5).join(', ') || 'None detected'}.`,
        suggestion: !hasSkillsSection ? 
            'Add a dedicated "Skills" section with a clear header. List skills in comma-separated format grouped by category (Technical, Soft Skills, Tools).' :
            totalSkills < 8 ?
                'Add more specific, relevant skills. Include both technical competencies and relevant tools/technologies.' :
                'Skills section looks comprehensive. Ensure these skills match the job requirements.'
    });

    if (!hasSkillsSection) {
        results.actions.push({
            priority: 'critical',
            text: `<strong>Add a Skills section:</strong> Create a dedicated skills section with clearly labeled technical and soft skills. This is one of the most ATS-critical sections.`
        });
    }

    return { score, maxScore, label: 'Skills', emoji: '🛠️', remark: `${foundTech.length} tech, ${foundSoft.length} soft skills` };
}


function analyzeFormatting(text, wordCount, lines, results) {
    let score = 0;
    const maxScore = 10;
    const issues = [];

    // Word count check (ideal: 400-800 for 1 page, up to 1200 for 2 pages)
    if (wordCount >= 300 && wordCount <= 1200) {
        score += 3;
    } else if (wordCount >= 200 && wordCount <= 1500) {
        score += 2;
        if (wordCount < 300) issues.push('Resume may be too short');
        if (wordCount > 1200) issues.push('Resume may be too long for ATS — aim for 1-2 pages');
    } else {
        score += 1;
        if (wordCount < 200) issues.push('Resume is very short — add more detail');
        if (wordCount > 1500) issues.push('Resume is too long — condense to 1-2 pages');
    }

    // Check for consistent formatting
    const allCapsLines = lines.filter(l => l.trim() === l.trim().toUpperCase() && l.trim().length > 3 && l.trim().length < 40);
    if (allCapsLines.length >= 3) {
        score += 2; // Section headers detected
    } else {
        score += 1;
    }

    // Check for reasonable line lengths
    const longLines = lines.filter(l => l.length > 120).length;
    if (longLines < 3) {
        score += 2;
    } else {
        score += 1;
        issues.push('Some lines are very long — consider breaking them into bullets');
    }

    // Check for spacing and readability
    const emptyLineRatio = text.split('\n').filter(l => l.trim() === '').length / Math.max(1, text.split('\n').length);
    if (emptyLineRatio > 0.05 && emptyLineRatio < 0.4) {
        score += 2;
    } else {
        score += 1;
        if (emptyLineRatio <= 0.05) issues.push('Resume appears very dense — add spacing between sections');
    }

    // Font/encoding check
    const specialChars = text.match(/[^\x20-\x7E\n\r\t•\-–—''""…àáâãäåèéêëìíîïòóôõöùúûüçñ]/g);
    if (!specialChars || specialChars.length < 3) {
        score += 1;
    } else {
        issues.push('Special characters detected that may confuse ATS parsers');
    }

    score = Math.min(maxScore, score);

    const status = score >= 8 ? 'pass' : score >= 5 ? 'warn' : 'fail';
    results.remarks.push({
        category: 'Formatting & Length',
        status,
        title: `${wordCount} words (${Math.ceil(wordCount / 500)} page estimate)`,
        text: `Word count: ${wordCount}. Lines: ${lines.length}. ${allCapsLines.length} section header candidates detected.`,
        suggestion: issues.length ? issues.join('. ') + '.' : 'Formatting appears clean and well-structured.'
    });

    if (wordCount < 200 || wordCount > 1500) {
        results.actions.push({
            priority: 'high',
            text: wordCount < 200 ? 
                `<strong>Resume is too short (${wordCount} words):</strong> Most ATS-optimized resumes have 400-800 words. Add more details about achievements and responsibilities.` :
                `<strong>Resume is too long (${wordCount} words):</strong> Condense to 1-2 pages (400-1000 words). Remove outdated or irrelevant experience.`
        });
    }

    return { score, maxScore, label: 'Formatting', emoji: '📐', remark: `${wordCount} words` };
}


function analyzeATSCompatibility(text, lower, results) {
    let score = 0;
    const maxScore = 15;
    const issues = [];
    const passes = [];

    // Check for ATS-unfriendly indicators
    const unfriendlyCount = ATS_UNFRIENDLY.filter(term => lower.includes(term)).length;
    if (unfriendlyCount === 0) {
        score += 3;
        passes.push('No references to tables/images/graphics');
    } else {
        score += 1;
        issues.push(`Found references to potentially ATS-unfriendly elements: ${ATS_UNFRIENDLY.filter(t => lower.includes(t)).join(', ')}`);
    }

    // Check for standard date formats
    const standardDates = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}/gi);
    if (standardDates && standardDates.length >= 2) {
        score += 3;
        passes.push('Standard date formats used');
    } else {
        score += 1;
        issues.push('Use standard date formats (e.g., "Jan 2023 - Present" or "January 2023")');
    }

    // Check for standard section names
    const standardHeaders = ['experience', 'education', 'skills', 'summary', 'certifications', 'projects', 'awards'];
    const usedHeaders = standardHeaders.filter(h => lower.includes(h));
    if (usedHeaders.length >= 3) {
        score += 3;
        passes.push('Standard section headers used');
    } else if (usedHeaders.length >= 1) {
        score += 2;
        issues.push('Use more standard section headers for better ATS parsing');
    } else {
        issues.push('ATS relies on standard section names — use "Experience," "Education," "Skills"');
    }

    // Check for email and contact at top
    const firstChunk = text.substring(0, 500).toLowerCase();
    if (firstChunk.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || firstChunk.includes('email')) {
        score += 2;
        passes.push('Contact information at top');
    } else {
        issues.push('Place contact information at the very top of your resume');
    }

    // No fancy unicode
    const fancyUnicode = text.match(/[\u2600-\u27BF\u{1F300}-\u{1F9FF}]/gu);
    if (!fancyUnicode || fancyUnicode.length === 0) {
        score += 2;
        passes.push('No emoji/fancy unicode characters');
    } else {
        score += 1;
        issues.push('Emojis and fancy unicode characters may not be parsed correctly by ATS');
    }

    // Check for URL formatting
    const urls = text.match(/https?:\/\/[^\s]+/g);
    if (urls && urls.length > 0) {
        score += 2;
        passes.push('URLs properly formatted');
    }

    score = Math.min(maxScore, score);

    const status = score >= 12 ? 'pass' : score >= 8 ? 'warn' : 'fail';
    results.remarks.push({
        category: 'ATS Compatibility',
        status,
        title: status === 'pass' ? 'Resume is ATS-friendly' : 'ATS compatibility issues detected',
        text: passes.length ? `Passing: ${passes.join(', ')}.` : 'Multiple ATS compatibility issues detected.',
        suggestion: issues.length ? issues.join('. ') + '.' : 'Your resume follows ATS best practices. It should parse well across most systems.'
    });

    if (issues.length > 0) {
        results.actions.push({
            priority: issues.length >= 3 ? 'high' : 'medium',
            text: `<strong>Fix ATS compatibility issues:</strong> ${issues.slice(0, 3).join('. ')}.`
        });
    }

    return { score, maxScore, label: 'ATS Friendly', emoji: '🤖', remark: `${passes.length} checks passed` };
}


function analyzeKeywords(text, lower, jobDescription, results) {
    const jdLower = jobDescription.toLowerCase();
    
    // Extract meaningful keywords from JD
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall',
        'can', 'this', 'that', 'these', 'those', 'it', 'its', 'we', 'our', 'you', 'your',
        'they', 'their', 'he', 'she', 'him', 'her', 'not', 'no', 'if', 'then', 'else',
        'when', 'where', 'how', 'what', 'which', 'who', 'whom', 'all', 'each', 'every',
        'both', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very',
        'just', 'about', 'above', 'after', 'again', 'also', 'any', 'because', 'before',
        'between', 'during', 'into', 'through', 'under', 'until', 'up', 'out', 'over',
        'own', 'same', 'so', 'only', 'well', 'ability', 'able', 'role', 'looking',
        'position', 'company', 'team', 'work', 'working', 'must', 'need', 'including',
        'etc', 'based', 'using', 'related', 'new', 'within', 'across', 'like', 'make',
        'strong', 'good', 'great', 'while', 'ensure', 'include', 'required', 'preferred'
    ]);

    // Extract single words and 2-3 word phrases
    const jdWords = jdLower.match(/\b[a-z][\w+#.-]*(?:\s+[a-z][\w+#.-]*){0,2}\b/g) || [];
    
    // Get unique meaningful words/phrases
    const keywordCandidates = new Map();
    
    // Single words
    const singleWords = jdLower.split(/\s+/).filter(w => 
        w.length > 3 && !stopWords.has(w) && /^[a-z]/.test(w)
    );
    
    // Count frequency
    singleWords.forEach(w => {
        const clean = w.replace(/[^a-z0-9+#.-]/g, '');
        if (clean.length > 3) {
            keywordCandidates.set(clean, (keywordCandidates.get(clean) || 0) + 1);
        }
    });

    // Two-word phrases
    const twoWordPhrases = jdLower.match(/\b[a-z][\w+#.-]+\s+[a-z][\w+#.-]+\b/g) || [];
    twoWordPhrases.forEach(phrase => {
        const words = phrase.split(/\s+/);
        if (!words.some(w => stopWords.has(w))) {
            keywordCandidates.set(phrase, (keywordCandidates.get(phrase) || 0) + 1);
        }
    });

    // Sort by frequency and take top keywords
    const sortedKeywords = [...keywordCandidates.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40)
        .map(([kw]) => kw);

    // Deduplicate (remove single words that are part of found phrases)
    const finalKeywords = sortedKeywords.filter(kw => {
        if (kw.includes(' ')) return true;
        return !sortedKeywords.some(other => other.includes(' ') && other.includes(kw));
    }).slice(0, 25);

    const found = finalKeywords.filter(kw => lower.includes(kw));
    const missing = finalKeywords.filter(kw => !lower.includes(kw));

    results.keywordsFound = found;
    results.keywordsMissing = missing;

    // Add keyword-based action
    if (missing.length > 0) {
        const matchRate = Math.round((found.length / Math.max(1, finalKeywords.length)) * 100);
        results.actions.push({
            priority: matchRate < 40 ? 'critical' : matchRate < 60 ? 'high' : 'medium',
            text: `<strong>Keyword match rate: ${matchRate}%.</strong> Add missing keywords from the job description: "${missing.slice(0, 8).join('", "')}". Naturally incorporate them into your experience bullets and skills section.`
        });
    }
}


// ========== RENDERING ==========

function renderResults(results) {
    // Add SVG gradient for score ring
    const svg = document.querySelector('.score-ring');
    if (!svg.querySelector('defs')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.id = 'scoreGradient';
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        
        if (results.totalScore >= 75) {
            stop1.setAttribute('stop-color', '#00b894');
            stop2.setAttribute('stop-color', '#55efc4');
        } else if (results.totalScore >= 50) {
            stop1.setAttribute('stop-color', '#fdcb6e');
            stop2.setAttribute('stop-color', '#f39c12');
        } else {
            stop1.setAttribute('stop-color', '#e17055');
            stop2.setAttribute('stop-color', '#d63031');
        }
        
        stop1.setAttribute('offset', '0%');
        stop2.setAttribute('offset', '100%');
        
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.insertBefore(defs, svg.firstChild);
    }

    // Animate score ring
    const scoreProgress = document.getElementById('score-ring-progress');
    const circumference = 2 * Math.PI * 85;
    scoreProgress.style.strokeDasharray = circumference;
    scoreProgress.style.strokeDashoffset = circumference;
    
    setTimeout(() => {
        const offset = circumference - (results.totalScore / 100) * circumference;
        scoreProgress.style.strokeDashoffset = offset;
    }, 100);

    // Animate score number
    const scoreNumber = document.getElementById('score-number');
    animateNumber(scoreNumber, 0, results.totalScore, 1500);

    // Score label and summary
    const scoreLabel = document.getElementById('score-label');
    const scoreSummary = document.getElementById('score-summary');
    const scoreWrapper = document.querySelector('.score-ring-wrapper');

    // Remove previous classes
    scoreWrapper.parentElement.classList.remove('score-high', 'score-mid', 'score-low');

    if (results.totalScore >= 80) {
        scoreLabel.textContent = '🎉 Excellent ATS Score!';
        scoreSummary.textContent = 'Your resume is well-optimized for Applicant Tracking Systems. It should pass most ATS filters successfully. Review the suggestions below for any final polish.';
        scoreWrapper.parentElement.classList.add('score-high');
    } else if (results.totalScore >= 60) {
        scoreLabel.textContent = '👍 Good Score — Room to Improve';
        scoreSummary.textContent = 'Your resume has a solid foundation but needs some improvements to maximize ATS compatibility. Focus on the high-priority action items below.';
        scoreWrapper.parentElement.classList.add('score-mid');
    } else if (results.totalScore >= 40) {
        scoreLabel.textContent = '⚠️ Needs Significant Improvement';
        scoreSummary.textContent = 'Your resume may struggle with many ATS systems. Several critical areas need attention. Follow the priority action items below to significantly boost your score.';
        scoreWrapper.parentElement.classList.add('score-mid');
    } else {
        scoreLabel.textContent = '🔴 Critical Issues Detected';
        scoreSummary.textContent = 'Your resume is likely being rejected by ATS systems. Major restructuring is needed. Prioritize the critical action items below to make your resume ATS-compatible.';
        scoreWrapper.parentElement.classList.add('score-low');
    }

    // Score tags
    const scoreTags = document.getElementById('score-tags');
    scoreTags.innerHTML = '';
    
    for (const [key, cat] of Object.entries(results.categories)) {
        const pct = Math.round((cat.score / cat.maxScore) * 100);
        const level = pct >= 75 ? 'high' : pct >= 50 ? 'mid' : 'low';
        scoreTags.innerHTML += `<span class="score-tag ${level}">${cat.emoji} ${cat.label}: ${cat.score}/${cat.maxScore}</span>`;
    }

    // Breakdown grid
    const breakdownGrid = document.getElementById('breakdown-grid');
    breakdownGrid.innerHTML = '';
    let delay = 0;

    for (const [key, cat] of Object.entries(results.categories)) {
        const pct = Math.round((cat.score / cat.maxScore) * 100);
        const level = pct >= 75 ? 'high' : pct >= 50 ? 'mid' : 'low';
        
        const item = document.createElement('div');
        item.className = 'breakdown-item';
        item.style.animationDelay = `${delay * 0.08}s`;
        item.innerHTML = `
            <div class="breakdown-item-header">
                <span class="breakdown-item-name">
                    <span class="breakdown-item-emoji">${cat.emoji}</span>
                    ${cat.label}
                </span>
                <span class="breakdown-item-score" style="color: var(--${level === 'high' ? 'success' : level === 'mid' ? 'warning' : 'danger'})">${cat.score}/${cat.maxScore}</span>
            </div>
            <div class="breakdown-bar">
                <div class="breakdown-bar-fill ${level}" style="width: 0%"></div>
            </div>
            <div class="breakdown-item-remark">${cat.remark}</div>
        `;
        breakdownGrid.appendChild(item);
        
        // Animate bar
        setTimeout(() => {
            item.querySelector('.breakdown-bar-fill').style.width = `${pct}%`;
        }, 300 + delay * 100);
        
        delay++;
    }

    // Keywords section
    const keywordsSection = document.getElementById('keywords-section');
    if (results.keywordsFound.length > 0 || results.keywordsMissing.length > 0) {
        keywordsSection.classList.remove('hidden');
        
        const keywordsFound = document.getElementById('keywords-found');
        const keywordsMissing = document.getElementById('keywords-missing');
        
        keywordsFound.innerHTML = results.keywordsFound.length > 0 ?
            results.keywordsFound.map((kw, i) => 
                `<span class="keyword-tag found" style="animation-delay: ${i * 0.03}s">${kw}</span>`
            ).join('') :
            '<span style="color: var(--text-muted); font-size: 0.82rem;">No matching keywords found</span>';
        
        keywordsMissing.innerHTML = results.keywordsMissing.length > 0 ?
            results.keywordsMissing.map((kw, i) => 
                `<span class="keyword-tag missing" style="animation-delay: ${i * 0.03}s">${kw}</span>`
            ).join('') :
            '<span style="color: var(--text-muted); font-size: 0.82rem;">All key terms are present!</span>';
    } else {
        keywordsSection.classList.add('hidden');
    }

    // Remarks
    const remarksList = document.getElementById('remarks-list');
    remarksList.innerHTML = '';

    results.remarks.forEach((remark, i) => {
        const item = document.createElement('div');
        item.className = 'remark-item';
        item.style.animationDelay = `${i * 0.08}s`;
        
        const statusEmoji = remark.status === 'pass' ? '✅' : remark.status === 'warn' ? '⚠️' : '❌';
        
        item.innerHTML = `
            <div class="remark-header" onclick="this.parentElement.classList.toggle('open')">
                <div class="remark-status ${remark.status}">${statusEmoji}</div>
                <span class="remark-title">${remark.title}</span>
                <svg class="remark-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </div>
            <div class="remark-body">
                <div class="remark-content">
                    <p class="remark-text">${remark.text}</p>
                    ${remark.suggestion ? `
                        <div class="remark-suggestion">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="16" x2="12" y2="12"/>
                                <line x1="12" y1="8" x2="12.01" y2="8"/>
                            </svg>
                            <span>${remark.suggestion}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        remarksList.appendChild(item);
    });

    // Auto-expand failing items
    setTimeout(() => {
        remarksList.querySelectorAll('.remark-item').forEach(item => {
            if (item.querySelector('.remark-status.fail')) {
                item.classList.add('open');
            }
        });
    }, 500);

    // Action items
    const actionsList = document.getElementById('actions-list');
    actionsList.innerHTML = '';

    if (results.actions.length === 0) {
        actionsList.innerHTML = `
            <div class="action-item">
                <span class="action-priority low">PERFECT</span>
                <span class="action-text"><strong>No major issues found!</strong> Your resume is well-optimized. Keep it updated with your latest achievements.</span>
            </div>
        `;
    } else {
        results.actions.forEach((action, i) => {
            const item = document.createElement('div');
            item.className = 'action-item';
            item.style.animationDelay = `${i * 0.08}s`;
            item.innerHTML = `
                <span class="action-priority ${action.priority}">${action.priority}</span>
                <span class="action-text">${action.text}</span>
            `;
            actionsList.appendChild(item);
        });
    }
}


function animateNumber(el, start, end, duration) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(start + (end - start) * eased);
        el.textContent = value;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}


// ========== NAVIGATION ==========

function showUpload() {
    uploadSection.classList.remove('hidden');
    heroSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-section="upload"]').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showResults() {
    uploadSection.classList.add('hidden');
    heroSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    navResults.disabled = false;
    document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-section="results"]').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ========== MAIN ANALYSIS TRIGGER ==========

btnAnalyze.addEventListener('click', async () => {
    const btnText = btnAnalyze.querySelector('.btn-text');
    const btnLoader = btnAnalyze.querySelector('.btn-loader');
    const btnArrow = btnAnalyze.querySelector('.btn-arrow');

    // Show loading
    btnText.classList.add('hidden');
    btnArrow.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    btnAnalyze.disabled = true;

    try {
        // Get resume text
        if (resumeFile) {
            resumeText = await extractTextFromFile(resumeFile);
        } else {
            resumeText = resumeTextarea.value.trim();
        }

        if (!resumeText || resumeText.length < 50) {
            alert('Could not extract enough text from your resume. Please try pasting the text directly.');
            resetButton();
            return;
        }

        const jobDescription = jdTextarea.value.trim();

        // Small delay for UX
        await new Promise(r => setTimeout(r, 800));

        // Run analysis
        const results = analyzeResume(resumeText, jobDescription);

        // Render results
        renderResults(results);

        // Show results
        showResults();

    } catch (error) {
        console.error('Analysis error:', error);
        alert('Error analyzing resume: ' + error.message + '. Please try pasting the text directly.');
    }

    resetButton();
});

function resetButton() {
    const btnText = btnAnalyze.querySelector('.btn-text');
    const btnLoader = btnAnalyze.querySelector('.btn-loader');
    const btnArrow = btnAnalyze.querySelector('.btn-arrow');
    btnText.classList.remove('hidden');
    btnArrow.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    btnAnalyze.disabled = false;
    updateAnalyzeButton();
}

btnReanalyze.addEventListener('click', () => {
    showUpload();
});


// ========== INITIALIZATION ==========
updateAnalyzeButton();
