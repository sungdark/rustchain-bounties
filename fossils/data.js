/**
 * RustChain Attestation History — Mock Dataset
 * Simulates full attestation history across all epochs for visualization purposes.
 * Data structure mirrors POST /attest/submit payload.
 * 
 * Architecture layers (oldest to newest in strata):
 * m68k → g3 → g4 → g5 → sparc → mips → power8 → 
 * starfive_jh7110 → sifive_unmatched → milkv_pioneer → 
 * riscv_modern → apple_silicon → core2duo → modern
 */
(function() {
    'use strict';

    const SEED_MINERS = [
        // PowerPC G3 early adopters (Genesis Era, Epochs 0-5)
        { miner_id: 'minerG3_a1b2c3d4e5f6g7h8i9j0', device_arch: 'g3', device_family: 'PowerPC', device_model: 'PowerPC 750 (G3)', cpu_model: 'Motorola PowerPC 750', epoch_first: 0, rtc_per_epoch: 12, fp_quality: 0.95 },
        { miner_id: 'minerG3_b2c3d4e5f6g7h8i9j0k1', device_arch: 'g3', device_family: 'PowerPC', device_model: 'Apple PowerBook G3', cpu_model: 'Motorola PowerPC 750', epoch_first: 0, rtc_per_epoch: 11, fp_quality: 0.92 },
        { miner_id: 'minerG3_c3d4e5f6g7h8i9j0k1l2', device_arch: 'g3', device_family: 'PowerPC', device_model: 'Power Macintosh G3', cpu_model: 'Motorola PowerPC 750', epoch_first: 1, rtc_per_epoch: 13, fp_quality: 0.97 },
        { miner_id: 'minerG3_d4e5f6g7h8i9j0k1l2m3', device_arch: 'g3', device_family: 'PowerPC', device_model: 'iMac G3', cpu_model: 'Motorola PowerPC 750', epoch_first: 1, rtc_per_epoch: 10, fp_quality: 0.88 },
        { miner_id: 'minerG3_e5f6g7h8i9j0k1l2m3n4', device_arch: 'g3', device_family: 'PowerPC', device_model: 'PowerBook G3 Wall Street', cpu_model: 'Motorola PowerPC 750', epoch_first: 2, rtc_per_epoch: 14, fp_quality: 0.91 },
        // Motorola 68K (Genesis Era, very early)
        { miner_id: 'miner68k_f6g7h8i9j0k1l2m3n4o5', device_arch: '68k', device_family: 'Motorola 68K', device_model: 'Macintosh IIci', cpu_model: 'Motorola 68030', epoch_first: 0, rtc_per_epoch: 18, fp_quality: 0.99 },
        { miner_id: 'miner68k_g7h8i9j0k1l2m3n4o5p6', device_arch: '68k', device_family: 'Motorola 68K', device_model: 'Macintosh SE/30', cpu_model: 'Motorola 68030', epoch_first: 0, rtc_per_epoch: 19, fp_quality: 1.0 },
        { miner_id: 'miner68k_h8i9j0k1l2m3n4o5p6q7', device_arch: '68k', device_family: 'Motorola 68K', device_model: 'Apple Lisa 2', cpu_model: 'Motorola 68010', epoch_first: 1, rtc_per_epoch: 20, fp_quality: 0.97 },
        // PowerPC G4 (Bronze Age, Epochs 3-15)
        { miner_id: 'minerG4_i9j0k1l2m3n4o5p6q7r8', device_arch: 'g4', device_family: 'PowerPC', device_model: 'PowerBook G4 15"', cpu_model: 'PowerPC 7450', epoch_first: 3, rtc_per_epoch: 9, fp_quality: 0.94 },
        { miner_id: 'minerG4_j0k1l2m3n4o5p6q7r8s9', device_arch: 'g4', device_family: 'PowerPC', device_model: 'iMac G4', cpu_model: 'PowerPC 7447', epoch_first: 3, rtc_per_epoch: 8, fp_quality: 0.93 },
        { miner_id: 'minerG4_k1l2m3n4o5p6q7r8s9t0', device_arch: 'g4', device_family: 'PowerPC', device_model: 'Power Mac G4 Cube', cpu_model: 'PowerPC 7445', epoch_first: 4, rtc_per_epoch: 10, fp_quality: 0.96 },
        { miner_id: 'minerG4_l2m3n4o5p6q7r8s9t0u1', device_arch: 'g4', device_family: 'PowerPC', device_model: 'Mac mini G4', cpu_model: 'PowerPC 7447A', epoch_first: 4, rtc_per_epoch: 9, fp_quality: 0.95 },
        { miner_id: 'minerG4_m3n4o5p6q7r8s9t0u1v2', device_arch: 'g4', device_family: 'PowerPC', device_model: 'PowerBook G4 17"', cpu_model: 'PowerPC 7455', epoch_first: 5, rtc_per_epoch: 8, fp_quality: 0.92 },
        { miner_id: 'minerG4_n4o5p6q7r8s9t0u1v2w3', device_arch: 'g4', device_family: 'PowerPC', device_model: 'iMac G4 17"', cpu_model: 'PowerPC 7447', epoch_first: 5, rtc_per_epoch: 11, fp_quality: 0.90 },
        { miner_id: 'minerG4_o5p6q7r8s9t0u1v2w3x4', device_arch: 'g4', device_family: 'PowerPC', device_model: 'Xserve G4', cpu_model: 'PowerPC 7455', epoch_first: 6, rtc_per_epoch: 7, fp_quality: 0.97 },
        // PowerPC G5 (Bronze Age, Epochs 6-20)
        { miner_id: 'minerG5_p6q7r8s9t0u1v2w3x4y5', device_arch: 'g5', device_family: 'PowerPC', device_model: 'Power Mac G5', cpu_model: 'PowerPC 970', epoch_first: 6, rtc_per_epoch: 6, fp_quality: 0.95 },
        { miner_id: 'minerG5_q7r8s9t0u1v2w3x4y5z6', device_arch: 'g5', device_family: 'PowerPC', device_model: 'iMac G5', cpu_model: 'PowerPC 970FX', epoch_first: 7, rtc_per_epoch: 7, fp_quality: 0.94 },
        { miner_id: 'minerG5_r8s9t0u1v2w3x4y5z6a7', device_arch: 'g5', device_family: 'PowerPC', device_model: 'PowerBook G5', cpu_model: 'PowerPC 970FX', epoch_first: 8, rtc_per_epoch: 6, fp_quality: 0.93 },
        // SPARC (Expedition Era, Epochs 8-25)
        { miner_id: 'minerSPARC_s9t0u1v2w3x4y5z6a7b8', device_arch: 'sparc', device_family: 'SPARC', device_model: 'Sun Ultra 5', cpu_model: 'SPARCv9 UltraSPARC II', epoch_first: 8, rtc_per_epoch: 5, fp_quality: 0.91 },
        { miner_id: 'minerSPARC_t0u1v2w3x4y5z6a7b8c9', device_arch: 'sparc', device_family: 'SPARC', device_model: 'Sun Blade 100', cpu_model: 'SPARCv9 UltraSPARC III', epoch_first: 9, rtc_per_epoch: 5, fp_quality: 0.89 },
        { miner_id: 'minerSPARC_u1v2w3x4y5z6a7b8c9d0', device_arch: 'sparc', device_family: 'SPARC', device_model: 'Sun Ultra 60', cpu_model: 'SPARCv9 UltraSPARC IIi', epoch_first: 10, rtc_per_epoch: 6, fp_quality: 0.92 },
        { miner_id: 'minerSPARC_v2w3x4y5z6a7b8c9d0e1', device_arch: 'sparc', device_family: 'SPARC', device_model: 'Sun Fire V210', cpu_model: 'SPARCv9 UltraSPARC III', epoch_first: 12, rtc_per_epoch: 4, fp_quality: 0.88 },
        // MIPS (Expedition Era, Epochs 10-28)
        { miner_id: 'minerMIPS_w3x4y5z6a7b8c9d0e1f2', device_arch: 'mips', device_family: 'MIPS', device_model: 'SGI Indy', cpu_model: 'MIPS R5000', epoch_first: 10, rtc_per_epoch: 5, fp_quality: 0.90 },
        { miner_id: 'minerMIPS_x4y5z6a7b8c9d0e1f2g3', device_arch: 'mips', device_family: 'MIPS', device_model: 'SGI O2', cpu_model: 'MIPS R10000', epoch_first: 11, rtc_per_epoch: 4, fp_quality: 0.87 },
        { miner_id: 'minerMIPS_y5z6a7b8c9d0e1f2g3h4', device_arch: 'mips', device_family: 'MIPS', device_model: 'Netgear WRT54G', cpu_model: 'MIPS 4KC', epoch_first: 14, rtc_per_epoch: 3, fp_quality: 0.82 },
        // POWER8 (Active Era, Epochs 15-30)
        { miner_id: 'minerPWR8_z6a7b8c9d0e1f2g3h4i5', device_arch: 'power8', device_family: 'POWER', device_model: 'IBM Power Systems S812L', cpu_model: 'IBM POWER8', epoch_first: 15, rtc_per_epoch: 4, fp_quality: 0.93 },
        { miner_id: 'minerPWR8_a7b8c9d0e1f2g3h4i5j6', device_arch: 'power8', device_family: 'POWER', device_model: 'IBM Power Systems S822L', cpu_model: 'IBM POWER8', epoch_first: 16, rtc_per_epoch: 4, fp_quality: 0.91 },
        // Apple Silicon (Active Era, Epochs 18-30)
        { miner_id: 'minerApple_b8c9d0e1f2g3h4i5j6k7', device_arch: 'apple_silicon', device_family: 'ARM', device_model: 'Apple M1 Mac mini', cpu_model: 'Apple M1', epoch_first: 18, rtc_per_epoch: 3, fp_quality: 0.96 },
        { miner_id: 'minerApple_c9d0e1f2g3h4i5j6k7l8', device_arch: 'apple_silicon', device_family: 'ARM', device_model: 'Apple M2 Pro MacBook Pro', cpu_model: 'Apple M2 Pro', epoch_first: 20, rtc_per_epoch: 3, fp_quality: 0.97 },
        { miner_id: 'minerApple_d0e1f2g3h4i5j6k7l8m9', device_arch: 'apple_silicon', device_family: 'ARM', device_model: 'Apple M3 iMac', cpu_model: 'Apple M3', epoch_first: 24, rtc_per_epoch: 2, fp_quality: 0.98 },
        // StarFive JH7110 (Active Era, Epochs 22-30)
        { miner_id: 'minerJH7110_e1f2g3h4i5j6k7l8m9n0', device_arch: 'starfive_jh7110', device_family: 'RISC-V', device_model: 'StarFive VisionFive 2', cpu_model: 'StarFive JH7110', epoch_first: 22, rtc_per_epoch: 3, fp_quality: 0.85 },
        { miner_id: 'minerJH7110_f2g3h4i5j6k7l8m9n0o1', device_arch: 'starfive_jh7110', device_family: 'RISC-V', device_model: 'StarFive VisionFive 2 v1.3', cpu_model: 'StarFive JH7110', epoch_first: 25, rtc_per_epoch: 3, fp_quality: 0.86 },
        // SiFive Unmatched (Active Era, Epochs 23-30)
        { miner_id: 'minerSiFive_g3h4i5j6k7l8m9n0o1p2', device_arch: 'sifive_unmatched', device_family: 'RISC-V', device_model: 'SiFive Unmatched', cpu_model: 'SiFive Freedom U740', epoch_first: 23, rtc_per_epoch: 2, fp_quality: 0.84 },
        // Milk-V Pioneer (Active Era, Epochs 25-30)
        { miner_id: 'minerMilkV_h4i5j6k7l8m9n0o1p2q3', device_arch: 'milkv_pioneer', device_family: 'RISC-V', device_model: 'Milk-V Pioneer', cpu_model: 'Milk-V SG2380', epoch_first: 25, rtc_per_epoch: 2, fp_quality: 0.83 },
        // Core 2 Duo (Active Era, Epochs 10-30)
        { miner_id: 'minerC2D_i5j6k7l8m9n0o1p2q3r4', device_arch: 'core2duo', device_family: 'x86_64', device_model: 'Dell OptiPlex 755', cpu_model: 'Intel Core 2 Duo E8400', epoch_first: 10, rtc_per_epoch: 2, fp_quality: 0.89 },
        { miner_id: 'minerC2D_j6k7l8m9n0o1p2q3r4s5', device_arch: 'core2duo', device_family: 'x86_64', device_model: 'Apple MacBook Pro 2009', cpu_model: 'Intel Core 2 Duo P8700', epoch_first: 12, rtc_per_epoch: 2, fp_quality: 0.88 },
        // Modern x86_64 (Active Era, all epochs, large population)
        { miner_id: 'minerMOD_k7l8m9n0o1p2q3r4s5t6', device_arch: 'modern', device_family: 'x86_64', device_model: 'AMD Ryzen 9 5950X', cpu_model: 'AMD Ryzen 9 5950X', epoch_first: 8, rtc_per_epoch: 1, fp_quality: 0.87 },
        { miner_id: 'minerMOD_l8m9n0o1p2q3r4s5t6u7', device_arch: 'modern', device_family: 'x86_64', device_model: 'Intel i9-13900K', cpu_model: 'Intel Core i9-13900K', epoch_first: 15, rtc_per_epoch: 1, fp_quality: 0.85 },
        { miner_id: 'minerMOD_m9n0o1p2q3r4s5t6u7v8', device_arch: 'modern', device_family: 'x86_64', device_model: 'AMD Ryzen 5 7600X', cpu_model: 'AMD Ryzen 5 7600X', epoch_first: 20, rtc_per_epoch: 1, fp_quality: 0.84 },
        { miner_id: 'minerMOD_n0o1p2q3r4s5t6u7v8w9', device_arch: 'modern', device_family: 'x86_64', device_model: 'Intel N100 Mini PC', cpu_model: 'Intel Alder Lake N100', epoch_first: 25, rtc_per_epoch: 1, fp_quality: 0.80 },
        { miner_id: 'minerMOD_o1p2q3r4s5t6u7v8w9x0', device_arch: 'modern', device_family: 'x86_64', device_model: 'AMD EPYC 7763', cpu_model: 'AMD EPYC 7763', epoch_first: 18, rtc_per_epoch: 1, fp_quality: 0.86 },
    ];

    // Extended miner pools for realism (more miners per architecture)
    const EXTENDED_POOLS = {
        g3: [
            { miner_id: 'g3farmer01_a1b2c3d4e5f6', device_model: 'PowerBook G3', cpu_model: 'Motorola PPC 750', fp_quality: 0.94 },
            { miner_id: 'g3farmer02_b2c3d4e5f6g7', device_model: 'iMac G3', cpu_model: 'Motorola PPC 750', fp_quality: 0.91 },
            { miner_id: 'g3farmer03_c3d4e5f6g7h8', device_model: 'Power Mac G3', cpu_model: 'Motorola PPC 750', fp_quality: 0.96 },
            { miner_id: 'g3collector_d4e5f6g7h8i9', device_model: 'Macintosh 8600', cpu_model: 'PowerPC 604e', fp_quality: 0.88 },
        ],
        g4: [
            { miner_id: 'g4station01_e5f6g7h8i9j0', device_model: 'iMac G4', cpu_model: 'PowerPC 7447', fp_quality: 0.93 },
            { miner_id: 'g4station02_f6g7h8i9j0k1', device_model: 'PowerBook G4 15"', cpu_model: 'PowerPC 7450', fp_quality: 0.92 },
            { miner_id: 'g4station03_g7h8i9j0k1l2', device_model: 'Mac mini G4', cpu_model: 'PowerPC 7447A', fp_quality: 0.95 },
            { miner_id: 'g4station04_h8i9j0k1l2m3', device_model: 'Power Mac G4 Cube', cpu_model: 'PowerPC 7445', fp_quality: 0.94 },
            { miner_id: 'g4station05_i9j0k1l2m3n4', device_model: 'Xserve G4', cpu_model: 'PowerPC 7455', fp_quality: 0.97 },
        ],
        g5: [
            { miner_id: 'g5workstation_j0k1l2m3n4o5', device_model: 'Power Mac G5', cpu_model: 'PowerPC 970', fp_quality: 0.95 },
            { miner_id: 'g5workstation_k1l2m3n4o5p6', device_model: 'iMac G5', cpu_model: 'PowerPC 970FX', fp_quality: 0.94 },
            { miner_id: 'g5workstation_l2m3n4o5p6q7', device_model: 'PowerBook G5', cpu_model: 'PowerPC 970FX', fp_quality: 0.93 },
            { miner_id: 'g5workstation_m3n4o5p6q7r8', device_model: 'Mac Pro G5', cpu_model: 'PowerPC 970MP', fp_quality: 0.96 },
        ],
        sparc: [
            { miner_id: 'sparcstation_n4o5p6q7r8s9', device_model: 'Sun Ultra 5', cpu_model: 'UltraSPARC II', fp_quality: 0.91 },
            { miner_id: 'sparcstation_o5p6q7r8s9t0', device_model: 'Sun Blade 100', cpu_model: 'UltraSPARC III', fp_quality: 0.89 },
            { miner_id: 'sparcstation_p6q7r8s9t0u1', device_model: 'Sun Ultra 60', cpu_model: 'UltraSPARC IIi', fp_quality: 0.92 },
            { miner_id: 'sparcstation_q7r8s9t0u1v2', device_model: 'Sun Fire V210', cpu_model: 'UltraSPARC III', fp_quality: 0.88 },
            { miner_id: 'sparcstation_r8s9t0u1v2w3', device_model: 'Sun Blade 2000', cpu_model: 'UltraSPARC III', fp_quality: 0.90 },
        ],
        mips: [
            { miner_id: 'mipsworkstation_s9t0u1v2w3x4', device_model: 'SGI Indy', cpu_model: 'MIPS R5000', fp_quality: 0.90 },
            { miner_id: 'mipsworkstation_t0u1v2w3x4y5', device_model: 'SGI O2', cpu_model: 'MIPS R10000', fp_quality: 0.87 },
            { miner_id: 'mipsworkstation_u1v2w3x4y5z6', device_model: 'SGI Octane', cpu_model: 'MIPS R12000', fp_quality: 0.89 },
        ],
        power8: [
            { miner_id: 'power8rig_v2w3x4y5z6a7b8', device_model: 'IBM S812L', cpu_model: 'POWER8', fp_quality: 0.93 },
            { miner_id: 'power8rig_w3x4y5z6a7b8c9', device_model: 'IBM S822L', cpu_model: 'POWER8', fp_quality: 0.91 },
            { miner_id: 'power8rig_x4y5z6a7b8c9d0', device_model: 'Raptor Talos II', cpu_model: 'POWER9 (emulated)', fp_quality: 0.85 },
        ],
        apple_silicon: [
            { miner_id: 'applem1_d0e1f2g3h4i5j6', device_model: 'Apple M1 MacBook Air', cpu_model: 'Apple M1', fp_quality: 0.96 },
            { miner_id: 'applem2_e1f2g3h4i5j6k7', device_model: 'Apple M2 Pro Mac mini', cpu_model: 'Apple M2 Pro', fp_quality: 0.97 },
            { miner_id: 'applem2f_f2g3h4i5j6k7l8', device_model: 'Apple M2 MacBook Air', cpu_model: 'Apple M2', fp_quality: 0.97 },
            { miner_id: 'applem3_g3h4i5j6k7l8m9', device_model: 'Apple M3 MacBook Pro', cpu_model: 'Apple M3', fp_quality: 0.98 },
            { miner_id: 'applem3p_h4i5j6k7l8m9n0', device_model: 'Apple M3 Pro MacBook Pro', cpu_model: 'Apple M3 Pro', fp_quality: 0.98 },
            { miner_id: 'applem4_i5j6k7l8m9n0o1', device_model: 'Apple M4 MacBook Pro', cpu_model: 'Apple M4', fp_quality: 0.99 },
        ],
        starfive_jh7110: [
            { miner_id: 'visionfive2_j6k7l8m9n0o1p2', device_model: 'VisionFive 2 8GB', cpu_model: 'JH7110', fp_quality: 0.85 },
            { miner_id: 'visionfive2_k7l8m9n0o1p2q3', device_model: 'VisionFive 2 16GB', cpu_model: 'JH7110', fp_quality: 0.86 },
            { miner_id: 'visionfive2_l8m9n0o1p2q3r4', device_model: 'VisionFive 2 v1.3', cpu_model: 'JH7110', fp_quality: 0.87 },
        ],
        sifive_unmatched: [
            { miner_id: 'sifive_u9v0w1x2y3z4a5', device_model: 'SiFive Unmatched 16GB', cpu_model: 'U740', fp_quality: 0.84 },
            { miner_id: 'sifive_v0w1x2y3z4a5b6', device_model: 'SiFive Unmatched 8GB', cpu_model: 'U740', fp_quality: 0.83 },
        ],
        milkv_pioneer: [
            { miner_id: 'milkv_w1x2y3z4a5b6c7', device_model: 'Milk-V Pioneer 1U', cpu_model: 'SG2380', fp_quality: 0.83 },
            { miner_id: 'milkv_x2y3z4a5b6c7d8', device_model: 'Milk-V Pioneer 2U', cpu_model: 'SG2380', fp_quality: 0.84 },
        ],
        core2duo: [
            { miner_id: 'core2duo_y3z4a5b6c7d8e9', device_model: 'Dell OptiPlex 755', cpu_model: 'C2D E8400', fp_quality: 0.89 },
            { miner_id: 'core2duo_z4a5b6c7d8e9f0', device_model: 'HP Compaq 8000', cpu_model: 'C2D E7500', fp_quality: 0.88 },
            { miner_id: 'core2duo_a5b6c7d8e9f0g1', device_model: 'Lenovo ThinkCentre', cpu_model: 'C2D E4600', fp_quality: 0.87 },
        ],
        modern: [
            { miner_id: 'modernryzen_b6c7d8e9f0g1h2', device_model: 'Ryzen 9 5950X', cpu_model: 'AMD Ryzen 9 5950X', fp_quality: 0.87 },
            { miner_id: 'modernryzen_c7d8e9f0g1h2i3', device_model: 'Ryzen 7 7800X3D', cpu_model: 'AMD Ryzen 7 7800X3D', fp_quality: 0.88 },
            { miner_id: 'modernintel_d8e9f0g1h2i3j4', device_model: 'i9-14900K', cpu_model: 'Intel i9-14900K', fp_quality: 0.86 },
            { miner_id: 'modernintel_e9f0g1h2i3j4k5', device_model: 'i7-14700K', cpu_model: 'Intel i7-14700K', fp_quality: 0.85 },
            { miner_id: 'modernepyc_f0g1h2i3j4k5l6', device_model: 'EPYC 7763 Server', cpu_model: 'AMD EPYC 7763', fp_quality: 0.86 },
            { miner_id: 'modernatom_g1h2i3j4k5l6m7', device_model: 'Mini PC N100', cpu_model: 'Intel N100', fp_quality: 0.80 },
            { miner_id: 'modernatom_h2i3j4k5l6m7n8', device_model: 'Beelink EQ12', cpu_model: 'Intel N305', fp_quality: 0.81 },
        ],
        '68k': [
            { miner_id: 'm68kclassic_i3j4k5l6m7n8o9', device_model: 'Macintosh IIci', cpu_model: 'Motorola 68030', fp_quality: 0.99 },
            { miner_id: 'm68kclassic_j4k5l6m7n8o9p0', device_model: 'Macintosh SE/30', cpu_model: 'Motorola 68030', fp_quality: 1.0 },
            { miner_id: 'm68kclassic_k5l6m7n8o9p0q1', device_model: 'Macintosh IIfx', cpu_model: 'Motorola 68030', fp_quality: 0.98 },
            { miner_id: 'm68klisa_l6m7n8o9p0q1r2', device_model: 'Apple Lisa 2', cpu_model: 'Motorola 68010', fp_quality: 0.97 },
        ],
    };

    // Generate attestation records
    const MAX_EPOCH = 30;
    const DATA = [];

    function generateAttestations() {
        // Seed miners
        SEED_MINERS.forEach(seed => {
            for (let epoch = seed.epoch_first; epoch <= MAX_EPOCH; epoch++) {
                const jitter = (Math.random() - 0.5) * 0.3;
                DATA.push({
                    miner_id: seed.miner_id,
                    device_arch: seed.device_arch,
                    device_family: seed.device_family,
                    device_model: seed.device_model,
                    cpu_model: seed.cpu_model,
                    epoch,
                    rtc_earned: Math.max(0, seed.rtc_per_epoch * (1 + jitter)),
                    fp_quality: seed.fp_quality,
                    attestation_count: Math.floor(seed.rtc_per_epoch * 10),
                });
            }
        });

        // Extended pools (probabilistic appearance based on epoch)
        Object.entries(EXTENDED_POOLS).forEach(([arch, miners]) => {
            const epochAppear = {
                '68k': 0, 'g3': 0, 'g4': 3, 'g5': 6,
                'sparc': 8, 'mips': 10, 'power8': 15,
                'starfive_jh7110': 22, 'sifive_unmatched': 23,
                'milkv_pioneer': 25, 'apple_silicon': 18,
                'core2duo': 10, 'modern': 8
            };
            const firstEpoch = epochAppear[arch] || 5;

            miners.forEach(miner => {
                for (let epoch = firstEpoch; epoch <= MAX_EPOCH; epoch++) {
                    // Probability decreases for older archs in later epochs
                    let prob = 1.0;
                    if (arch === '68k' || arch === 'g3') {
                        prob = Math.max(0.3, 1 - (epoch - firstEpoch) * 0.02);
                    } else if (arch === 'g4' || arch === 'g5') {
                        prob = Math.max(0.4, 1 - (epoch - firstEpoch) * 0.015);
                    } else if (arch === 'core2duo') {
                        prob = Math.max(0.5, 1 - (epoch - firstEpoch) * 0.01);
                    } else if (arch === 'modern') {
                        prob = 0.9 + Math.random() * 0.1; // modern stays strong
                    } else {
                        prob = 0.8 + Math.random() * 0.2;
                    }

                    if (Math.random() < prob) {
                        const rtcBase = {
                            '68k': 18, 'g3': 12, 'g4': 9, 'g5': 6,
                            'sparc': 5, 'mips': 4, 'power8': 4,
                            'starfive_jh7110': 3, 'sifive_unmatched': 2,
                            'milkv_pioneer': 2, 'apple_silicon': 3,
                            'core2duo': 2, 'modern': 1
                        }[arch] || 1;

                        DATA.push({
                            miner_id: miner.miner_id,
                            device_arch: arch,
                            device_family: arch.startsWith('g') ? 'PowerPC' :
                                          arch === '68k' ? 'Motorola 68K' :
                                          arch === 'sparc' ? 'SPARC' :
                                          arch === 'mips' ? 'MIPS' :
                                          arch === 'power8' ? 'POWER' :
                                          arch.startsWith('apple') ? 'ARM' :
                                          arch.startsWith('starfive') || arch.startsWith('sifive') || arch.startsWith('milkv') || arch.startsWith('riscv') ? 'RISC-V' :
                                          arch === 'core2duo' ? 'x86_64' : 'x86_64',
                            device_model: miner.device_model,
                            cpu_model: miner.cpu_model,
                            epoch,
                            rtc_earned: Math.max(0, rtcBase * (0.8 + Math.random() * 0.4)),
                            fp_quality: miner.fp_quality,
                            attestation_count: Math.floor(rtcBase * 10),
                        });
                    }
                }
            });
        });

        return DATA;
    }

    generateAttestations();

    // Expose as window.DATA for index.html
    window.DATA = DATA;

    // Pretty-print stats to console
    const byArch = {};
    DATA.forEach(d => {
        byArch[d.device_arch] = byArch[d.device_arch] || [];
        byArch[d.device_arch].push(d);
    });
    console.log('[Fossil Record] Dataset loaded:', DATA.length, 'attestations');
    console.log('[Fossil Record] By architecture:');
    Object.entries(byArch).forEach(([arch, records]) => {
        const epochs = [...new Set(records.map(r => r.epoch))];
        const uniqueMiners = [...new Set(records.map(r => r.miner_id))];
        console.log(`  ${arch}: ${records.length} attestations, ${uniqueMiners.length} unique miners, epochs ${Math.min(...epochs)}-${Math.max(...epochs)}`);
    });

})();
