# 📄 ATS Resume Score Checker

> **Free, privacy-first ATS (Applicant Tracking System) resume analyzer.** Upload your resume, get an instant compatibility score, detailed remarks, and actionable suggestions to boost your chances of getting past ATS filters.

🌐 **Live Demo:** [tejaswiacharii.github.io/ats-resume-checker](https://tejaswiacharii.github.io/ats-resume-checker/)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📤 **File Upload** | Drag & drop or browse — supports **PDF, DOCX, TXT** formats |
| 📝 **Paste Text** | Alternatively paste your resume text directly |
| 🎯 **Job Description Matching** | Optional JD input for keyword gap analysis |
| 🏆 **ATS Score (0–100)** | Animated score ring with instant grading |
| 📊 **8-Category Breakdown** | Detailed scoring across all ATS-critical areas |
| 🔍 **Keyword Analysis** | Found ✅ vs Missing ❌ keywords from the job description |
| 💬 **Detailed Remarks** | Expandable cards with specific feedback per category |
| 🚀 **Priority Actions** | Ranked action items (Critical → Low) with fix suggestions |
| 🔒 **100% Private** | Everything runs locally in your browser — zero data sent to servers |

---

## 📊 Scoring Categories

| Category | Max Points | What It Analyzes |
|---|---|---|
| 📋 Contact Info | 15 | Email, phone, name, LinkedIn, location |
| 🏗️ Structure | 15 | Summary, Experience, Education, Skills sections |
| 💼 Experience | 15 | Employment dates, job titles, bullet points, filler words |
| ✍️ Language | 10 | Action verbs usage, pronouns, sentence quality |
| 🏆 Achievements | 10 | Numbers, percentages, dollar amounts, quantified metrics |
| 🛠️ Skills | 10 | Dedicated skills section, tech & soft skills detection |
| 📐 Formatting | 10 | Word count, line length, spacing, special characters |
| 🤖 ATS Friendly | 15 | Standard headers, date formats, unicode, parsing compatibility |

---

## 🛠️ Tech Stack

- **HTML5** — Semantic structure with SEO best practices
- **CSS3** — Custom design system with glassmorphism, animations, dark mode
- **Vanilla JavaScript** — Zero frameworks, pure client-side logic
- **[PDF.js](https://mozilla.github.io/pdf.js/)** — PDF text extraction (Mozilla)
- **[Mammoth.js](https://github.com/mwilliamson/mammoth.js)** — DOCX text extraction
- **[Inter Font](https://fonts.google.com/specimen/Inter)** — Modern typography via Google Fonts

---

## 📱 Responsive Design

Fully responsive across all devices:

- 🖥️ **Desktop** (1024px+)
- 📱 **Tablet** (768px)
- 📲 **Mobile** (480px)
- 📟 **Small phones** (360px)
- 🔄 **Landscape orientation**
- 👆 **Touch-optimized** tap targets
- ♿ **Reduced motion** support
- 🖨️ **Print-friendly** stylesheet

---

## 🚀 Getting Started

### Option 1: Open directly
Simply open `index.html` in your browser — no build step or server required.

### Option 2: Local server
```bash
# Clone the repo
git clone https://github.com/tejaswiacharii/ats-resume-checker.git
cd ats-resume-checker

# Serve locally (Python)
python -m http.server 3000

# Or with Node.js
npx serve .
```
Then visit `http://localhost:3000`

---

## 📂 Project Structure

```
ats-resume-checker/
├── index.html      # Main HTML — semantic structure & SEO
├── index.css       # Design system — dark theme, glassmorphism, responsive
├── app.js          # ATS analysis engine — scoring, parsing, rendering
└── README.md       # Project documentation
```

---

## 🧠 How It Works

1. **Upload or paste** your resume (PDF/DOCX/TXT or raw text)
2. **Optionally add** a job description for keyword matching
3. The engine **parses the text** client-side using PDF.js / Mammoth.js
4. **8 analyzers** score your resume across ATS-critical dimensions
5. Results display with an **animated score ring**, category breakdown, keyword gaps, detailed remarks, and prioritized action items

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [PDF.js](https://mozilla.github.io/pdf.js/) by Mozilla for PDF parsing
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js) for DOCX text extraction
- [Google Fonts](https://fonts.google.com/) for Inter typeface

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/tejaswiacharii">tejaswiacharii</a>
</p>
