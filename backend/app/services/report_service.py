"""CSV and PDF export generation for course attendance reports."""

import csv
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet


def generate_csv(course_code: str, report_rows: list) -> io.BytesIO:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["Matric Number", "Full Name", "Sessions Attended", "Sessions Held", "Percentage", "NUC Compliant"]
    )
    for row in report_rows:
        writer.writerow(
            [
                row["matric_number"],
                row["full_name"],
                row["sessions_attended"],
                row["sessions_held"],
                f"{row['attendance_percentage']:.2f}",
                "Yes" if row["is_compliant"] else "No",
            ]
        )

    byte_buffer = io.BytesIO(buffer.getvalue().encode("utf-8"))
    byte_buffer.seek(0)
    return byte_buffer


def generate_pdf(course_code: str, course_title: str, report_rows: list, threshold: float) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"Attendance Compliance Report - {course_code}", styles["Title"]))
    elements.append(Paragraph(course_title, styles["Normal"]))
    elements.append(
        Paragraph(f"NUC minimum attendance threshold: {threshold:.0f}%", styles["Normal"])
    )
    elements.append(Spacer(1, 10 * mm))

    table_data = [["Matric Number", "Full Name", "Attended", "Held", "%", "Compliant"]]
    for row in report_rows:
        table_data.append(
            [
                row["matric_number"],
                row["full_name"],
                str(row["sessions_attended"]),
                str(row["sessions_held"]),
                f"{row['attendance_percentage']:.2f}",
                "Yes" if row["is_compliant"] else "No",
            ]
        )

    table = Table(table_data, repeatRows=1)
    style_commands = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#191c24")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d5d9e0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f8f9")]),
    ]
    for index, row in enumerate(report_rows, start=1):
        if not row["is_compliant"]:
            style_commands.append(("TEXTCOLOR", (5, index), (5, index), colors.HexColor("#c23b3b")))
    table.setStyle(TableStyle(style_commands))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)
    return buffer
