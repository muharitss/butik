import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export interface GarmentTypeSeed {
  name: string;
  description: string;
}

export interface MeasurementFieldDef {
  fieldKey: string;
  label: string;
  unit: string;
  isRequired: boolean;
  sortOrder: number;
}

export const GARMENT_TYPES: GarmentTypeSeed[] = [
  // 1. Atasan
  { name: "Atasan", description: "Atasan" },
  { name: "Kemeja", description: "Atasan" },
  { name: "Kemeja Formal", description: "Atasan" },
  { name: "Kemeja Casual", description: "Atasan" },
  { name: "Kemeja Koko", description: "Atasan" },
  { name: "Kemeja Batik", description: "Atasan" },
  { name: "Blouse", description: "Atasan" },
  { name: "Tunik", description: "Atasan" },
  { name: "Kaos", description: "Atasan" },
  { name: "Polo Shirt", description: "Atasan" },
  { name: "Tank Top", description: "Atasan" },
  { name: "Crop Top", description: "Atasan" },
  { name: "Sweater", description: "Atasan" },
  { name: "Hoodie", description: "Atasan" },
  { name: "Cardigan", description: "Atasan" },
  { name: "Vest", description: "Atasan" },
  { name: "Rompi", description: "Atasan" },
  { name: "Jaket", description: "Atasan" },
  { name: "Bomber Jacket", description: "Atasan" },
  { name: "Varsity Jacket", description: "Atasan" },
  { name: "Blazer", description: "Atasan" },
  { name: "Jas", description: "Atasan" },
  { name: "Safari Jacket", description: "Atasan" },
  { name: "Outer", description: "Atasan" },

  // 2. Bawahan
  { name: "Celana Panjang", description: "Bawahan" },
  { name: "Celana Pendek", description: "Bawahan" },
  { name: "Celana Jeans", description: "Bawahan" },
  { name: "Celana Chino", description: "Bawahan" },
  { name: "Celana Cargo", description: "Bawahan" },
  { name: "Celana Bahan", description: "Bawahan" },
  { name: "Celana Jogger", description: "Bawahan" },
  { name: "Celana Training", description: "Bawahan" },
  { name: "Celana Kulot", description: "Bawahan" },
  { name: "Legging", description: "Bawahan" },
  { name: "Rok", description: "Bawahan" },
  { name: "Rok Mini", description: "Bawahan" },
  { name: "Rok Midi", description: "Bawahan" },
  { name: "Rok Panjang", description: "Bawahan" },
  { name: "Rok Plisket", description: "Bawahan" },
  { name: "Rok Span", description: "Bawahan" },
  { name: "Rok A-Line", description: "Bawahan" },

  // 3. Setelan
  { name: "Setelan", description: "Setelan" },
  { name: "Setelan Jas", description: "Setelan" },
  { name: "Suit", description: "Setelan" },
  { name: "Tuxedo", description: "Setelan" },
  { name: "Setelan Kantor", description: "Setelan" },
  { name: "Setelan Casual", description: "Setelan" },
  { name: "Setelan Olahraga", description: "Setelan" },
  { name: "Setelan Muslim", description: "Setelan" },
  { name: "Tracksuit", description: "Setelan / Olahraga" },
  { name: "Two-Piece", description: "Setelan" },
  { name: "Three-Piece", description: "Setelan" },

  // 4. Dress & Gaun
  { name: "Dress Casual", description: "Dress & Gaun" },
  { name: "Dress Formal", description: "Dress & Gaun" },
  { name: "Maxi Dress", description: "Dress & Gaun" },
  { name: "Midi Dress", description: "Dress & Gaun" },
  { name: "Mini Dress", description: "Dress & Gaun" },
  { name: "Cocktail Dress", description: "Dress & Gaun" },
  { name: "Evening Gown", description: "Dress & Gaun" },
  { name: "Wedding Dress", description: "Dress & Gaun / Pengantin" },
  { name: "Bridesmaid Dress", description: "Dress & Gaun / Pesta" },
  { name: "Party Dress", description: "Dress & Gaun" },
  { name: "Shift Dress", description: "Dress & Gaun" },
  { name: "A-Line Dress", description: "Dress & Gaun" },
  { name: "Wrap Dress", description: "Dress & Gaun" },
  { name: "Shirt Dress", description: "Dress & Gaun" },
  { name: "Bodycon Dress", description: "Dress & Gaun" },

  // 5. Busana Muslim
  { name: "Gamis", description: "Busana Muslim" },
  { name: "Jubah", description: "Busana Muslim" },
  { name: "Abaya", description: "Busana Muslim" },
  { name: "Kaftan", description: "Busana Muslim" },
  { name: "Baju Koko", description: "Busana Muslim" },
  { name: "Baju Kurta", description: "Busana Muslim" },
  { name: "Tunik Muslim", description: "Busana Muslim" },
  { name: "Rok Muslim", description: "Busana Muslim" },
  { name: "Celana Muslim", description: "Busana Muslim" },
  { name: "Mukena", description: "Busana Muslim" },
  { name: "Sarung", description: "Busana Muslim" },
  { name: "Khimar", description: "Busana Muslim" },
  { name: "Hijab", description: "Busana Muslim" },
  { name: "Inner Hijab", description: "Busana Muslim" },

  // 6. Pakaian Tradisional & Adat
  { name: "Kebaya", description: "Pakaian Tradisional & Adat" },
  { name: "Kebaya Kutubaru", description: "Pakaian Tradisional & Adat" },
  { name: "Kebaya Encim", description: "Pakaian Tradisional & Adat" },
  { name: "Kebaya Modern", description: "Pakaian Tradisional & Adat" },
  { name: "Beskap", description: "Pakaian Tradisional & Adat" },
  { name: "Surjan", description: "Pakaian Tradisional & Adat" },
  { name: "Blangkon", description: "Aksesori / headwear tradisional" },
  { name: "Baju Kurung", description: "Pakaian Tradisional & Adat" },
  { name: "Baju Bodo", description: "Pakaian Tradisional & Adat" },
  { name: "Ulos-Based Garment", description: "Pakaian Tradisional & Adat" },
  { name: "Batik Shirt", description: "Pakaian Tradisional & Adat" },
  { name: "Batik Dress", description: "Pakaian Tradisional & Adat" },
  { name: "Batik Outer", description: "Pakaian Tradisional & Adat" },
  { name: "Beskap Pengantin", description: "Pakaian Tradisional & Adat / Pengantin" },
  { name: "Baju Adat Daerah", description: "Pakaian Tradisional & Adat" },

  // 7. Pakaian Pengantin & Pesta
  { name: "Kebaya Pengantin", description: "Pakaian Pengantin & Pesta" },
  { name: "Jas Pengantin", description: "Pakaian Pengantin & Pesta" },
  { name: "Bridesmaid Kebaya", description: "Pakaian Pengantin & Pesta" },
  { name: "Mother-of-the-Bride Dress", description: "Pakaian Pengantin & Pesta" },
  { name: "Flower Girl Dress", description: "Pakaian Pengantin & Pesta" },
  { name: "Seragam Keluarga", description: "Pakaian Pengantin & Pesta" },
  { name: "Seragam Pernikahan", description: "Pakaian Pengantin & Pesta" },
  { name: "Baju Lamaran", description: "Pakaian Pengantin & Pesta" },
  { name: "Baju Akad", description: "Pakaian Pengantin & Pesta" },

  // 8. Pakaian Anak & Bayi
  { name: "Baju Anak", description: "Pakaian Anak & Bayi" },
  { name: "Kemeja Anak", description: "Pakaian Anak & Bayi" },
  { name: "Blouse Anak", description: "Pakaian Anak & Bayi" },
  { name: "Dress Anak", description: "Pakaian Anak & Bayi" },
  { name: "Rok Anak", description: "Pakaian Anak & Bayi" },
  { name: "Celana Anak", description: "Pakaian Anak & Bayi" },
  { name: "Setelan Anak", description: "Pakaian Anak & Bayi" },
  { name: "Piyama Anak", description: "Pakaian Anak & Bayi" },
  { name: "Jaket Anak", description: "Pakaian Anak & Bayi" },
  { name: "Baju Bayi", description: "Pakaian Anak & Bayi" },
  { name: "Romper", description: "Pakaian Anak & Bayi" },
  { name: "Jumpsuit Anak", description: "Pakaian Anak & Bayi" },

  // 9. Pakaian Olahraga
  { name: "Jersey", description: "Pakaian Olahraga" },
  { name: "Football Jersey", description: "Pakaian Olahraga" },
  { name: "Futsal Jersey", description: "Pakaian Olahraga" },
  { name: "Basketball Jersey", description: "Pakaian Olahraga" },
  { name: "Volleyball Jersey", description: "Pakaian Olahraga" },
  { name: "Running Shirt", description: "Pakaian Olahraga" },
  { name: "Cycling Jersey", description: "Pakaian Olahraga" },
  { name: "Training Shirt", description: "Pakaian Olahraga" },
  { name: "Training Pants", description: "Pakaian Olahraga" },
  { name: "Sports Bra", description: "Pakaian Olahraga" },
  { name: "Legging Olahraga", description: "Pakaian Olahraga" },
  { name: "Shorts Olahraga", description: "Pakaian Olahraga" },

  // 10. Seragam & Pakaian Kerja
  { name: "Seragam Kantor", description: "Seragam & Pakaian Kerja" },
  { name: "Seragam Perusahaan", description: "Seragam & Pakaian Kerja" },
  { name: "Seragam Sekolah", description: "Seragam & Pakaian Kerja" },
  { name: "Seragam Pesantren", description: "Seragam & Pakaian Kerja" },
  { name: "Seragam Restoran", description: "Seragam & Pakaian Kerja" },
  { name: "Seragam Hotel", description: "Seragam & Pakaian Kerja" },
  { name: "Seragam Rumah Sakit", description: "Seragam & Pakaian Kerja" },
  { name: "Seragam Security", description: "Seragam & Pakaian Kerja" },
  { name: "Seragam Teknisi", description: "Seragam & Pakaian Kerja" },
  { name: "Wearpack", description: "Seragam & Pakaian Kerja" },
  { name: "Coverall", description: "Seragam & Pakaian Kerja" },
  { name: "Apron", description: "Seragam & Pakaian Kerja" },
  { name: "Chef Jacket", description: "Seragam & Pakaian Kerja" },
  { name: "Work Shirt", description: "Seragam & Pakaian Kerja" },
  { name: "Work Pants", description: "Seragam & Pakaian Kerja" },

  // 11. Pakaian Tidur & Pakaian Dalam
  { name: "Bra", description: "Pakaian Tidur & Pakaian Dalam" },
  { name: "Bralette", description: "Pakaian Tidur & Pakaian Dalam" },
  { name: "Celana Dalam", description: "Pakaian Tidur & Pakaian Dalam" },
  { name: "Boxer", description: "Pakaian Tidur & Pakaian Dalam" },
  { name: "Brief", description: "Pakaian Tidur & Pakaian Dalam" },
  { name: "Camisole", description: "Pakaian Tidur & Pakaian Dalam" },
  { name: "Piyama", description: "Pakaian Tidur & Pakaian Dalam" },
  { name: "Nightgown", description: "Pakaian Tidur & Pakaian Dalam" },
  { name: "Daster", description: "Pakaian Tidur & Pakaian Dalam" },
  { name: "Lingerie", description: "Pakaian Tidur & Pakaian Dalam" },
  { name: "Bathrobe", description: "Pakaian Tidur & Pakaian Dalam" },

  // 12. Jumpsuit, Kostum & Khusus
  { name: "Jumpsuit", description: "Jumpsuit, Kostum & Khusus" },
  { name: "Overall", description: "Jumpsuit, Kostum & Khusus" },
  { name: "Bib Overall", description: "Jumpsuit, Kostum & Khusus" },
  { name: "Maternity Wear", description: "Jumpsuit, Kostum & Khusus" },
  { name: "Nursing Wear", description: "Jumpsuit, Kostum & Khusus" },
  { name: "Costume", description: "Jumpsuit, Kostum & Khusus" },
  { name: "Cosplay Costume", description: "Jumpsuit, Kostum & Khusus" },
  { name: "Stage Costume", description: "Jumpsuit, Kostum & Khusus" },
  { name: "Dance Costume", description: "Jumpsuit, Kostum & Khusus" },
  { name: "Traditional Costume", description: "Jumpsuit, Kostum & Khusus" },
  { name: "Uniform Khusus", description: "Jumpsuit, Kostum & Khusus" },
  { name: "Protective Clothing", description: "Jumpsuit, Kostum & Khusus" },

  // 13. Produk Jahitan Non-Pakaian
  { name: "Produk Jahitan Non-Pakaian", description: "Produk Jahitan Non-Pakaian" },
  { name: "Gorden", description: "Produk Jahitan Non-Pakaian" },
  { name: "Sarung Bantal", description: "Produk Jahitan Non-Pakaian" },
  { name: "Sarung Guling", description: "Produk Jahitan Non-Pakaian" },
  { name: "Sprei", description: "Produk Jahitan Non-Pakaian" },
  { name: "Bed Cover", description: "Produk Jahitan Non-Pakaian" },
  { name: "Taplak Meja", description: "Produk Jahitan Non-Pakaian" },
  { name: "Table Runner", description: "Produk Jahitan Non-Pakaian" },
  { name: "Cover Kursi", description: "Produk Jahitan Non-Pakaian" },
  { name: "Cover Sofa", description: "Produk Jahitan Non-Pakaian" },
  { name: "Tas Kain", description: "Produk Jahitan Non-Pakaian" },
  { name: "Tote Bag", description: "Produk Jahitan Non-Pakaian" },
  { name: "Pouch", description: "Produk Jahitan Non-Pakaian" },
  { name: "Tas Custom", description: "Produk Jahitan Non-Pakaian" },
  { name: "Dompet Kain", description: "Produk Jahitan Non-Pakaian" },
  { name: "Boneka Kain", description: "Produk Jahitan Non-Pakaian" },
  { name: "Aksesori Kain", description: "Produk Jahitan Non-Pakaian" },
  { name: "Masker Kain", description: "Produk Jahitan Non-Pakaian" },
];

