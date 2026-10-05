/**
 * "Research at a Glance" network.
 *
 * Nodes are fields; edges say which fields inform each other. This is a
 * subject map, not a claim about personal achievements, but it should still
 * be reviewed and edited by the academic so it reflects their own view.
 *
 * - kind: 'teaching' | 'research' | 'concept' (concept = bridging field with no page)
 * - href: page the node links to (omit for concepts)
 * - wide / tall: coordinates for the desktop (1000 x 460) and phone (400 x 760) layouts
 * - lines: label broken into lines for legibility
 */
export type NodeKind = 'teaching' | 'research' | 'concept';

export interface MapNode {
  id: string;
  label: string;
  lines: string[];
  kind: NodeKind;
  href?: string;
  wide: { x: number; y: number };
  tall: { x: number; y: number };
}

export const NODES: MapNode[] = [
  {
    id: 'physical-chemistry',
    label: 'Physical Chemistry',
    lines: ['Physical', 'Chemistry'],
    kind: 'teaching',
    href: '/teaching/physical-chemistry/',
    wide: { x: 100, y: 230 },
    tall: { x: 200, y: 60 },
  },
  {
    id: 'quantum-chemistry',
    label: 'Quantum Chemistry',
    lines: ['Quantum', 'Chemistry'],
    kind: 'teaching',
    href: '/teaching/quantum-chemistry/',
    wide: { x: 310, y: 105 },
    tall: { x: 95, y: 175 },
  },
  {
    id: 'spectroscopy',
    label: 'Atomic & Molecular Spectroscopy',
    lines: ['Atomic & Molecular', 'Spectroscopy'],
    kind: 'teaching',
    href: '/teaching/spectroscopy/',
    wide: { x: 310, y: 355 },
    tall: { x: 305, y: 175 },
  },
  {
    id: 'electronic-structure',
    label: 'Electronic Structure',
    lines: ['Electronic', 'Structure'],
    kind: 'research',
    href: '/research/electronic-structure/',
    wide: { x: 525, y: 160 },
    tall: { x: 95, y: 320 },
  },
  {
    id: 'molecular-structure',
    label: 'Molecular Structure',
    lines: ['Molecular', 'Structure'],
    kind: 'concept',
    wide: { x: 525, y: 330 },
    tall: { x: 305, y: 320 },
  },
  {
    id: 'computational-chemistry',
    label: 'Computational Chemistry',
    lines: ['Computational', 'Chemistry'],
    kind: 'teaching',
    href: '/teaching/computational-chemistry/',
    wide: { x: 740, y: 80 },
    tall: { x: 80, y: 470 },
  },
  {
    id: 'molecular-modelling',
    label: 'Molecular Modelling',
    lines: ['Molecular', 'Modelling'],
    kind: 'research',
    href: '/research/molecular-modelling/',
    wide: { x: 740, y: 245 },
    tall: { x: 200, y: 545 },
  },
  {
    id: 'chemoinformatics',
    label: 'Chemoinformatics',
    lines: ['Chemoinformatics'],
    kind: 'teaching',
    href: '/teaching/chemoinformatics/',
    wide: { x: 740, y: 395 },
    tall: { x: 320, y: 470 },
  },
  {
    id: 'scientific-software',
    label: 'Scientific Software',
    lines: ['Scientific', 'Software'],
    kind: 'research',
    href: '/research/scientific-software/',
    wide: { x: 920, y: 245 },
    tall: { x: 200, y: 690 },
  },
];

export const EDGES: [string, string][] = [
  ['physical-chemistry', 'quantum-chemistry'],
  ['physical-chemistry', 'spectroscopy'],
  ['quantum-chemistry', 'spectroscopy'],
  ['quantum-chemistry', 'electronic-structure'],
  ['spectroscopy', 'electronic-structure'],
  ['spectroscopy', 'molecular-structure'],
  ['electronic-structure', 'molecular-structure'],
  ['electronic-structure', 'computational-chemistry'],
  ['molecular-structure', 'molecular-modelling'],
  ['molecular-structure', 'chemoinformatics'],
  ['computational-chemistry', 'molecular-modelling'],
  ['computational-chemistry', 'scientific-software'],
  ['molecular-modelling', 'scientific-software'],
  ['chemoinformatics', 'scientific-software'],
];

export const KIND_LABEL: Record<NodeKind, string> = {
  teaching: 'Teaching subject',
  research: 'Research theme',
  concept: 'Bridging concept',
};
