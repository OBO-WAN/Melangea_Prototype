#!/usr/bin/env python3
"""Generate the four branded musician biography PDFs used by the homepage."""

from __future__ import annotations

import html
import io
import re
import sys
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont, ImageOps
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
OBJECTS_PATH = ROOT / "JS" / "objects.js"

PAGE_W, PAGE_H = A4

COLORS = {
    "navy": HexColor("#1B376D"),
    "paper": HexColor("#F7F3EB"),
    "card": HexColor("#FBFAF7"),
    "text": HexColor("#1D2A45"),
    "muted": HexColor("#5F6F88"),
    "blue": HexColor("#2783CB"),
    "gold": HexColor("#E7D59A"),
    "line": HexColor("#CBD5E1"),
    "header_line": HexColor("#4A648F"),
}

MEMBER_META = {
    "Ulrike": {
        "portrait": "assets/IMG/portrait/uli.webp",
        "instruments": "Oboe · Blockflöte",
        "profile": "Klassik · Jazz · Chanson · Weltmusik",
        "role": "Oboe & Blockflöte",
    },
    "Uwe": {
        "portrait": "assets/IMG/portrait/Uwe.webp",
        "instruments": "Akkordeon · Gesang",
        "profile": "Jazz · Chanson · Folk · Filmmusik",
        "role": "Akkordeon, Arrangements & Vocals",
    },
    "Maye": {
        "portrait": "assets/IMG/portrait/Wolli.webp",
        "instruments": "Kontrabass",
        "profile": "Jazz · Klassik · Weltmusik · Improvisation",
        "role": "Kontrabass",
    },
    "Disch": {
        "portrait": "assets/IMG/portrait/wolfgang-disch.webp",
        "instruments": "Schlagzeug · Percussion",
        "profile": "Jazz · Pop · Live- & Studiomusik",
        "role": "Schlagzeug & Percussion",
    },
}

ITALIC_PHRASES = (
    "Mélange à Deux & Amis",
    "Gradus ad Parnassum",
    "Velvet Elevator",
    "Porgy & Bess",
    "FISFÜZ",
    "enjoy jazz",
    "Cordclub",
    "Bartok Kombinat",
)


def register_fonts() -> dict[str, str]:
    candidates = [
        Path("/usr/share/fonts/truetype/dejavu"),
        Path("/usr/share/fonts/dejavu"),
    ]
    files = {
        "regular": "DejaVuSans.ttf",
        "bold": "DejaVuSans-Bold.ttf",
        "italic": "DejaVuSans-Oblique.ttf",
        "bold_italic": "DejaVuSans-BoldOblique.ttf",
    }
    for directory in candidates:
        if all((directory / filename).is_file() for filename in files.values()):
            names = {
                "regular": "BioSans",
                "bold": "BioSans-Bold",
                "italic": "BioSans-Italic",
                "bold_italic": "BioSans-BoldItalic",
            }
            for key, name in names.items():
                pdfmetrics.registerFont(TTFont(name, str(directory / files[key])))
            pdfmetrics.registerFontFamily(
                "BioSans",
                normal=names["regular"],
                bold=names["bold"],
                italic=names["italic"],
                boldItalic=names["bold_italic"],
            )
            return names

    return {
        "regular": "Helvetica",
        "bold": "Helvetica-Bold",
        "italic": "Helvetica-Oblique",
        "bold_italic": "Helvetica-BoldOblique",
    }


FONTS = register_fonts()


