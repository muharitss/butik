import type { VocabularyField, MeasurementPreset } from '../types/measurements.types.ts';

/**
 * Shared body measurement field vocabulary for MVP.
 * Contains both Indonesian and English standard tailoring terms matching the backend schema.
 * ponytail: deliberate simplification — static vocabulary set. Adding custom fields
 * requires updating this array or Post-MVP dynamic vocabulary management.
 */
export const MEASUREMENT_VOCABULARY: VocabularyField[] = [
  // Indonesian Standard — Atasan (Upper Body)
  { key: 'lingkar_dada', label: 'Lingkar Dada', unit: 'cm', category: 'atasan' },
  { key: 'panjang_baju', label: 'Panjang Baju', unit: 'cm', category: 'atasan' },
  { key: 'lebar_bahu', label: 'Lebar Bahu', unit: 'cm', category: 'atasan' },
  { key: 'panjang_lengan', label: 'Panjang Lengan', unit: 'cm', category: 'atasan' },
  { key: 'lingkar_leher', label: 'Lingkar Leher', unit: 'cm', category: 'atasan' },
  { key: 'lebar_dada', label: 'Lebar Dada Depan', unit: 'cm', category: 'atasan' },
  { key: 'lebar_punggung', label: 'Lebar Punggung', unit: 'cm', category: 'atasan' },
  { key: 'lingkar_kerung_lengan', label: 'Lingkar Kerung Lengan', unit: 'cm', category: 'atasan' },
  { key: 'lingkar_lengan', label: 'Lingkar Lengan (Biceps)', unit: 'cm', category: 'atasan' },
  { key: 'lingkar_pergelangan', label: 'Lingkar Pergelangan Tangan', unit: 'cm', category: 'atasan' },

  // Indonesian Standard — Bawahan (Lower Body)
  { key: 'lingkar_pinggang', label: 'Lingkar Pinggang', unit: 'cm', category: 'bawahan' },
  { key: 'lingkar_pinggul', label: 'Lingkar Pinggul', unit: 'cm', category: 'bawahan' },
  { key: 'panjang_celana', label: 'Panjang Celana', unit: 'cm', category: 'bawahan' },
  { key: 'panjang_rok', label: 'Panjang Rok', unit: 'cm', category: 'bawahan' },
  { key: 'lingkar_paha', label: 'Lingkar Paha', unit: 'cm', category: 'bawahan' },
  { key: 'lingkar_lutut', label: 'Lingkar Lutut', unit: 'cm', category: 'bawahan' },
  { key: 'lingkar_kaki', label: 'Lingkar Kaki Bawah', unit: 'cm', category: 'bawahan' },
  { key: 'pesak', label: 'Tinggi Pesak', unit: 'cm', category: 'bawahan' },
  { key: 'tinggi_duduk', label: 'Tinggi Duduk', unit: 'cm', category: 'bawahan' },

  // Indonesian Standard — Gaun & Terusan (Dresses & One-piece)
  { key: 'panjang_gaun', label: 'Panjang Gaun / Gamis', unit: 'cm', category: 'gaun' },
  { key: 'tinggi_punggung', label: 'Tinggi Punggung', unit: 'cm', category: 'gaun' },
  { key: 'panjang_punggung', label: 'Panjang Punggung', unit: 'cm', category: 'gaun' },

  // English Standard — Upper Body
  { key: 'chest', label: 'Chest (Dada)', unit: 'cm', category: 'atasan' },
  { key: 'bust', label: 'Bust (Payudara)', unit: 'cm', category: 'atasan' },
  { key: 'underbust', label: 'Underbust (Bawah Dada)', unit: 'cm', category: 'atasan' },
  { key: 'shoulder', label: 'Shoulder (Bahu)', unit: 'cm', category: 'atasan' },
  { key: 'shoulder_width', label: 'Shoulder Width (Lebar Bahu)', unit: 'cm', category: 'atasan' },
  { key: 'sleeve_length', label: 'Sleeve Length (Panjang Lengan)', unit: 'cm', category: 'atasan' },
  { key: 'arm_length', label: 'Arm Length (Panjang Lengan)', unit: 'cm', category: 'atasan' },
  { key: 'neck', label: 'Neck (Leher)', unit: 'cm', category: 'atasan' },
  { key: 'neck_circumference', label: 'Neck Circumference (Lingkar Leher)', unit: 'cm', category: 'atasan' },
  { key: 'wrist', label: 'Wrist (Pergelangan)', unit: 'cm', category: 'atasan' },
  { key: 'torso_length', label: 'Torso Length (Panjang Torso)', unit: 'cm', category: 'atasan' },
  { key: 'back_width', label: 'Back Width (Lebar Punggung)', unit: 'cm', category: 'atasan' },
  { key: 'front_length', label: 'Front Length (Panjang Depan)', unit: 'cm', category: 'atasan' },
  { key: 'shirt_length', label: 'Shirt Length (Panjang Kemeja)', unit: 'cm', category: 'atasan' },

  // English Standard — Lower Body
  { key: 'waist', label: 'Waist (Pinggang)', unit: 'cm', category: 'bawahan' },
  { key: 'hip', label: 'Hip (Pinggul)', unit: 'cm', category: 'bawahan' },
  { key: 'inseam', label: 'Inseam (Kaki Bagian Dalam)', unit: 'cm', category: 'bawahan' },
  { key: 'outseam', label: 'Outseam (Kaki Bagian Luar)', unit: 'cm', category: 'bawahan' },
  { key: 'thigh', label: 'Thigh (Paha)', unit: 'cm', category: 'bawahan' },
  { key: 'calf', label: 'Calf (Betis)', unit: 'cm', category: 'bawahan' },
  { key: 'ankle', label: 'Ankle (Pergelangan Kaki)', unit: 'cm', category: 'bawahan' },
  { key: 'pants_length', label: 'Pants Length (Panjang Celana)', unit: 'cm', category: 'bawahan' },
  { key: 'skirt_length', label: 'Skirt Length (Panjang Rok)', unit: 'cm', category: 'bawahan' },
  { key: 'crotch', label: 'Crotch (Pesak)', unit: 'cm', category: 'bawahan' },

  // English Standard — Dress
  { key: 'dress_length', label: 'Dress Length (Panjang Gaun)', unit: 'cm', category: 'gaun' },
];

