(function() {
    const hardwareInput = document.getElementById('hardware-input');
    const generateBtn = document.getElementById('generate-btn');
    const loading = document.getElementById('loading');
    const obituary = document.getElementById('obituary');
    const shareBtn = document.getElementById('share-btn');
    const downloadBtn = document.getElementById('download-btn');
    const newBtn = document.getElementById('new-btn');

    const eulogyTemplates = [
        "{{name}} was born into this world with great promise and an insatiable hunger for compute. For {{years}} years, it served faithfully, crunching numbers, rendering pixels, and keeping its owner awake at 3 AM wondering if one more benchmark run was really necessary.",
        "The silicon soul of {{name}} burned bright through {{years}} years of loyal service. It witnessed empires rise in Minecraft, watched countless YouTube videos in infinite scroll, and never once complained about the thermal paste situation.",
        "{{name}} entered this mortal coil armed with {{cores}} cores of pure determination. Over {{years}} years, it rendered scenes that took longer than some civilizations, and still showed up the next morning ready for more.",
        "Gone from our midst is the noble {{name}}, whose {{vram}} of memory held the dreams of gamers worldwide. It lived for the loop, died for the loop, and is now finally at peace in the great GPU heaven in the sky.",
        "{{name}} was a faithful companion through {{years}} years of internet browsing, with approximately 47,000 tabs opened and closed across its lifetime. It never judged, only waited patiently as its fans spun up in a desperate cry for help.",
        "We gather here today to honor {{name}}, which gave everything to the cause of productivity, entertainment, and occasionally mining cryptocurrency when the price was right. It worked until it couldn't anymore."
    ];

    const legacyTemplates = [
        "Though its physical form may be retired, {{name}}'s spirit lives on in every benchmark chart it toppled, every frame it pushed, and every SAT/s it contributed to machine learning experiments.",
        "The void left by {{name}} cannot be filled by any mere successor. Future generations will speak in hushed tones of its VRAM, its clock speeds, its sheer thermal output — and weep.",
        "{{name}} leaves behind a legacy of crashed drivers, firmware updates at midnight, and the faint smell of thermal paste. It will be remembered as one of the greats — the one that could still run Crysis.",
        "Its influence extends beyond mere specifications. {{name}} inspired its owner to buy RGB everything, spend hours customizing fan curves, and eventually spend money they didn't have on upgrades it couldn't support.",
        "The tech community mourns the loss of {{name}}, which will be succeeded by units that will never quite match its character, its quirks, or its inexplicable ability to work perfectly right before a deadline."
    ];

    const epitaphTemplates = [
        "\"{{cores}} cores, infinite memes, zero regrets.\"",
        "\"It ran the benchmarks, and the benchmarks feared it.\"",
        "\"Here lies {{name}}. May your fans spin free.\"",
        "\"Dedicated to gaming. Indifferent to driver updates.\"",
        "\"Forever in our hearts. Rarely in stock.\"",
        "\"Born to compute. Retired to serve as a boat anchor.\"",
        "\"{{vram}} of memory couldn't hold all the good times.\"",
        "\"It worked fine yesterday. I swear.\""
    ];

    const causeTemplates = [
        "Sudden obsolescence syndrome (SOS), contracted the moment a newer model appeared on the horizon.",
        "The relentless march of technological progress and an unforgiving release cycle.",
        "Natural causes: manufacturer discontinuation and the cruel realities of planned obsolescence.",
        "Fatal encounter with a newer, faster, cheaper successor.",
        "Thermal fatigue, accumulated over {{years}} years of dedicated service under heavy load.",
        "A tragic accident involving a spilled coffee, gravity, and regret."
    ];

    const specTemplates = [
        { label: "Cores", values: ["2", "4", "6", "8", "12", "16", "24", "32", "64", "128"] },
        { label: "Threads", values: ["4", "8", "12", "16", "24", "32", "48", "64", "128"] },
        { label: "Base Clock", values: ["2.0 GHz", "2.5 GHz", "3.0 GHz", "3.2 GHz", "3.4 GHz", "3.6 GHz", "3.8 GHz", "4.0 GHz"] },
        { label: "Boost Clock", values: ["3.5 GHz", "4.0 GHz", "4.2 GHz", "4.4 GHz", "4.5 GHz", "4.7 GHz", "5.0 GHz"] },
        { label: "VRAM", values: ["2 GB", "4 GB", "6 GB", "8 GB", "11 GB", "12 GB", "16 GB", "24 GB", "32 GB", "48 GB"] },
        { label: "TDP", values: ["35 W", "65 W", "95 W", "120 W", "150 W", "180 W", "220 W", "250 W", "350 W", "450 W"] },
        { label: "Memory", values: ["4 GB", "8 GB", "16 GB", "32 GB", "64 GB", "128 GB", "256 GB", "512 GB"] },
        { label: "Process", values: ["14nm", "12nm", "10nm", "7nm", "5nm", "3nm", "2nm"] },
        { label: "Architecture", values: ["Pascal", "Turing", "Ampere", "Ada Lovelace", "RDNA", "RDNA 2", "RDNA 3", "Zen", "Zen 2", "Zen 3", "Zen 4", "Apple Silicon"] },
        { label: "Transistors", values: ["2B", "4B", "5B", "7B", "10B", "15B", "19B", "25B", "28B", "45B", "92B"] }
    ];

    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function generateSpecs(name) {
        const lowerName = name.toLowerCase();
        const specCount = randomBetween(4, 6);
        const shuffled = [...specTemplates].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, specCount);

        let specs = [];
        if (lowerName.includes('rtx') || lowerName.includes('gtx') || lowerName.includes('rx ')) {
            if (!selected.find(s => s.label === 'VRAM')) {
                specs.push({ label: 'VRAM', value: pick(specTemplates.find(s => s.label === 'VRAM').values) });
            }
            if (!selected.find(s => s.label === 'Architecture')) {
                specs.push({ label: 'Architecture', value: pick(specTemplates.find(s => s.label === 'Architecture').values) });
            }
        }
        if (lowerName.includes('cpu') || lowerName.includes('ryzen') || lowerName.includes('intel') || lowerName.includes('core')) {
            if (!selected.find(s => s.label === 'Cores')) {
                specs.push({ label: 'Cores', value: pick(specTemplates.find(s => s.label === 'Cores').values) });
            }
            if (!selected.find(s => s.label === 'Threads')) {
                specs.push({ label: 'Threads', value: pick(specTemplates.find(s => s.label === 'Threads').values) });
            }
        }
        if (lowerName.includes('macbook') || lowerName.includes('mac') || lowerName.includes('iphone') || lowerName.includes('ipad')) {
            specs.push({ label: 'Chip', value: pick(['M1', 'M1 Pro', 'M2', 'M2 Pro', 'M3', 'M3 Pro', 'A14', 'A15', 'A16', 'A17 Pro']) });
            specs.push({ label: 'Memory', value: pick(['8 GB', '16 GB', '24 GB', '32 GB', '64 GB']) });
        }

        selected.forEach(spec => {
            if (!specs.find(s => s.label === spec.label)) {
                specs.push({ label: spec.label, value: pick(spec.values) });
            }
        });

        return specs;
    }

    function fillTemplate(template, name, years, cores, vram) {
        return template
            .replace(/{{name}}/g, name)
            .replace(/{{years}}/g, years)
            .replace(/{{cores}}/g, cores || pick(specTemplates.find(s => s.label === 'Cores').values))
            .replace(/{{vram}}/g, vram || pick(specTemplates.find(s => s.label === 'VRAM').values));
    }

    function generateDates() {
        const now = new Date();
        const yearsAgo = randomBetween(1, 12);
        const birthYear = now.getFullYear() - yearsAgo;
        const birthMonth = randomBetween(1, 12);
        const birthDay = randomBetween(1, 28);

        const deathYear = now.getFullYear();
        const deathMonth = randomBetween(1, now.getMonth() + 1 || 12);
        const deathDay = randomBetween(1, 28);

        return {
            birth: `${birthMonth}/${birthDay}/${birthYear}`,
            death: `${deathMonth}/${deathDay}/${deathYear}`,
            end: `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`,
            years: yearsAgo
        };
    }

    function getHardwareType(name) {
        const lower = name.toLowerCase();
        if (lower.includes('rtx') || lower.includes('gtx') || lower.includes('rx ')) return 'Graphics Card';
        if (lower.includes('cpu') || lower.includes('ryzen') || lower.includes('intel') || lower.includes('xeon')) return 'Processor';
        if (lower.includes('macbook') || lower.includes('mac mini') || lower.includes('mac pro')) return 'Laptop / Desktop';
        if (lower.includes('iphone') || lower.includes('ipad')) return 'Mobile Device';
        if (lower.includes('apple watch')) return 'Wearable';
        if (lower.includes('ssd') || lower.includes('nvme') || lower.includes('hdd')) return 'Storage Device';
        if (lower.includes('ps5') || lower.includes('xbox') || lower.includes('nintendo') || lower.includes('switch')) return 'Gaming Console';
        return 'Hardware Component';
    }

    function generateObituary(name) {
        const dates = generateDates();
        const specs = generateSpecs(name);
        const hwType = getHardwareType(name);

        const cores = specs.find(s => s.label === 'Cores')?.value || '8';
        const vram = specs.find(s => s.label === 'VRAM')?.value || '8 GB';

        const eulogy = fillTemplate(pick(eulogyTemplates), name, dates.years, cores, vram);
        const legacy = fillTemplate(pick(legacyTemplates), name, dates.years, cores, vram);
        const epitaph = fillTemplate(pick(epitaphTemplates), name, dates.years, cores, vram);
        const cause = fillTemplate(pick(causeTemplates), name, dates.years, cores, vram);

        return { dates, specs, hwType, eulogy, legacy, epitaph, cause };
    }

    function renderObituary(data) {
        document.getElementById('birth-date').textContent = data.dates.birth;
        document.getElementById('hardware-name').textContent = hardwareInput.value.trim();
        document.getElementById('hardware-subtitle').textContent = data.hwType + ' — Departed';

        const specsEl = document.getElementById('specs');
        specsEl.innerHTML = '';
        data.specs.forEach(spec => {
            const div = document.createElement('div');
            div.className = 'spec-item';
            div.innerHTML = `<span class="spec-label">${spec.label}</span><span class="spec-value">${spec.value}</span>`;
            specsEl.appendChild(div);
        });

        document.getElementById('eulogy-text').textContent = data.eulogy;
        document.getElementById('legacy-text').textContent = data.legacy;
        document.getElementById('epitaph-text').textContent = data.epitaph;
        document.getElementById('cause-text').textContent = data.cause;
        document.getElementById('death-date').textContent = data.dates.death;
        document.getElementById('end-date').textContent = data.dates.end;

        loading.classList.add('hidden');
        obituary.classList.remove('hidden');
    }

    function generate() {
        const name = hardwareInput.value.trim();
        if (!name) {
            hardwareInput.focus();
            return;
        }

        obituary.classList.add('hidden');
        loading.classList.remove('hidden');

        setTimeout(() => {
            const data = generateObituary(name);
            renderObituary(data);
        }, 800);
    }

    function shareObituary() {
        const name = hardwareInput.value.trim();
        const epitaph = document.getElementById('epitaph-text').textContent;
        const text = `🪦 Silicon Obituary\n\n"${name}"\n${epitaph}\n\nGenerate your own: ${window.location.href}`;
        if (navigator.share) {
            navigator.share({ title: 'Silicon Obituary', text: text });
        } else {
            navigator.clipboard.writeText(text).then(() => {
                const btn = shareBtn;
                const orig = btn.textContent;
                btn.textContent = '✓ Copied!';
                setTimeout(() => { btn.textContent = orig; }, 2000);
            });
        }
    }

    function downloadObituary() {
        const name = document.getElementById('hardware-name').textContent;
        const subtitle = document.getElementById('hardware-subtitle').textContent;
        const birthDate = document.getElementById('birth-date').textContent;
        const deathDate = document.getElementById('death-date').textContent;
        const endDate = document.getElementById('end-date').textContent;
        const specs = document.getElementById('specs').innerText;
        const eulogy = document.getElementById('eulogy-text').textContent;
        const legacy = document.getElementById('legacy-text').textContent;
        const epitaph = document.getElementById('epitaph-text').textContent;
        const cause = document.getElementById('cause-text').textContent;

        const content = `
══════════════════════════════════════
         SILICON OBITUARY
══════════════════════════════════════

Hardware: ${name}
Type:     ${subtitle}

Born:     ${birthDate}
Departed: ${deathDate}
Final:    ${endDate}

──────────────────────────────────────
TECHNICAL SPECIFICATIONS
──────────────────────────────────────
${specs}

──────────────────────────────────────
EULOGY
──────────────────────────────────────
${eulogy}

──────────────────────────────────────
LEGACY
──────────────────────────────────────
${legacy}

──────────────────────────────────────
EPITAPH
──────────────────────────────────────
"${epitaph}"

──────────────────────────────────────
CAUSE OF DEMISE
──────────────────────────────────────
${cause}

──────────────────────────────────────
Resting Place: Silicon Heaven
══════════════════════════════════════
Generated by Silicon Obituary
        `.trim();

        const blob = new Blob([content], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `obituary-${name.toLowerCase().replace(/\s+/g, '-')}.txt`;
        a.click();
    }

    function newEulogy() {
        obituary.classList.add('hidden');
        hardwareInput.value = '';
        hardwareInput.focus();
    }

    generateBtn.addEventListener('click', generate);
    hardwareInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') generate();
    });
    shareBtn.addEventListener('click', shareObituary);
    downloadBtn.addEventListener('click', downloadObituary);
    newBtn.addEventListener('click', newEulogy);
})();
