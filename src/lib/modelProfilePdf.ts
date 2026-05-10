import jsPDF from "jspdf";
import { format } from "date-fns";
import logoUrl from "@/assets/logo.png";

export interface ModelProfileData {
  name?: string | null;
  age?: string | null;
  city?: string | null;
  place_of_birth?: string | null;
  favorite_color?: string | null;
  favorite_movie?: string | null;
  favorite_food?: string | null;
  favorite_music?: string | null;
  occupation?: string | null;
  hobbies?: string | null;
  dream?: string | null;
  work?: string | null;
  education?: string | null;
  languages?: string | null;
  special_marks?: string | null;
  natural_hair?: string | null;
  shoe_size?: string | null;
  bra_size?: string | null;
  height?: string | null;
  weight?: string | null;
  content_preferences?: string | null;
  no_gos?: string | null;
  additional_info?: string | null;
}

type Lang = "de" | "en";

const LABELS: Record<Lang, Record<string, string>> = {
  de: {
    title: "Model Steckbrief",
    subtitle: "Profilübersicht",
    section_personal: "Persönliche Informationen",
    section_content: "Content-Informationen",
    section_nogo: "No-Gos",
    section_additional: "Zusätzliche Informationen",
    name: "Name", age: "Alter & Geburtstag", city: "Stadt", place_of_birth: "Geburtsort",
    favorite_color: "Lieblingsfarbe", favorite_movie: "Lieblingsfilm", favorite_food: "Lieblingsessen",
    favorite_music: "Lieblingsmusik", occupation: "Beruf", hobbies: "Hobbys", dream: "Traum",
    work: "Arbeit", education: "Bildung", languages: "Sprachen", special_marks: "Besondere Merkmale",
    natural_hair: "Natürliche Haarfarbe", shoe_size: "Schuhgröße", bra_size: "BH-Größe",
    height: "Größe", weight: "Gewicht",
    content_preferences: "Welchen Content möchtest du erstellen?",
    no_gos: "Dinge, die du nicht vor der Kamera tun möchtest",
    additional_info: "Was ist dir wichtig, worauf sollen wir achten?",
    empty: "(keine Angabe)",
    generated: "Erstellt am",
  },
  en: {
    title: "Model Profile",
    subtitle: "Biography Overview",
    section_personal: "Personal Information",
    section_content: "Content Information",
    section_nogo: "No-Gos",
    section_additional: "Additional Information",
    name: "Name", age: "Age & Birthday", city: "City", place_of_birth: "Place of birth",
    favorite_color: "Favorite color", favorite_movie: "Favorite movie", favorite_food: "Favorite food",
    favorite_music: "Favorite music", occupation: "Occupation", hobbies: "Hobbies", dream: "Dream",
    work: "Work", education: "Education", languages: "Languages", special_marks: "Special marks",
    natural_hair: "Natural hair", shoe_size: "Shoe size", bra_size: "Bra size",
    height: "Height", weight: "Weight",
    content_preferences: "What content do you prefer doing?",
    no_gos: "Things you don't want to do on camera",
    additional_info: "What is important for you, what should we take care of?",
    empty: "(not provided)",
    generated: "Generated on",
  },
};

const PERSONAL_KEYS: (keyof ModelProfileData)[] = [
  "name","age","city","place_of_birth","favorite_color","favorite_movie","favorite_food",
  "favorite_music","occupation","hobbies","dream","work","education","languages",
  "special_marks","natural_hair","shoe_size","bra_size","height","weight",
];

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadModelProfilePdf(
  profile: ModelProfileData,
  modelName: string,
  lang: Lang,
) {
  const t = LABELS[lang];
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  // Theme colors (premium black & gold)
  const gold: [number, number, number] = [212, 175, 55];
  const dark: [number, number, number] = [15, 15, 15];
  const muted: [number, number, number] = [110, 110, 110];

  // ── Header band (black with gold accent) ──
  doc.setFillColor(...dark);
  doc.rect(0, 0, pageWidth, 110, "F");
  doc.setFillColor(...gold);
  doc.rect(0, 110, pageWidth, 3, "F");

  // Logo
  const logoData = await loadLogoDataUrl();
  if (logoData) {
    try { doc.addImage(logoData, "PNG", margin, 28, 54, 54); } catch { /* ignore */ }
  }

  // Title
  doc.setTextColor(...gold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(t.title, margin + 70, 55);

  doc.setTextColor(220, 220, 220);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(modelName || "—", margin + 70, 75);
  doc.setFontSize(9);
  doc.setTextColor(170, 170, 170);
  doc.text(`${t.subtitle} · ${t.generated} ${format(new Date(), "dd.MM.yyyy")}`, margin + 70, 90);

  // ── Body ──
  let y = 145;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }
  };

  const drawSectionHeader = (title: string) => {
    ensureSpace(40);
    doc.setFillColor(245, 240, 220);
    doc.rect(margin, y, contentWidth, 22, "F");
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 22, margin + contentWidth, y + 22);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), margin + 8, y + 15);
    y += 32;
  };

  const drawRow = (label: string, value: string) => {
    const labelWidth = 160;
    const valueWidth = contentWidth - labelWidth - 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(value || t.empty, valueWidth) as string[];
    const rowHeight = Math.max(18, lines.length * 12 + 6);
    ensureSpace(rowHeight + 4);

    doc.setTextColor(...muted);
    doc.text(label, margin + 4, y + 12);

    doc.setTextColor(...dark);
    doc.text(lines, margin + labelWidth, y + 12);

    doc.setDrawColor(230, 225, 210);
    doc.setLineWidth(0.3);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
    y += rowHeight;
  };

  const drawTextBlock = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...muted);
    ensureSpace(20);
    doc.text(label, margin + 4, y + 10);
    y += 16;

    doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(value || t.empty, contentWidth - 8) as string[];
    const blockHeight = lines.length * 12 + 12;
    ensureSpace(blockHeight);
    doc.setFillColor(250, 248, 240);
    doc.rect(margin, y, contentWidth, blockHeight, "F");
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin, y + blockHeight); // gold left bar
    doc.text(lines, margin + 8, y + 14);
    y += blockHeight + 10;
  };

  // Personal
  drawSectionHeader(t.section_personal);
  for (const key of PERSONAL_KEYS) {
    drawRow(t[key as string] || (key as string), (profile[key] as string) || "");
  }
  y += 8;

  // Content
  drawSectionHeader(t.section_content);
  drawTextBlock(t.content_preferences, profile.content_preferences || "");

  // No-Gos
  drawSectionHeader(t.section_nogo);
  drawTextBlock(t.no_gos, profile.no_gos || "");

  // Additional
  drawSectionHeader(t.section_additional);
  drawTextBlock(t.additional_info, profile.additional_info || "");

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(
      `${modelName || "Model"} · ${t.title} · ${i}/${pageCount}`,
      pageWidth / 2,
      pageHeight - 20,
      { align: "center" },
    );
  }

  const safeName = (modelName || "model").replace(/[^a-z0-9_-]+/gi, "_");
  doc.save(`steckbrief_${safeName}_${lang}.pdf`);
}