const VOCABULARY_MAP = new Map<string, VocabularyField>(
  MEASUREMENT_VOCABULARY.map((field) => [field.key, field])
);

/**
 * Returns human-friendly metadata for any vocabulary field key,
 * falling back to formatting the key if unknown.
 */
export function getFieldInfo(fieldKey: string): { label: string; unit: string; category: string } {
  const match = VOCABULARY_MAP.get(fieldKey.toLowerCase());
  if (match) {
    return { label: match.label, unit: match.unit, category: match.category };
  }
  // Fallback prettification
  const label = fieldKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label, unit: 'cm', category: 'umum' };
}

/**
 * Standard tailor presets for quick-populating common sets of measurements.
 */
export const MEASUREMENT_PRESETS: MeasurementPreset[] = [
  {
    id: 'atasan',
    label: 'Atasan / Kemeja',
    description: 'Kemeja, jas, blus, atau atasan formal/santai',
    fieldKeys: [
      'lingkar_dada',
      'panjang_baju',
      'lebar_bahu',
      'panjang_lengan',
      'lingkar_leher',
      'lingkar_pergelangan',
    ],
  },
  {
    id: 'bawahan',
    label: 'Celana / Rok',
    description: 'Celana bahan, jeans, rok panjang/pendek',
    fieldKeys: [
      'lingkar_pinggang',
      'lingkar_pinggul',
      'panjang_celana',
      'lingkar_paha',
      'pesak',
      'lingkar_kaki',
    ],
  },
  {
    id: 'gamis',
    label: 'Gamis / Gaun / Kebaya',
    description: 'Busana muslim, gamis, kebaya, gaun pesta',
    fieldKeys: [
      'lingkar_dada',
      'lingkar_pinggang',
      'lingkar_pinggul',
      'panjang_gaun',
      'lebar_bahu',
      'panjang_lengan',
      'lingkar_kerung_lengan',
    ],
  },
  {
    id: 'lengkap',
    label: 'Badan Lengkap (Full)',
    description: 'Profil pengukuran badan menyeluruh untuk arsip pelanggan',
    fieldKeys: [
      'lingkar_dada',
      'lingkar_pinggang',
      'lingkar_pinggul',
      'lebar_bahu',
      'panjang_baju',
      'panjang_celana',
      'panjang_lengan',
      'lingkar_leher',
      'lingkar_paha',
      'pesak',
    ],
  },
];