def parse_biographies(source: str) -> list[dict[str, object]]:
    pattern = re.compile(
        r"(?P<key>Ulrike|Uwe|Maye|Disch)\s*:\s*\{\s*"
        r'name:\s*"(?P<name>[^"]+)",\s*'
        r'role:\s*"(?P<role>[^"]+)",\s*'
        r'pdf:\s*"(?P<pdf>[^"]+)",\s*'
        r"text:\s*`(?P<text>.*?)`\s*,\s*\}",
        re.S,
    )

    result: list[dict[str, object]] = []
    for match in pattern.finditer(source):
        key = match.group("key")
        raw_text = html.unescape(match.group("text")).replace("\u00a0", " ")
        raw_text = re.sub(r"</?p>", "", raw_text, flags=re.I)
        paragraphs = []
        for line in raw_text.splitlines():
            cleaned = re.sub(r"\s+", " ", line).strip()
            if cleaned:
                paragraphs.append(cleaned)

        meta = MEMBER_META[key]
        result.append(
            {
                "key": key,
                "name": match.group("name"),
                "role": meta.get("role") or match.group("role"),
                "pdf": match.group("pdf"),
                "paragraphs": paragraphs,
                **meta,
            }
        )

    if len(result) != 4:
        raise RuntimeError(f"Expected four biographies in {OBJECTS_PATH}, found {len(result)}")
    return result


def paragraph_markup(text: str) -> str:
    marked = html.escape(text, quote=False)
    for phrase in ITALIC_PHRASES:
        escaped = html.escape(phrase, quote=False)
        marked = marked.replace(escaped, f"<i>{escaped}</i>")
    return marked


