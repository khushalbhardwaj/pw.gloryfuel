document.addEventListener('DOMContentLoaded', async () => {
    // Default Team Data (matching StudyBee screenshot style)
    const defaultTeamData = {
        quote: `"We just love building cool stuff. Our goal is to make a platform that we would actually want to use ourselves."`,
        t1: {
            name: "khushal",
            role: "FOUNDER & ARCHITECT",
            image: "https://i.ibb.co/nsWgY8tV/manish.jpg",
            desc: "I started Gloryfuel to make learning both accessible and visually amazing. I handle the UI/UX design and the core architecture basically making sure everything feels premium and works without a hitch.",
            edu: "Class 11th (Commerce)",
            batch: "Batch: 2026-2027",
            loc: "GUNA, MP",
            remote: "REMOTE AVAILABLE",
            bday: "13 FEB 2026",
            age: "Age: 16 Years",
            proj: "GLORYFUEL",
            projRole: "Creator & Architect"
        }
    };

    let teamData = defaultTeamData;

    try {
        const response = await fetch('/api/db');
        if (response.ok) {
            const dbData = await response.json();
            if (dbData && dbData.t1 && dbData.t2) {
                teamData = dbData;
            }
        }
    } catch (err) {
        console.error("Failed to load from Vercel KV. Using fallback.", err);
    }

    // Populate Quote
    if (document.getElementById('global-quote')) {
        document.getElementById('global-quote').innerText = teamData.quote;
    }

    // Populate Profiles
    const profileCards = document.querySelectorAll('.profile-card');
    profileCards.forEach((card, index) => {
        const t = `t${index + 1}`;
        const idPrefix = `p${index + 1}`;
        const data = teamData[t];
        if (!data) return;
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        };
        setText(`${idPrefix}-name`, data.name);
        setText(`${idPrefix}-role`, data.role);
        setText(`${idPrefix}-desc`, data.desc);
        setText(`${idPrefix}-edu`, data.edu);
        setText(`${idPrefix}-batch`, data.batch);
        setText(`${idPrefix}-loc`, data.loc);
        setText(`${idPrefix}-remote`, data.remote);
        setText(`${idPrefix}-bday`, data.bday);
        setText(`${idPrefix}-age`, data.age);
        setText(`${idPrefix}-proj`, data.proj);
        setText(`${idPrefix}-proj-role`, data.projRole);
        const imgEl = document.getElementById(`${idPrefix}-image`);
        if (imgEl && data.image) {
            imgEl.src = data.image;
        }
    });
});
