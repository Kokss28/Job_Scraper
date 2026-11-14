import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DegreeReportData } from "./degree-matching";

export function generateDirectDegreePdf(data: DegreeReportData, selectedCategory?: string | null) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 12; // 12 mm margin for wider, professional printable area
  const contentWidth = pageWidth - margin * 2; // 186 mm
  let currentY = 10;

  // Primary Colors (RGB Tuple)
  const primaryIndigo: [number, number, number] = [79, 70, 229]; // #4F46E5
  const darkSlate: [number, number, number] = [15, 23, 42]; // #0F172A
  const slateText: [number, number, number] = [51, 65, 85]; // #334155
  const mutedSlate: [number, number, number] = [100, 116, 139]; // #64748B
  const emeraldGreen: [number, number, number] = [16, 185, 129]; // #10B981
  const tealGreen: [number, number, number] = [13, 148, 136]; // #0D9488
  const bgLight: [number, number, number] = [248, 250, 252]; // #F8FAFC
  const borderLight: [number, number, number] = [226, 232, 240]; // #E2E8F0
  const indigoTint: [number, number, number] = [238, 242, 255]; // #EEF2FF
  const tealTint: [number, number, number] = [240, 253, 250]; // #F0FDFA

  // =========================================================================
  // PAGE 1: COMPLETE EXECUTIVE DOSSIER, CHARTS & BOTH TRACK 1 + TRACK 2 PATHWAYS
  // =========================================================================

  // 1. Top Header Banner (Height: 20 mm, Y: 10 -> 30) - Clean professional gap
  doc.setFillColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("TalentPulse • Academic Career & Curriculum Dossier", margin + 6, currentY + 7.5);

  doc.setFontSize(8.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(224, 231, 255);
  doc.text("Verified Market Feasibility, In-Demand Skills & Course Curriculum Guide", margin + 6, currentY + 14);

  // Exact Date Range Computation (No "X Days Filtered"!)
  let dateRangeText = "All Extraction Dates";
  if (data.selectedDates && data.selectedDates.length > 0) {
    const sorted = [...data.selectedDates].sort();
    const startD = new Date(sorted[0] + "T00:00:00");
    const endD = new Date(sorted[sorted.length - 1] + "T00:00:00");
    if (sorted.length === 1 || sorted[0] === sorted[sorted.length - 1]) {
      dateRangeText = startD.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } else {
      const startStr = startD.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const endStr = endD.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      dateRangeText = `${startStr} - ${endStr}`;
    }
  } else if (data.selectedDate) {
    dateRangeText = data.selectedDate;
  }

  const degreeShort = data.degreeLabel.split("(")[0].trim();
  const currentDateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  // Symmetrical Right-Aligned Header Metadata
  doc.setFontSize(8.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`Degree: ${degreeShort}`, pageWidth - margin - 6, currentY + 7.5, { align: "right" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(224, 231, 255);
  doc.text(`Extraction: ${dateRangeText}   |   Generated: ${currentDateStr}`, pageWidth - margin - 6, currentY + 14, { align: "right" });

  currentY += 24; // Move to Y = 34

  // 2. 4 Executive KPI Metric Cards (Height: 17 mm, Y: 34 -> 51)
  const cardWidth = (contentWidth - 9) / 4; // 44.25 mm
  const cardHeight = 17;

  const kpis = [
    {
      title: "ELIGIBLE OPENINGS",
      value: `${data.eligibleJobsCount.toLocaleString()}`,
      sub: `${data.eligibilityRate}% of total market`,
      color: primaryIndigo,
    },
    {
      title: "FRESHER ACCESSIBLE",
      value: `${data.fresherJobsCount.toLocaleString()}`,
      sub: `${data.fresherRate}% accessible (0-1y)`,
      color: emeraldGreen,
    },
    {
      title: "TOP HIRING DOMAIN",
      value: data.topCategories[0]?.category.split("&")[0].trim() || "Data Analytics",
      sub: `${data.topCategories[0]?.percentage || 0}% of all vacancies`,
      color: [217, 119, 6] as [number, number, number], // Amber
    },
    {
      title: "CORE #1 SKILL",
      value: data.topSkills[0]?.name || "SQL",
      sub: `Demanded in ${data.topSkills[0]?.percentage || 0}% jobs`,
      color: [147, 51, 234] as [number, number, number], // Violet
    },
  ];

  kpis.forEach((kpi, index) => {
    const x = margin + index * (cardWidth + 3);
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.8, 1.8, "FD");

    // Title
    doc.setFontSize(6.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
    doc.text(kpi.title, x + 3.5, currentY + 4.2);

    // Value
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x + 3.5, currentY + 10.5);

    // Subtitle
    doc.setFontSize(6.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
    doc.text(kpi.sub, x + 3.5, currentY + 14.5);
  });

  currentY += cardHeight + 4; // Move to Y = 55

  // 3. Two-Column Middle Section: Categories (Left) vs Skills (Right) (Height: 46 mm, Y: 55 -> 101)
  const colWidth = (contentWidth - 4) / 2; // 91 mm
  const colHeight = 46;

  // Left Card: Categories Distribution
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(margin, currentY, colWidth, colHeight, 1.8, 1.8, "FD");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(`Available Job Categories (${data.degree.toUpperCase()})`, margin + 4, currentY + 5.5);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("Share of verified openings across technical fields", margin + 4, currentY + 9.5);

  // Render Category Bars (Top 5)
  let catY = currentY + 15.2;
  data.topCategories.slice(0, 5).forEach((cat) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(cat.category, margin + 4, catY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
    doc.text(`${cat.count} jobs (${cat.percentage}%)`, margin + colWidth - 4, catY, { align: "right" });

    // Background Bar
    doc.setFillColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(margin + 4, catY + 1.2, colWidth - 8, 1.8, 0.8, 0.8, "F");

    // Filled Bar
    doc.setFillColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
    const fillW = Math.max(3, ((colWidth - 8) * cat.percentage) / 100);
    doc.roundedRect(margin + 4, catY + 1.2, fillW, 1.8, 0.8, 0.8, "F");

    catY += 6.0;
  });

  // Right Card: Top Skills Ranking
  const rightX = margin + colWidth + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(rightX, currentY, colWidth, colHeight, 1.8, 1.8, "FD");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text("Top In-Demand Skills to Learn", rightX + 4, currentY + 5.5);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("Pure technical skills demanded across live postings", rightX + 4, currentY + 9.5);

  // Render Skill Bars (Top 6)
  let skillY = currentY + 14.8;
  data.topSkills.slice(0, 6).forEach((skill, idx) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(`#${idx + 1}  ${skill.name}`, rightX + 4, skillY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
    doc.text(`${skill.percentage}% frequency`, rightX + colWidth - 4, skillY, { align: "right" });

    // Background Bar
    doc.setFillColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(rightX + 4, skillY + 1.2, colWidth - 8, 1.6, 0.8, 0.8, "F");

    // Filled Bar
    doc.setFillColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
    const fillW = Math.max(3, ((colWidth - 8) * skill.percentage) / 100);
    doc.roundedRect(rightX + 4, skillY + 1.2, fillW, 1.6, 0.8, 0.8, "F");

    skillY += 5.1;
  });

  currentY += colHeight + 4; // Move to Y = 105

  // Determine Active Track 1 Course based on selection or highest market share
  const activeCode = (selectedCategory || data.topCategories[0]?.code || "DA").toUpperCase();
  const track1Course =
    data.courseCurriculums.find((c) => c.code.toUpperCase() === activeCode) ||
    data.courseCurriculums[0];

  // Determine Dynamic Track 2 (Second Option: Next Highest Category)
  const otherCats = data.topCategories.filter(
    (c) => c.code.toUpperCase() !== activeCode && c.code !== "Other"
  );
  const nextHighestCat = otherCats[0] || data.topCategories[1] || data.topCategories[0];
  const track2Course =
    data.courseCurriculums.find((c) => c.code.toUpperCase() === nextHighestCat?.code.toUpperCase()) ||
    data.courseCurriculums[1] ||
    data.courseCurriculums[0];

  const primaryCategory = data.topCategories.find((c) => c.code.toUpperCase() === track1Course.code.toUpperCase());
  const track1Share = primaryCategory ? primaryCategory.percentage : (data.topCategories[0]?.percentage || 39);
  const track2Share = nextHighestCat ? nextHighestCat.percentage : 19;

  // 4. Track 1 Card (Page 1) - TIGHTENED HEIGHT (64 mm instead of 88 mm, NO GAP INSIDE!)
  const trackCardHeight = 64;
  const modColWidth = (contentWidth - 12) / 2; // 87 mm
  const modColLeft = margin + 4;
  const modColRight = margin + 4 + modColWidth + 4; // margin + 95

  if (track1Course) {
    // Outer Container
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.setDrawColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
    doc.roundedRect(margin, currentY, contentWidth, trackCardHeight, 2, 2, "FD");

    // Header Strip (Height: 7.5 mm)
    doc.setFillColor(indigoTint[0], indigoTint[1], indigoTint[2]);
    doc.roundedRect(margin + 0.5, currentY + 0.5, contentWidth - 1, 7.5, 1.5, 1.5, "F");

    doc.setFontSize(8.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
    doc.text(`Track 1: Primary High-Demand Path — ${track1Course.title}`, margin + 4, currentY + 5.2);

    doc.setFontSize(7.2);
    doc.setFont("helvetica", "bold");
    doc.text(
      `${track1Share}% Market Share • Primary Career Path`,
      pageWidth - margin - 4,
      currentY + 5.2,
      { align: "right" }
    );

    // Overview Description
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    const track1OverviewLines = doc.splitTextToSize(track1Course.overview, contentWidth - 8);
    doc.text(track1OverviewLines, margin + 4, currentY + 11.5);

    // 4 Modules in Tight 2x2 Grid (Tight, balanced gaps!)
    const row1Y = currentY + 19.5;
    const row2Y = currentY + 34;

    track1Course.modules.slice(0, 4).forEach((mod, idx) => {
      const isRightCol = idx % 2 === 1;
      const isSecondRow = idx >= 2;
      const mx = isRightCol ? modColRight : modColLeft;
      const my = isSecondRow ? row2Y : row1Y;

      // Module Heading with clean bullet
      doc.setFontSize(7.4);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      const modTitleLines = doc.splitTextToSize(`• ${mod.moduleName}`, modColWidth);
      doc.text(modTitleLines, mx, my);

      // Topics text with clean line wrapping
      doc.setFontSize(6.4);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
      const topicText = mod.topics.join(", ");
      const wrappedTopics = doc.splitTextToSize(topicText, modColWidth - 2);
      doc.text(wrappedTopics.slice(0, 2), mx + 2, my + 4);
    });

    // Row 3: Industry Capstone Project Focus (Eliminates dead space!)
    if (track1Course.capstoneProject) {
      const capY = currentY + 49;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.roundedRect(margin + 3, capY, contentWidth - 6, 12, 1.2, 1.2, "FD");

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
      doc.text(`🏆 Production Capstone: ${track1Course.capstoneProject.title}`, margin + 5, capY + 4.2);

      doc.setFontSize(6.2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      const capDesc = `${track1Course.capstoneProject.description}  |  Tools: ${track1Course.capstoneProject.tools.join(", ")}`;
      doc.text(doc.splitTextToSize(capDesc, contentWidth - 14).slice(0, 1), margin + 5, capY + 8.5);
    }
  }

  currentY += trackCardHeight + 4; // Move to Y = 173

  // 5. Track 2: Alternative High-Demand Path (Height: 64 mm, Y: 173 -> 237)
  if (track2Course) {
    // Outer Container with Teal Accent
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.setDrawColor(tealGreen[0], tealGreen[1], tealGreen[2]);
    doc.roundedRect(margin, currentY, contentWidth, trackCardHeight, 2, 2, "FD");

    // Header Strip (Height: 7.5 mm)
    doc.setFillColor(tealTint[0], tealTint[1], tealTint[2]);
    doc.roundedRect(margin + 0.5, currentY + 0.5, contentWidth - 1, 7.5, 1.5, 1.5, "F");

    doc.setFontSize(8.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(tealGreen[0], tealGreen[1], tealGreen[2]);
    doc.text(`Track 2: Alternative High-Demand Path — ${track2Course.title}`, margin + 4, currentY + 5.2);

    doc.setFontSize(7.2);
    doc.setFont("helvetica", "bold");
    doc.text(
      `${track2Share}% Market Share • In-Demand Specialization`,
      pageWidth - margin - 4,
      currentY + 5.2,
      { align: "right" }
    );

    // Overview Description
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    const track2OverviewLines = doc.splitTextToSize(track2Course.overview, contentWidth - 8);
    doc.text(track2OverviewLines, margin + 4, currentY + 11.5);

    // 4 Modules in Tight 2x2 Grid
    const t2Row1Y = currentY + 19.5;
    const t2Row2Y = currentY + 34;

    track2Course.modules.slice(0, 4).forEach((mod, idx) => {
      const isRightCol = idx % 2 === 1;
      const isSecondRow = idx >= 2;
      const mx = isRightCol ? modColRight : modColLeft;
      const my = isSecondRow ? t2Row2Y : t2Row1Y;

      doc.setFontSize(7.4);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      const modTitleLines = doc.splitTextToSize(`• ${mod.moduleName}`, modColWidth);
      doc.text(modTitleLines, mx, my);

      doc.setFontSize(6.4);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
      const topicText = mod.topics.join(", ");
      const wrappedTopics = doc.splitTextToSize(topicText, modColWidth - 2);
      doc.text(wrappedTopics.slice(0, 2), mx + 2, my + 4);
    });

    // Row 3: Industry Capstone Project Focus
    if (track2Course.capstoneProject) {
      const capY = currentY + 49;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.roundedRect(margin + 3, capY, contentWidth - 6, 12, 1.2, 1.2, "FD");

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(tealGreen[0], tealGreen[1], tealGreen[2]);
      doc.text(`🏆 Production Capstone: ${track2Course.capstoneProject.title}`, margin + 5, capY + 4.2);

      doc.setFontSize(6.2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      const capDesc = `${track2Course.capstoneProject.description}  |  Tools: ${track2Course.capstoneProject.tools.join(", ")}`;
      doc.text(doc.splitTextToSize(capDesc, contentWidth - 14).slice(0, 1), margin + 5, capY + 8.5);
    }
  }

  currentY += trackCardHeight + 4; // Move to Y = 241

  // 6. Academic Syllabus Alignment & Integration Strategy Card (Height: 38 mm, Y: 241 -> 279)
  const alignHeight = 38;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(margin, currentY, contentWidth, alignHeight, 2, 2, "FD");

  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(margin + 0.5, currentY + 0.5, contentWidth - 1, 6.5, 1.5, 1.5, "F");

  doc.setFontSize(7.6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text("Academic Syllabus Modernization & Degree Alignment Strategy", margin + 4, currentY + 4.8);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.text("Faculty & Institutional Advisory", pageWidth - margin - 4, currentY + 4.8, { align: "right" });

  const panel3Width = (contentWidth - 12) / 3;
  const p1X = margin + 3;
  const p2X = margin + 3 + panel3Width + 3;
  const p3X = margin + 3 + (panel3Width + 3) * 2;
  const topTextY = currentY + 11.5;

  // Panel 1: Prerequisite Readiness
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.text("1. Prerequisite Readiness", p1X, topTextY);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const p1Lines = doc.splitTextToSize(
    `Strong logical problem solving, basic object-oriented programming concepts, and foundational relational database operations.`,
    panel3Width
  );
  doc.text(p1Lines, p1X, topTextY + 4);

  // Panel 2: Curriculum Integration
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.text("2. Dual Track Delivery", p2X, topTextY);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const p2Lines = doc.splitTextToSize(
    `Integrate Track 1 (${track1Course.title.split("&")[0].trim()}) for core lab practicals, with Track 2 recommended for final year specialized electives.`,
    panel3Width
  );
  doc.text(p2Lines, p2X, topTextY + 4);

  // Panel 3: Industry Tooling
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.text("3. High-Frequency Stack", p3X, topTextY);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const p3Lines = doc.splitTextToSize(
    `Replace outdated syllabus tools with #1 ${data.topSkills[0]?.name || "Python"} and #2 ${data.topSkills[1]?.name || "SQL"} to match active hiring pipelines.`,
    panel3Width
  );
  doc.text(p3Lines, p3X, topTextY + 4);

  // Footer for Page 1 (At Y = 289 mm)
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("TalentPulse Job Intelligence Platform  •  Page 1 of 2", pageWidth / 2, pageHeight - 8, { align: "center" });

  // =========================================================================
  // PAGE 2: VERIFIED LIVE JOB DIRECTORY & THOORIGAI INFOTECH ADVISORY
  // =========================================================================
  doc.addPage();
  currentY = 10;

  // 1. Header Banner for Page 2 (NO "Page 2 of 2" in the header banner!)
  doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.roundedRect(margin, currentY, contentWidth, 16, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TalentPulse • Verified Live Job Market Directory", margin + 6, currentY + 7);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Direct live hiring opportunities for ${degreeShort} candidates extracted from active corporate career pipelines`,
    margin + 6,
    currentY + 12
  );

  // Right Metadata: Clean title WITHOUT "Page 2 of 2"
  doc.setFontSize(7.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Live Verified Directory", pageWidth - margin - 6, currentY + 9.5, { align: "right" });

  // COMFORTABLE GAP = 6 mm on Page 2!
  currentY += 22; // Move to Y = 32

  // 2. Market Intelligence Summary Strip (Height: 15 mm, Y: 32 -> 47)
  const filterCatCode = (selectedCategory || activeCode).toUpperCase();
  const matchedCatName =
    data.topCategories.find((c) => c.code.toUpperCase() === filterCatCode)?.category || filterCatCode;

  const topHubs = data.topCities && data.topCities.length > 0
    ? data.topCities.slice(0, 3).map((c) => c.city).join(", ")
    : "Bengaluru, Hyderabad, Pune";

  const stripCards = [
    {
      label: "TARGET DOMAIN",
      value: matchedCatName.split("&")[0].trim(),
      sub: "Active Specialization",
      color: primaryIndigo,
    },
    {
      label: "TOP TECH HUBS",
      value: topHubs,
      sub: "High Volume Hubs",
      color: [2, 132, 199] as [number, number, number], // Sky
    },
    {
      label: "EXPERIENCE TIER",
      value: "Fresher & Junior (0-2y)",
      sub: `${data.fresherRate}% Accessible`,
      color: emeraldGreen,
    },
    {
      label: "DATA INTEGRITY",
      value: "100% Industry Verified",
      sub: "Deduplicated Postings",
      color: [147, 51, 234] as [number, number, number], // Violet
    },
  ];

  stripCards.forEach((c, idx) => {
    const cx = margin + idx * (cardWidth + 3);
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(cx, currentY, cardWidth, 15, 1.8, 1.8, "FD");

    doc.setFontSize(5.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
    doc.text(c.label, cx + 3, currentY + 3.8);

    doc.setFontSize(7.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(doc.splitTextToSize(c.value, cardWidth - 6)[0] || c.value, cx + 3, currentY + 8.2);

    doc.setFontSize(5.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
    doc.text(c.sub, cx + 3, currentY + 12);
  });

  // COMFORTABLE GAP = 6 mm!
  currentY += 21; // Move to Y = 53

  // 3. Section Title for Verified Openings Directory
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(`Verified Live Job Openings: ${matchedCatName} (${data.degree.toUpperCase()})`, margin, currentY);

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("Direct verified openings from LinkedIn, Naukri, and Indeed welcoming this qualification", margin, currentY + 4);

  // GAP = 4 mm!
  currentY += 7.5; // Move to Y = 60.5

  // 4. Curated Verified Jobs Table (Show 12 jobs for comfortable vertical breathing room)
  const filteredJobs = data.sampleJobs.filter(
    (j) => j.category_code && j.category_code.toUpperCase() === filterCatCode
  );
  let jobsPool = filteredJobs;
  if (jobsPool.length < 12) {
    const remaining = data.sampleJobs.filter(
      (j) => !jobsPool.some((existing) => existing.job_id === j.job_id)
    );
    jobsPool = [...jobsPool, ...remaining];
  }
  const jobsToDisplay = jobsPool.slice(0, 12);

  const tableRows = jobsToDisplay.map((job) => [
    job.title,
    job.company,
    job.city,
    job.min_exp_years === 0 ? "Fresher (0y)" : `${job.min_exp_years}-${job.max_exp_years} yrs`,
    job.skills.slice(0, 4).join(", "),
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Role Title", "Company", "Location", "Experience", "Key Demanded Skills"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: primaryIndigo,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 2.2,
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: darkSlate,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: "bold" },
      1: { cellWidth: 36 },
      2: { cellWidth: 26 },
      3: { cellWidth: 24 }, // 24mm width so 'Fresher (0y)' fits cleanly on a single line!
      4: { cellWidth: "auto" },
    },
  });

  // Calculate position right below the table with generous 8 mm gap
  // @ts-ignore
  const finalTableY = (doc as any).lastAutoTable?.finalY || currentY + 80;
  const advisoryY = Math.max(finalTableY + 8, 156);
  const advisoryHeight = Math.min(pageHeight - 14 - advisoryY, 120);

  // 5. THOORIGAI INFOTECH • Official Academic-to-Industry Career & Placement Hub
  if (advisoryHeight > 40) {
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.setDrawColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
    doc.roundedRect(margin, advisoryY, contentWidth, advisoryHeight, 2, 2, "FD");

    // Header Strip (Height: 7.5 mm)
    doc.setFillColor(indigoTint[0], indigoTint[1], indigoTint[2]);
    doc.roundedRect(margin + 0.5, advisoryY + 0.5, contentWidth - 1, 7.5, 1.5, 1.5, "F");

    doc.setFontSize(8.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
    doc.text("ThoorigAI Infotech • Academic-to-Industry Career Accelerator & Placement Hub", margin + 4, advisoryY + 5.2);

    doc.setFontSize(6.8);
    doc.setFont("helvetica", "bold");
    doc.text("Authorized Training Partner • www.thoorigaiinfotech.com", pageWidth - margin - 4, advisoryY + 5.2, { align: "right" });

    // 2 Balanced Panels: Left (ThoorigAI Programs) & Right (Internships & Placements)
    const panelWidth = (contentWidth - 12) / 2; // 87 mm
    const leftPx = margin + 4;
    const rightPx = margin + 4 + panelWidth + 4;
    const contentTopY = advisoryY + 12;

    // Left Panel: ThoorigAI Training Curriculums
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text("Industry-Accredited Career Programs (ThoorigAI Infotech)", leftPx, contentTopY);

    doc.setFontSize(6.3);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);

    const leftB1 = doc.splitTextToSize(
      "• Python Full Stack Developer: Comprehensive mastering of Python, Django REST Framework, React.js, PostgreSQL database architecture, and microservice APIs.",
      panelWidth
    );
    doc.text(leftB1, leftPx, contentTopY + 4);

    const leftB2 = doc.splitTextToSize(
      "• MERN Stack Expert Developer: MongoDB, Express.js, React 19, and Node.js with real-time WebSocket state management and production JWT auth.",
      panelWidth
    );
    doc.text(leftB2, leftPx, contentTopY + 15);

    const leftB3 = doc.splitTextToSize(
      "• Data Science & AI Analytics: Advanced Python for data analysis, Machine Learning algorithms, Pandas data wrangling, and Power BI executive dashboards.",
      panelWidth
    );
    doc.text(leftB3, leftPx, contentTopY + 26);

    const leftB4 = doc.splitTextToSize(
      "• AI Tools & Workflow Automation: Prompt engineering and modern enterprise AI toolkits to drastically accelerate software delivery.",
      panelWidth
    );
    doc.text(leftB4, leftPx, contentTopY + 37);

    // Right Panel: Internships & Placement Assurance
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text("Hands-On Internships & 100% Placement Assurance", rightPx, contentTopY);

    doc.setFontSize(6.3);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);

    const rightB1 = doc.splitTextToSize(
      "• 2 to 12-Week Corporate Internships: Practical simulations with agile sprint cycles, real client problem statements, Git PR code reviews, and documentation.",
      panelWidth
    );
    doc.text(rightB1, rightPx, contentTopY + 4);

    const rightB2 = doc.splitTextToSize(
      "• Production GitHub Portfolio: Every graduate deploys 3+ live cloud-hosted applications on AWS/Docker ready for technical hiring manager evaluation.",
      panelWidth
    );
    doc.text(rightB2, rightPx, contentTopY + 15);

    const rightB3 = doc.splitTextToSize(
      "• Dedicated Placement Support: Career guidance, resume crafting, technical mock interviews, and direct referral access to active corporate hiring partners.",
      panelWidth
    );
    doc.text(rightB3, rightPx, contentTopY + 26);

    const rightB4 = doc.splitTextToSize(
      "• Global Industry Certification: Program completion credentials awarded directly by ThoorigAI Infotech, recognized across top Indian tech recruiters.",
      panelWidth
    );
    doc.text(rightB4, rightPx, contentTopY + 37);

    // Bottom Campus, Enrollment & Official Address Box (Two-column, clean text, perfectly aligned with no emojis)
    const boxY = advisoryY + advisoryHeight - 24;
    const boxHeight = 21;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(margin + 2.5, boxY, contentWidth - 5, boxHeight, 1.5, 1.5, "FD");

    // Subtle divider line down the middle
    const dividerX = margin + 2.5 + (contentWidth - 5) / 2;
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(dividerX, boxY + 2.5, dividerX, boxY + boxHeight - 2.5);

    // Left Column: Portal, Training Modes & Admissions Contact
    const leftBoxX = margin + 5.5;

    doc.setFontSize(6.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
    doc.text("Official Portal: https://www.thoorigaiinfotech.com", leftBoxX, boxY + 5.5);

    doc.setFontSize(6.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text("Training Modes: In-Person Classroom (Tuticorin) & Live Online", leftBoxX, boxY + 11);

    doc.setFontSize(6.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text("Admissions & Placements: +91 93841 34008  |  +91 93841 64008", leftBoxX, boxY + 16.5);

    // Right Column: Campus Hub / Physical Address & Academic Verification
    const rightBoxX = dividerX + 4;

    doc.setFontSize(6.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
    doc.text("Campus Hub / Corporate Office:", rightBoxX, boxY + 5.5);

    doc.setFontSize(6.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text("127, Ettayapuram Road, Melur, Thoothukudi - 628002, Tamil Nadu", rightBoxX, boxY + 11);

    doc.setFontSize(5.8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
    doc.text("Audited & Verified for University Degree Career Transition", rightBoxX, boxY + 16.5);
  }

  // Footer for Page 2
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("TalentPulse Job Intelligence Platform  •  Page 2 of 2", pageWidth / 2, pageHeight - 8, { align: "center" });

  // Download directly without print dialog
  const fileName = `${data.degree.toUpperCase()}_Career_Curriculum_Report.pdf`;
  doc.save(fileName);
}
