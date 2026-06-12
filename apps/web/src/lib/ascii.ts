/**
 * Cohesive ASCII art module — green-phosphor terminal aesthetic.
 * All strings are plain text (no ANSI codes); color comes from CSS.
 * Every piece uses spaces only (no tab characters).
 * Monospace-aligned at the widths noted per piece.
 */

// ---------------------------------------------------------------------------
// THUMPER — large RIG screen variant (~20 lines x 38 cols)
// A tall vertical mech: heavy shoulder armor, segmented spine, tripod base.
// ---------------------------------------------------------------------------
export const THUMPER_LARGE = `\
       ╔═══╦═══════════╦═══╗
      ╔╩═══╩═══════════╩═══╩╗
      ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
      ╠═╦═══════════════╦═══╣
     ╔╩═╩╗ ╔═════════╗ ╔╩═╩╗
     ║▒▒▒║ ║  THUMPER║ ║▒▒▒║
     ╚═══╝ ║  MK-IV  ║ ╚═══╝
           ╚════╦════╝
           ╔════╩════╗
           ║ ░╠═══╣░ ║
           ║ ░║   ║░ ║
           ╚══╬═══╬══╝
           ╔══╩═══╩══╗
          ╔╩══╦═══╦══╩╗
          ║▓▓▓║   ║▓▓▓║
         ╔╩═══╩═╦═╩═══╩╗
        ╔╩╗   ╔═╩═╗   ╔╩╗
        ║/║   ║///║   ║\\║
        ╚═╝   ╚═══╝   ╚═╝`;

// ---------------------------------------------------------------------------
// THUMPER COMPACT — FIELD watched-run view (~9 lines x 32 cols)
// Same silhouette language, smaller.
// ---------------------------------------------------------------------------
export const THUMPER_COMPACT = `\
     ╔══╦═══════════╦══╗
    ╔╩══╩═══════════╩══╩╗
    ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
    ╚═╦══╦═══════╦══╦═══╝
      ║  ║░░░░░░░║  ║
      ║  ╠═══════╣  ║
      ╚╦═╩═╦═══╦═╩═╦╝
      ╔╩╗ ╔╩═══╩╗ ╔╩╗
      ╚╤╝ ╚═════╝ ╚╤╝`;

// ---------------------------------------------------------------------------
// THUMPER DAMAGED — hull-failsafe recall moment (~9 lines x 32 cols)
// Same compact silhouette with break/spark characters.
// ---------------------------------------------------------------------------
export const THUMPER_DAMAGED = `\
     ╔══╦═══════════╦══╗
    ╔╩══╩╗*DAMAGED*╔╩══╩╗
    ║ ▒░▓░▒░▓░▒░▓░▒░▓░▒ ║
    ╚═╦══╦╗!░░░░░╔╦══╦═══╝
      ║  ║╚╗*!*░╔╝║  ║
      ║  ╠══*!*══╣  ║
      ╚╦═╩═╦═*!═╦═╩═╦╝
      ╔╩╗ ╔╩══!══╩╗ ╔╩╗
      ╚╤╝ ╚══!════╝ ╚╤╝`;

// ---------------------------------------------------------------------------
// FABRICATOR ONLINE — settlement milestone takeover (~13 lines x 34 cols)
// Industrial gantry powering up around block-letter centerpiece.
// ---------------------------------------------------------------------------
export const FABRICATOR_ONLINE = `\
  ╔══[GANTRY ARM A]══════════╗
  ║  ╔════════════════════╗  ║
  ╠══╣ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ╠══╣
  ║  ║ ░░░░░░░░░░░░░░░░ ║  ║
  ║  ║ FABRICATOR ONLINE ║  ║
  ║  ║ ░░░░░░░░░░░░░░░░ ║  ║
  ╠══╣ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ╠══╣
  ║  ╚════════════════════╝  ║
  ╠═══╦══╦══════════╦══╦═════╣
  ║   ║//║          ║\\║   ║
  ║   ║//╠══════════╣\\║   ║
  ╚═══╩══╩══════════╩══╩═════╝
  [POWER: ████████████ 100%]`;

// ---------------------------------------------------------------------------
// SETTLEMENT CAMP — settlement screen header glyph (~7 lines x 37 cols)
// Industrial outpost: docking bays, crate stacks, fabricator tower.
// ---------------------------------------------------------------------------
export const SETTLEMENT_CAMP = `\
  ╔══[ RED MESA SETTLEMENT ]══╗
  ║  ╔══════╗  ╔═══╗  ╔═══╗  ║
  ║  ║FOREMAN║  ║FAB║  ║DOC║  ║
  ║  ╠══════╣  ╠═══╣  ╠═══╣  ║
  ╠══╣::::::╠══╣:::╠══╣:::╠══╣
  ║  ╚══════╝  ╚═══╝  ╚═══╝  ║
  ╚═══════════════════════════╝`;