// Tailoring measurement archetypes
const atasanFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_dada", label: "Lingkar Dada", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "panjang_baju", label: "Panjang Baju", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lebar_bahu", label: "Lebar Bahu", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "panjang_lengan", label: "Panjang Lengan", unit: "cm", isRequired: true, sortOrder: 4 },
  { fieldKey: "lingkar_leher", label: "Lingkar Leher", unit: "cm", isRequired: false, sortOrder: 5 },
  { fieldKey: "lingkar_kerung_lengan", label: "Lingkar Kerung Lengan", unit: "cm", isRequired: false, sortOrder: 6 },
];

const atasanTanpaLenganFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_dada", label: "Lingkar Dada", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "panjang_baju", label: "Panjang Baju", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lebar_bahu", label: "Lebar Bahu", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang", unit: "cm", isRequired: false, sortOrder: 4 },
];

const outerFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_dada", label: "Lingkar Dada", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "panjang_baju", label: "Panjang Jas / Outer", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lebar_bahu", label: "Lebar Bahu", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "panjang_lengan", label: "Panjang Lengan", unit: "cm", isRequired: true, sortOrder: 4 },
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang", unit: "cm", isRequired: false, sortOrder: 5 },
  { fieldKey: "lingkar_pinggul", label: "Lingkar Pinggul", unit: "cm", isRequired: false, sortOrder: 6 },
];

const celanaPanjangFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lingkar_pinggul", label: "Lingkar Pinggul", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "panjang_celana", label: "Panjang Celana", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "lingkar_paha", label: "Lingkar Paha", unit: "cm", isRequired: true, sortOrder: 4 },
  { fieldKey: "pesak", label: "Tinggi Pesak", unit: "cm", isRequired: true, sortOrder: 5 },
  { fieldKey: "lingkar_kaki", label: "Lingkar Kaki Bawah", unit: "cm", isRequired: false, sortOrder: 6 },
];

const celanaPendekFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lingkar_pinggul", label: "Lingkar Pinggul", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "panjang_celana", label: "Panjang Celana", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "lingkar_paha", label: "Lingkar Paha", unit: "cm", isRequired: true, sortOrder: 4 },
  { fieldKey: "pesak", label: "Tinggi Pesak", unit: "cm", isRequired: true, sortOrder: 5 },
];

const rokFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lingkar_pinggul", label: "Lingkar Pinggul", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "panjang_rok", label: "Panjang Rok", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "lingkar_bawah_rok", label: "Lingkar Bawah Rok", unit: "cm", isRequired: false, sortOrder: 4 },
];

const setelanFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_dada", label: "Lingkar Dada", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "panjang_baju", label: "Panjang Jas / Atasan", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lebar_bahu", label: "Lebar Bahu", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "panjang_lengan", label: "Panjang Lengan", unit: "cm", isRequired: true, sortOrder: 4 },
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang", unit: "cm", isRequired: true, sortOrder: 5 },
  { fieldKey: "lingkar_pinggul", label: "Lingkar Pinggul", unit: "cm", isRequired: true, sortOrder: 6 },
  { fieldKey: "panjang_celana", label: "Panjang Celana / Bawahan", unit: "cm", isRequired: true, sortOrder: 7 },
  { fieldKey: "lingkar_paha", label: "Lingkar Paha", unit: "cm", isRequired: false, sortOrder: 8 },
  { fieldKey: "pesak", label: "Tinggi Pesak", unit: "cm", isRequired: false, sortOrder: 9 },
];

const dressFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_dada", label: "Lingkar Dada", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lingkar_pinggul", label: "Lingkar Pinggul", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "panjang_gaun", label: "Panjang Gaun / Dress", unit: "cm", isRequired: true, sortOrder: 4 },
  { fieldKey: "lebar_bahu", label: "Lebar Bahu", unit: "cm", isRequired: true, sortOrder: 5 },
  { fieldKey: "panjang_lengan", label: "Panjang Lengan", unit: "cm", isRequired: false, sortOrder: 6 },
];

const kebayaFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_dada", label: "Lingkar Dada", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lingkar_pinggul", label: "Lingkar Pinggul", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "panjang_baju", label: "Panjang Kebaya / Baju", unit: "cm", isRequired: true, sortOrder: 4 },
  { fieldKey: "lebar_bahu", label: "Lebar Bahu", unit: "cm", isRequired: true, sortOrder: 5 },
  { fieldKey: "panjang_lengan", label: "Panjang Lengan", unit: "cm", isRequired: true, sortOrder: 6 },
  { fieldKey: "lingkar_kerung_lengan", label: "Lingkar Kerung Lengan", unit: "cm", isRequired: false, sortOrder: 7 },
];

const blangkonFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_kepala", label: "Lingkar Kepala", unit: "cm", isRequired: true, sortOrder: 1 },
];

const mukenaFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_muka", label: "Lingkar Muka", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "panjang_depan", label: "Panjang Depan Atasan", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "panjang_belakang", label: "Panjang Belakang Atasan", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "panjang_bawahan", label: "Panjang Bawahan Rok", unit: "cm", isRequired: true, sortOrder: 4 },
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang Rok", unit: "cm", isRequired: true, sortOrder: 5 },
];

const hijabFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_muka", label: "Lingkar Muka", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "panjang_depan", label: "Panjang Depan", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "panjang_belakang", label: "Panjang Belakang", unit: "cm", isRequired: true, sortOrder: 3 },
];

const sarungFields: MeasurementFieldDef[] = [
  { fieldKey: "panjang_sarung", label: "Panjang Sarung", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lingkar_sarung", label: "Lingkar / Lebar Sarung", unit: "cm", isRequired: true, sortOrder: 2 },
];

const anakAtasanFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_dada", label: "Lingkar Dada", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "panjang_baju", label: "Panjang Baju", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lebar_bahu", label: "Lebar Bahu", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "panjang_lengan", label: "Panjang Lengan", unit: "cm", isRequired: false, sortOrder: 4 },
];

const anakBawahanFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "panjang_celana", label: "Panjang Celana / Rok", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lingkar_pinggul", label: "Lingkar Pinggul", unit: "cm", isRequired: false, sortOrder: 3 },
];

const anakSetelanFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_dada", label: "Lingkar Dada", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "panjang_baju", label: "Panjang Baju", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "panjang_celana", label: "Panjang Celana", unit: "cm", isRequired: true, sortOrder: 4 },
];

const anakDressFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_dada", label: "Lingkar Dada", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "panjang_baju", label: "Panjang Baju / Dress", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lebar_bahu", label: "Lebar Bahu", unit: "cm", isRequired: false, sortOrder: 3 },
];

const braFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_dada", label: "Lingkar Dada (Bust)", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lingkar_bawah_dada", label: "Lingkar Bawah Dada (Underbust)", unit: "cm", isRequired: true, sortOrder: 2 },
];

const underwearBawahanFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lingkar_pinggul", label: "Lingkar Pinggul", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lingkar_paha", label: "Lingkar Paha", unit: "cm", isRequired: false, sortOrder: 3 },
];

const jumpsuitFields: MeasurementFieldDef[] = [
  { fieldKey: "lingkar_dada", label: "Lingkar Dada", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lingkar_pinggang", label: "Lingkar Pinggang", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lingkar_pinggul", label: "Lingkar Pinggul", unit: "cm", isRequired: true, sortOrder: 3 },
  { fieldKey: "panjang_punggung", label: "Panjang Punggung / Pesak", unit: "cm", isRequired: true, sortOrder: 4 },
  { fieldKey: "panjang_celana", label: "Panjang Celana / Total", unit: "cm", isRequired: true, sortOrder: 5 },
  { fieldKey: "lebar_bahu", label: "Lebar Bahu", unit: "cm", isRequired: false, sortOrder: 6 },
];