def initials_placeholder(name: str, size: int = 800) -> Image.Image:
    image = Image.new("RGB", (size, size), "#DDE4EC")
    draw = ImageDraw.Draw(image)
    draw.ellipse(
        (size * 0.62, -size * 0.18, size * 1.18, size * 0.38),
        outline="#B9C7D8",
        width=max(4, size // 100),
    )
    draw.ellipse(
        (-size * 0.16, size * 0.68, size * 0.34, size * 1.18),
        outline="#B9C7D8",
        width=max(4, size // 100),
    )
    initials = "".join(part[0] for part in name.split()[:2]).upper()
    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            size // 4,
        )
    except OSError:
        font = ImageFont.load_default()
    box = draw.textbbox((0, 0), initials, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    draw.text(
        ((size - tw) / 2, (size - th) / 2 - size * 0.03),
        initials,
        font=font,
        fill="#1B376D",
    )
    return image


def portrait_reader(path: Path, name: str) -> ImageReader:
    if path.is_file():
        with Image.open(path) as source:
            source = source.convert("RGB")
            portrait = ImageOps.fit(
                source,
                (900, 900),
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.42),
            )
    else:
        portrait = initials_placeholder(name, 900)

    buffer = io.BytesIO()
    portrait.save(buffer, format="PNG", optimize=True)
    buffer.seek(0)
    return ImageReader(buffer)


def draw_letterspaced(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    font: str,
    size: float,
    spacing: float,
    color,
) -> None:
    c.saveState()
    c.setFillColor(color)
    c.setFont(font, size)
    text_obj = c.beginText(x, y)
    text_obj.setCharSpace(spacing)
    text_obj.textLine(text)
    c.drawText(text_obj)
    c.restoreState()


def draw_portrait(
    c: canvas.Canvas,
    reader: ImageReader,
    x: float,
    y: float,
    size: float,
) -> None:
    radius = 18
    c.saveState()
    clip = c.beginPath()
    clip.roundRect(x, y, size, size, radius)
    c.clipPath(clip, stroke=0, fill=0)
    c.drawImage(
        reader,
        x,
        y,
        width=size,
        height=size,
        preserveAspectRatio=True,
        mask="auto",
    )
    c.restoreState()

    c.saveState()
    c.setStrokeColor(COLORS["gold"])
    c.setLineWidth(1.6)
    c.roundRect(
        x - 5,
        y - 5,
        size + 10,
        size + 10,
        radius + 4,
        stroke=1,
        fill=0,
    )
    c.restoreState()


def fit_text_size(
    cells: Iterable[tuple[str, str]],
    widths: list[float],
    max_height: float,
) -> float:
    for size in (9.5, 9.2, 8.9, 8.6, 8.3):
        style = ParagraphStyle(
            "detail-value",
            fontName=FONTS["bold"],
            fontSize=size,
            leading=size * 1.25,
            textColor=COLORS["text"],
            alignment=TA_LEFT,
        )
        fits = True
        for (_, value), width in zip(cells, widths):
            _, height = Paragraph(html.escape(value), style).wrap(width - 28, max_height)
            if height > max_height:
                fits = False
                break
        if fits:
            return size
    return 8.0


def draw_details_card(c: canvas.Canvas, article: dict[str, object]) -> None:
    x, y, w, h = 50, 533, PAGE_W - 100, 66
    c.saveState()
    c.setFillColor(COLORS["card"])
    c.setStrokeColor(COLORS["line"])
    c.setLineWidth(1)
    c.roundRect(x, y, w, h, 14, stroke=1, fill=1)

    widths = [w * 0.30, w * 0.38, w * 0.32]
    boundaries = [x + widths[0], x + widths[0] + widths[1]]
    for boundary in boundaries:
        c.setStrokeColor(COLORS["line"])
        c.line(boundary, y, boundary, y + h)

    cells = [
        ("INSTRUMENTE", str(article["instruments"])),
        ("ENSEMBLE", "Mélange à Deux & Amis"),
        ("KÜNSTLERISCHES PROFIL", str(article["profile"])),
    ]
    value_size = fit_text_size(cells, widths, 28)
    label_style = ParagraphStyle(
        "detail-label",
        fontName=FONTS["regular"],
        fontSize=6.8,
        leading=8.2,
        textColor=COLORS["blue"],
        tracking=1.5,
    )
    value_style = ParagraphStyle(
        "detail-value",
        fontName=FONTS["bold"],
        fontSize=value_size,
        leading=value_size * 1.27,
        textColor=COLORS["text"],
    )

    cursor_x = x
    for (label, value), width in zip(cells, widths):
        label_p = Paragraph(label, label_style)
        value_p = Paragraph(html.escape(value), value_style)
        _, label_h = label_p.wrap(width - 28, 15)
        _, value_h = value_p.wrap(width - 28, 31)
        label_p.drawOn(c, cursor_x + 14, y + h - 17 - label_h)
        value_p.drawOn(c, cursor_x + 14, y + 13 + max(0, 20 - value_h))
        cursor_x += width
    c.restoreState()


def paragraph_style(font_size: float) -> ParagraphStyle:
    return ParagraphStyle(
        "bio-body",
        fontName=FONTS["regular"],
        fontSize=font_size,
        leading=font_size * 1.43,
        textColor=COLORS["text"],
        alignment=TA_LEFT,
        splitLongWords=True,
        allowWidows=0,
        allowOrphans=0,
    )


def measure_column(
    paragraphs: list[str],
    width: float,
    style: ParagraphStyle,
    gap: float,
) -> float:
    total = 0.0
    for index, text in enumerate(paragraphs):
        _, height = Paragraph(paragraph_markup(text), style).wrap(width, 1000)
        total += height
        if index < len(paragraphs) - 1:
            total += gap
    return total


def choose_body_layout(
    paragraphs: list[str],
    width: float,
    height: float,
) -> tuple[float, int]:
    if len(paragraphs) < 2:
        return 9.4, 1

    for size in (10.1, 9.9, 9.7, 9.5, 9.3, 9.1, 8.9, 8.7):
        style = paragraph_style(size)
        gap = size * 1.12
        candidates = []
        for split in range(1, len(paragraphs)):
            left_h = measure_column(paragraphs[:split], width, style, gap)
            right_h = measure_column(paragraphs[split:], width, style, gap)
            if left_h <= height and right_h <= height:
                candidates.append((abs(left_h - right_h), max(left_h, right_h), split))
        if candidates:
            candidates.sort()
            return size, candidates[0][2]

    return 8.5, max(1, len(paragraphs) // 2)


def draw_body(c: canvas.Canvas, paragraphs: list[str]) -> None:
    left_x = 50
    right_x = 315
    column_w = 230
    bottom = 92
    top = 510
    height = top - bottom

    font_size, split = choose_body_layout(paragraphs, column_w, height)
    style = paragraph_style(font_size)
    gap = font_size * 1.12

    c.saveState()
    c.setStrokeColor(COLORS["line"])
    c.setLineWidth(0.75)
    c.line(297.5, bottom, 297.5, top + 2)
    c.restoreState()

    columns = (
        (left_x, paragraphs[:split]),
        (right_x, paragraphs[split:]),
    )
    for x, column_paragraphs in columns:
        cursor_y = top
        for index, text in enumerate(column_paragraphs):
            paragraph = Paragraph(paragraph_markup(text), style)
            _, para_h = paragraph.wrap(column_w, height)
            cursor_y -= para_h
            paragraph.drawOn(c, x, cursor_y)
            if index < len(column_paragraphs) - 1:
                cursor_y -= gap


def draw_header(c: canvas.Canvas, article: dict[str, object]) -> None:
    header_h = 205
    c.saveState()
    c.setFillColor(COLORS["navy"])
    c.rect(0, PAGE_H - header_h, PAGE_W, header_h, stroke=0, fill=1)

    c.setStrokeColor(COLORS["header_line"])
    c.setLineWidth(1)
    c.circle(PAGE_W - 26, PAGE_H - 18, 62, stroke=1, fill=0)
    c.circle(45, PAGE_H - header_h + 5, 27, stroke=1, fill=0)

    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont(FONTS["bold"], 10.5)
    c.drawString(50, PAGE_H - 48, "Mélange à Deux & Amis")

    draw_letterspaced(
        c,
        "KÜNSTLERBIOGRAFIE",
        PAGE_W - 158,
        PAGE_H - 47,
        FONTS["bold"],
        6.7,
        1.65,
        COLORS["gold"],
    )

    name = str(article["name"])
    name_size = 27.0
    max_name_width = 330
    while (
        pdfmetrics.stringWidth(name, FONTS["bold"], name_size) > max_name_width
        and name_size > 20
    ):
        name_size -= 0.5
    c.setFont(FONTS["bold"], name_size)
    c.setFillColor(HexColor("#FFFFFF"))
    c.drawString(50, PAGE_H - 101, name)

    c.setFont(FONTS["regular"], 13.0)
    c.setFillColor(COLORS["gold"])
    c.drawString(50, PAGE_H - 130, str(article["role"]))

    portrait = portrait_reader(ROOT / str(article["portrait"]), name)
    draw_portrait(c, portrait, PAGE_W - 180, PAGE_H - 194, 122)
    c.restoreState()


def draw_footer(c: canvas.Canvas) -> None:
    c.saveState()
    c.setStrokeColor(COLORS["line"])
    c.setLineWidth(0.8)
    c.line(50, 52, PAGE_W - 50, 52)

    c.setFillColor(COLORS["navy"])
    c.setFont(FONTS["bold"], 7.6)
    c.drawString(50, 34, "Mélange à Deux & Amis")

    c.setFillColor(COLORS["muted"])
    c.setFont(FONTS["regular"], 7.2)
    c.drawString(50, 22, "melangea2.com · info@melangea2.com")
    c.restoreState()


def generate_pdf(article: dict[str, object]) -> Path:
    output = ROOT / str(article["pdf"])
    output.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
    c.setTitle(f"{article['name']} - Künstlerbiografie")
    c.setAuthor("Mélange à Deux & Amis")
    c.setSubject("Künstlerbiografie")
    c.setCreator("Mélange à Deux & Amis biography PDF generator")

    c.setFillColor(COLORS["paper"])
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    draw_header(c, article)
    draw_details_card(c, article)
    draw_body(c, list(article["paragraphs"]))
    draw_footer(c)
    c.showPage()
    c.save()
    return output


def main() -> int:
    if not OBJECTS_PATH.is_file():
        print(f"Missing source file: {OBJECTS_PATH}", file=sys.stderr)
        return 1

    biographies = parse_biographies(OBJECTS_PATH.read_text(encoding="utf-8"))
    for biography in biographies:
        output = generate_pdf(biography)
        print(output.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
