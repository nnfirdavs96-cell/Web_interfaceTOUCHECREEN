"""Экспорт табеля в Excel/CSV/PDF."""
import csv
import io
from datetime import date
from typing import Any

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

HEADERS = [
    "ID",
    "ФИО",
    "Дата",
    "Требуемый приход",
    "Факт приход",
    "Требуемый уход",
    "Факт уход",
    "Опоздание (мин)",
    "Ранний уход (мин)",
    "Отработано (мин)",
    "Статус",
]


def rows_to_csv(rows: list[dict[str, Any]]) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(HEADERS)
    for r in rows:
        w.writerow([r.get(k, "") for k in (
            "external_id", "full_name", "date",
            "required_check_in", "actual_check_in",
            "required_check_out", "actual_check_out",
            "late_minutes", "early_leave_minutes",
            "worked_minutes", "status",
        )])
    return buf.getvalue().encode("utf-8-sig")


def rows_to_xlsx(rows: list[dict[str, Any]], title: str = "Табель") -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = title[:30]
    ws.append(HEADERS)
    for r in rows:
        ws.append([r.get(k, "") for k in (
            "external_id", "full_name", "date",
            "required_check_in", "actual_check_in",
            "required_check_out", "actual_check_out",
            "late_minutes", "early_leave_minutes",
            "worked_minutes", "status",
        )])
    for col in ws.columns:
        max_len = max((len(str(c.value or "")) for c in col), default=10)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def rows_to_pdf(rows: list[dict[str, Any]], title: str = "Табель") -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), title=title)
    styles = getSampleStyleSheet()
    body = [Paragraph(title, styles["Heading2"]), Spacer(1, 8)]

    data = [HEADERS] + [
        [
            r.get("external_id", ""),
            r.get("full_name", ""),
            str(r.get("date", "")),
            str(r.get("required_check_in", "") or ""),
            str(r.get("actual_check_in", "") or ""),
            str(r.get("required_check_out", "") or ""),
            str(r.get("actual_check_out", "") or ""),
            r.get("late_minutes", 0),
            r.get("early_leave_minutes", 0),
            r.get("worked_minutes", 0),
            r.get("status", ""),
        ]
        for r in rows
    ]
    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ])
    )
    body.append(table)
    doc.build(body)
    return buf.getvalue()


def filename(prefix: str, date_from: date, date_to: date, ext: str) -> str:
    return f"{prefix}_{date_from.isoformat()}_{date_to.isoformat()}.{ext}"