const apronFields: MeasurementFieldDef[] = [
  { fieldKey: "panjang_apron", label: "Panjang Apron", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lebar_dada", label: "Lebar Dada Apron", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "lebar_pinggang", label: "Lebar Pinggang Apron", unit: "cm", isRequired: true, sortOrder: 3 },
];

const gordenFields: MeasurementFieldDef[] = [
  { fieldKey: "lebar", label: "Lebar Gorden", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "tinggi", label: "Tinggi Gorden", unit: "cm", isRequired: true, sortOrder: 2 },
];

const bantalFields: MeasurementFieldDef[] = [
  { fieldKey: "panjang", label: "Panjang", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lebar", label: "Lebar / Diameter", unit: "cm", isRequired: true, sortOrder: 2 },
];

const spreiFields: MeasurementFieldDef[] = [
  { fieldKey: "panjang", label: "Panjang Kasur", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lebar", label: "Lebar Kasur", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "tinggi", label: "Tinggi Kasur", unit: "cm", isRequired: true, sortOrder: 3 },
];

const taplakFields: MeasurementFieldDef[] = [
  { fieldKey: "panjang", label: "Panjang Meja", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lebar", label: "Lebar Meja", unit: "cm", isRequired: true, sortOrder: 2 },
];

const coverKursiFields: MeasurementFieldDef[] = [
  { fieldKey: "lebar_dudukan", label: "Lebar Dudukan", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "panjang_dudukan", label: "Kedalaman Dudukan", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "tinggi_sandaran", label: "Tinggi Sandaran", unit: "cm", isRequired: true, sortOrder: 3 },
];

const tasKainFields: MeasurementFieldDef[] = [
  { fieldKey: "panjang", label: "Panjang", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "lebar", label: "Lebar", unit: "cm", isRequired: true, sortOrder: 2 },
  { fieldKey: "tinggi", label: "Tinggi / Tebal", unit: "cm", isRequired: false, sortOrder: 3 },
];

const maskerFields: MeasurementFieldDef[] = [
  { fieldKey: "lebar", label: "Lebar Masker", unit: "cm", isRequired: true, sortOrder: 1 },
  { fieldKey: "tinggi", label: "Tinggi Masker", unit: "cm", isRequired: true, sortOrder: 2 },
];

export function getMeasurementFieldsForGarment(
  name: string,
  category: string
): MeasurementFieldDef[] {
  const n = name.toLowerCase();

  // Non-pakaian
  if (n.includes("gorden")) return gordenFields;
  if (n.includes("bantal") || n.includes("guling")) return bantalFields;
  if (n.includes("sprei") || n.includes("bed cover")) return spreiFields;
  if (n.includes("taplak") || n.includes("table runner")) return taplakFields;
  if (n.includes("cover kursi") || n.includes("cover sofa")) return coverKursiFields;
  if (
    n.includes("tas") ||
    n.includes("tote") ||
    n.includes("pouch") ||
    n.includes("dompet") ||
    n.includes("boneka") ||
    n.includes("aksesori kain")
  ) {
    return tasKainFields;
  }
  if (n.includes("masker")) return maskerFields;
  if (n.includes("non-pakaian")) return tasKainFields;

  // Headwear / Aksesori khusus
  if (n.includes("blangkon")) return blangkonFields;
  if (n.includes("mukena")) return mukenaFields;
  if (n.includes("hijab") || n.includes("khimar")) return hijabFields;
  if (n.includes("sarung")) return sarungFields;
  if (n.includes("apron")) return apronFields;

  // Underwear
  if (n.includes("bra") || n.includes("bralette")) return braFields;
  if (n.includes("celana dalam") || n.includes("boxer") || n.includes("brief")) {
    return underwearBawahanFields;
  }

  // Anak & Bayi
  if (category.includes("Anak & Bayi") || n.includes("anak") || n.includes("bayi")) {
    if (n.includes("celana") || n.includes("rok")) return anakBawahanFields;
    if (n.includes("setelan") || n.includes("piyama")) return anakSetelanFields;
    if (
      n.includes("dress") ||
      n.includes("romper") ||
      n.includes("jumpsuit") ||
      n.includes("bayi")
    ) {
      return anakDressFields;
    }
    return anakAtasanFields;
  }

  // Jumpsuit & Kostum & Khusus
  if (
    n.includes("jumpsuit") ||
    n.includes("romper") ||
    n.includes("overall") ||
    n.includes("wearpack") ||
    n.includes("coverall")
  ) {
    return jumpsuitFields;
  }
  if (n.includes("maternity") || n.includes("nursing")) return dressFields;

  // Kebaya & Tradisional
  if (
    n.includes("kebaya") ||
    n.includes("beskap") ||
    n.includes("surjan") ||
    n.includes("bodo") ||
    n.includes("kurung")
  ) {
    return kebayaFields;
  }

  // Dress & Gaun & Muslim
  if (
    n.includes("dress") ||
    n.includes("gown") ||
    n.includes("gamis") ||
    n.includes("abaya") ||
    n.includes("kaftan") ||
    n.includes("jubah") ||
    n.includes("daster") ||
    n.includes("nightgown") ||
    n.includes("lingerie") ||
    n.includes("bathrobe") ||
    n.includes("baju lamaran") ||
    n.includes("baju akad")
  ) {
    return dressFields;
  }

  // Setelan & Suit & Workwear
  if (
    n.includes("setelan") ||
    n.includes("suit") ||
    n.includes("tuxedo") ||
    n.includes("tracksuit") ||
    n.includes("two-piece") ||
    n.includes("three-piece") ||
    n.includes("seragam")
  ) {
    if (n.includes("work shirt")) return atasanFields;
    if (n.includes("work pants")) return celanaPanjangFields;
    return setelanFields;
  }

  // Bawahan
  if (n.includes("rok")) return rokFields;
  if (n.includes("celana pendek") || n.includes("shorts")) return celanaPendekFields;
  if (n.includes("celana") || n.includes("legging")) return celanaPanjangFields;

  // Outer / Jas / Blazer
  if (
    n.includes("jas") ||
    n.includes("blazer") ||
    n.includes("jaket") ||
    n.includes("jacket") ||
    n.includes("outer") ||
    n.includes("sweater") ||
    n.includes("hoodie") ||
    n.includes("cardigan")
  ) {
    return outerFields;
  }

  // Atasan tanpa lengan
  if (
    n.includes("tank top") ||
    n.includes("crop top") ||
    n.includes("vest") ||
    n.includes("rompi") ||
    n.includes("camisole")
  ) {
    return atasanTanpaLenganFields;
  }

  // Default atasan
  return atasanFields;
}

async function main() {
  // 1. Seed or update initial operator user with hashed credentials
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "operator@jahitflow.com";
  const rawAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || "OperatorPass123!";
  const passwordHash = await bcrypt.hash(rawAdminPassword, 12);

  const existingOperator = await prisma.user.findFirst({
    where: { role: "owner" }
  });

  if (!existingOperator) {
    await prisma.user.create({
      data: {
        name: "Operator",
        email: adminEmail,
        passwordHash,
        role: "owner",
        isActive: true,
      },
    });
    console.log(`Seeded initial operator user (${adminEmail}).`);
  } else {
    await prisma.user.update({
      where: { id: existingOperator.id },
      data: {
        email: existingOperator.email ?? adminEmail,
        passwordHash: existingOperator.passwordHash ?? passwordHash,
      },
    });
    console.log(`Updated operator user with credentials (${existingOperator.email ?? adminEmail}).`);
  }

  // 2. Seed garment types
  const initialGarmentCount = await prisma.garmentType.count();
  const result = await prisma.garmentType.createMany({
    data: GARMENT_TYPES,
    skipDuplicates: true,
  });
  const totalGarmentCount = await prisma.garmentType.count();

  console.log(
    `Garment types seed completed: inserted ${result.count} new types. Total in database: ${totalGarmentCount} (was ${initialGarmentCount}).`
  );

  // 3. Seed garment measurement fields
  const allGarmentTypes = await prisma.garmentType.findMany({
    select: { id: true, name: true, description: true },
  });

  const fieldsToInsert: Array<{
    garmentTypeId: string;
    fieldKey: string;
    label: string;
    unit: string;
    isRequired: boolean;
    sortOrder: number;
  }> = [];

  for (const gt of allGarmentTypes) {
    const fields = getMeasurementFieldsForGarment(gt.name, gt.description || "");
    for (const f of fields) {
      fieldsToInsert.push({
        garmentTypeId: gt.id,
        fieldKey: f.fieldKey,
        label: f.label,
        unit: f.unit,
        isRequired: f.isRequired,
        sortOrder: f.sortOrder,
      });
    }
  }

  const initialFieldCount = await prisma.garmentMeasurementField.count();
  const fieldsResult = await prisma.garmentMeasurementField.createMany({
    data: fieldsToInsert,
    skipDuplicates: true,
  });
  const totalFieldCount = await prisma.garmentMeasurementField.count();

  console.log(
    `Measurement fields seed completed: inserted ${fieldsResult.count} new fields. Total in database: ${totalFieldCount} (was ${initialFieldCount}).`
  );
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
